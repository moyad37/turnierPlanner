// ============================================
// useSubDevice – Hook für Sub-Geräte
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Schedule, Settings } from '../types';
import type { LiveSession, SessionPermissions, DeviceInfo } from '../types/session';
import {
  loadSession,
  listenToSession,
  listenToResults,
  listenToDevice,
  registerDevice,
  updateDeviceLastSeen,
  submitResult,
  findSessionByCode,
  getOrCreateDeviceId,
  DEFAULT_SESSION_PERMISSIONS,
} from '../lib/liveSession';
import type { LiveResult } from '../types/session';

export type SubDeviceStatus =
  | 'loading'
  | 'not-found'
  | 'revoked'
  | 'closed'
  | 'active';

interface SubDeviceState {
  status: SubDeviceStatus;
  session: LiveSession | null;
  settings: Settings | null;
  /** Spielplan mit bereits eingetragenen Ergebnissen überlagert */
  schedule: Schedule | null;
  effectivePermissions: SessionPermissions;
  deviceInfo: DeviceInfo | null;
}

/** Wendet eine Liste von Ergebnissen auf den Basis-Spielplan an. */
function applyResults(base: Schedule, results: LiveResult[]): Schedule {
  if (results.length === 0) return base;
  // Map für O(1)-Zugriff statt results.find() in O(n)
  const resultMap = new Map(
    results.map((r) => [`${r.roundIndex}_${r.matchIndex}`, r])
  );
  return {
    ...base,
    rounds: base.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const r = resultMap.get(`${match.roundIndex}_${match.matchIndex}`);
        if (!r) return match;
        return {
          ...match,
          scoreA: r.scoreA,
          scoreB: r.scoreB,
          scorersA: r.scorersA,
          scorersB: r.scorersB,
        };
      }),
    })),
  };
}

/** Berechnet die effektiven Berechtigungen (gerätespezifisch oder Session-Default). */
function resolvePermissions(
  device: DeviceInfo | null,
  session: LiveSession | null
): SessionPermissions {
  if (device?.permissions != null) return device.permissions;
  return session?.defaultPermissions ?? DEFAULT_SESSION_PERMISSIONS;
}

export function useSubDevice(sessionId: string | null) {
  const deviceId = getOrCreateDeviceId();

  const [deviceName] = useState<string>(() => {
    const saved = localStorage.getItem('liveSession_deviceName');
    return saved || `Gerät-${deviceId.slice(-4)}`;
  });

  const [state, setState] = useState<SubDeviceState>({
    status: sessionId ? 'loading' : 'not-found',
    session: null,
    settings: null,
    schedule: null,
    effectivePermissions: DEFAULT_SESSION_PERMISSIONS,
    deviceInfo: null,
  });

  // Refs für den aktuellen Basisplan und die Ergebnisse
  const baseScheduleRef = useRef<Schedule | null>(null);
  const resultsRef = useRef<LiveResult[]>([]);
  const sessionRef = useRef<LiveSession | null>(null);

  /** Baut den angezeigten Spielplan aus Basis + Ergebnissen. */
  function rebuild() {
    if (!baseScheduleRef.current) return null;
    return applyResults(baseScheduleRef.current, resultsRef.current);
  }

  useEffect(() => {
    if (!sessionId) {
      setState((prev) => ({ ...prev, status: 'not-found' }));
      return;
    }

    let cancelled = false;

    const unsubRefs: Array<() => void> = [];

    async function init() {
      // 1. Session initial laden
      const data = await loadSession(sessionId!);
      if (cancelled) return;

      if (!data) {
        setState((prev) => ({ ...prev, status: 'not-found' }));
        return;
      }
      if (data.session.status === 'closed') {
        setState((prev) => ({ ...prev, status: 'closed' }));
        return;
      }

      sessionRef.current = data.session;
      baseScheduleRef.current = data.schedule;

      // 2. Gerät registrieren
      await registerDevice(sessionId!, deviceId, deviceName);
      if (cancelled) return;

      // 3. lastSeen-Heartbeat (alle 30 Sekunden)
      const heartbeat = setInterval(() => {
        updateDeviceLastSeen(sessionId!, deviceId).catch(() => {});
      }, 30_000);
      unsubRefs.push(() => clearInterval(heartbeat));

      // 4. Session-Dokument beobachten (Schedule-Updates, Status, Default-Perms)
      const unsubSession = listenToSession(sessionId!, (newData) => {
        if (cancelled) return;
        if (!newData) {
          setState((prev) => ({ ...prev, status: 'not-found' }));
          return;
        }
        if (newData.session.status === 'closed') {
          setState((prev) => ({ ...prev, status: 'closed' }));
          return;
        }
        sessionRef.current = newData.session;
        if (newData.schedule) {
          baseScheduleRef.current = newData.schedule;
        }
        setState((prev) => ({
          ...prev,
          session: newData.session,
          settings: newData.settings,
          schedule: rebuild(),
          effectivePermissions: resolvePermissions(
            prev.deviceInfo,
            newData.session
          ),
        }));
      });
      unsubRefs.push(unsubSession);

      // 5. Ergebnisse beobachten
      const unsubResults = listenToResults(sessionId!, (results) => {
        if (cancelled) return;
        resultsRef.current = results;
        setState((prev) => ({
          ...prev,
          schedule: rebuild(),
        }));
      });
      unsubRefs.push(unsubResults);

      // 6. Eigenes Gerät beobachten (Berechtigungs- / Status-Änderungen)
      const unsubDevice = listenToDevice(sessionId!, deviceId, (device) => {
        if (cancelled) return;
        if (device?.status === 'revoked') {
          setState((prev) => ({ ...prev, status: 'revoked', deviceInfo: device }));
          return;
        }
        setState((prev) => ({
          ...prev,
          status: 'active',
          deviceInfo: device,
          effectivePermissions: resolvePermissions(device, sessionRef.current),
        }));
      });
      unsubRefs.push(unsubDevice);

      // 7. Initialer State
      const schedule = rebuild();
      setState({
        status: 'active',
        session: data.session,
        settings: data.settings,
        schedule,
        effectivePermissions: resolvePermissions(null, data.session),
        deviceInfo: null,
      });
    }

    init().catch(() => {
      if (!cancelled) setState((prev) => ({ ...prev, status: 'not-found' }));
    });

    return () => {
      cancelled = true;
      for (const unsub of unsubRefs) unsub();
    };
  }, [sessionId, deviceId, deviceName]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Trägt ein Ergebnis für eine Partie ein.
   */
  const submitMatchResult = useCallback(
    async (
      roundIndex: number,
      matchIndex: number,
      scoreA: number,
      scoreB: number,
      scorersA?: Record<string, number>,
      scorersB?: Record<string, number>
    ) => {
      if (!sessionId) return;
      await submitResult(
        sessionId,
        deviceId,
        roundIndex,
        matchIndex,
        scoreA,
        scoreB,
        scorersA,
        scorersB
      );
    },
    [sessionId, deviceId]
  );

  /**
   * Sucht eine Session anhand des 6-stelligen Codes.
   * Gibt die Session-ID zurück oder null.
   */
  const joinByCode = useCallback(async (code: string): Promise<string | null> => {
    const result = await findSessionByCode(code);
    return result?.sessionId ?? null;
  }, []);

  return {
    ...state,
    deviceId,
    deviceName,
    submitMatchResult,
    joinByCode,
  };
}
