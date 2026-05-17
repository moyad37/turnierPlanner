// ============================================
// useLiveSession – Admin-Hook für Live-Session
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Schedule, Settings } from '../types';
import type { LiveSession, DeviceInfo, SessionPermissions, LiveResult } from '../types/session';
import {
  createSession,
  closeSession,
  loadSession,
  updateSessionSchedule,
  updateSessionDefaultPermissions,
  updateDevicePermissions,
  setDeviceStatus,
  submitResult,
  listenToResults,
  listenToDevices,
  getOrCreateDeviceId,
} from '../lib/liveSession';

const STORAGE_KEY = 'liveSession_activeSessionId';

interface UseLiveSessionOptions {
  /**
   * Wird mit ALLEN aktuellen Ergebnissen aufgerufen wenn sich
   * etwas in der Firestore-Ergebnis-Collection ändert.
   * Der Admin-State wird damit in einem einzigen Update aktualisiert.
   */
  onRemoteResults: (results: LiveResult[]) => void;
}

export function useLiveSession({ onRemoteResults }: UseLiveSessionOptions) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const unsubResultsRef = useRef<(() => void) | null>(null);
  const unsubDevicesRef = useRef<(() => void) | null>(null);

  // Stabile Referenz auf onRemoteResults um Listener-Neustart zu vermeiden
  const onRemoteResultsRef = useRef(onRemoteResults);
  useEffect(() => {
    onRemoteResultsRef.current = onRemoteResults;
  }, [onRemoteResults]);

  const deviceId = getOrCreateDeviceId();

  /**
   * Startet eine neue Live-Session.
   */
  const startSession = useCallback(
    async (
      settings: Settings,
      schedule: Schedule | null,
      tournamentName: string
    ): Promise<string> => {
      setIsStarting(true);
      setStartError(null);
      try {
        const { sessionId, sessionCode } = await createSession(
          settings,
          schedule,
          tournamentName
        );

        const newSession: LiveSession = {
          sessionId,
          sessionCode,
          adminUid: '',
          tournamentName,
          status: 'active',
          createdAt: new Date().toISOString(),
          defaultPermissions: {
            canViewLiveTable: true,
            canViewSchedule: true,
            canViewPlayerAssignments: true,
            allowedFields: null,
          },
        };
        setSession(newSession);
        localStorage.setItem(STORAGE_KEY, sessionId);

        // Alle Ergebnisse in einem einzigen Batch-Update anwenden
        unsubResultsRef.current = listenToResults(sessionId, (results) => {
          onRemoteResultsRef.current(results);
        });

        // Verbundene Geräte abonnieren
        unsubDevicesRef.current = listenToDevices(sessionId, setDevices);

        return sessionId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStartError(msg);
        throw err;
      } finally {
        setIsStarting(false);
      }
    },
    [deviceId]
  );

  /**
   * Beendet die Session.
   */
  const stopSession = useCallback(async () => {
    if (!session) return;
    unsubResultsRef.current?.();
    unsubDevicesRef.current?.();
    unsubResultsRef.current = null;
    unsubDevicesRef.current = null;
    await closeSession(session.sessionId);
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setDevices([]);
  }, [session]);

  /**
   * Synchronisiert den aktuellen Spielplan zur Session (z.B. nach Regenerierung).
   */
  const syncSchedule = useCallback(
    async (schedule: Schedule) => {
      if (!session) return;
      await updateSessionSchedule(session.sessionId, schedule);
    },
    [session]
  );

  /**
   * Aktualisiert die Default-Berechtigungen für neu beitretende Geräte.
   */
  const updateDefaultPermissions = useCallback(
    async (permissions: SessionPermissions) => {
      if (!session) return;
      await updateSessionDefaultPermissions(session.sessionId, permissions);
      setSession((prev) =>
        prev ? { ...prev, defaultPermissions: permissions } : null
      );
    },
    [session]
  );

  /**
   * Setzt gerätespezifische Berechtigungen (null = Session-Default verwenden).
   */
  const updateDevicePerms = useCallback(
    async (targetDeviceId: string, permissions: SessionPermissions | null) => {
      if (!session) return;
      await updateDevicePermissions(session.sessionId, targetDeviceId, permissions);
    },
    [session]
  );

  /**
   * Sperrt ein Gerät.
   */
  const revokeDevice = useCallback(
    async (targetDeviceId: string) => {
      if (!session) return;
      await setDeviceStatus(session.sessionId, targetDeviceId, 'revoked');
    },
    [session]
  );

  /**
   * Entsperrt ein gesperrtes Gerät.
   */
  const restoreDevice = useCallback(
    async (targetDeviceId: string) => {
      if (!session) return;
      await setDeviceStatus(session.sessionId, targetDeviceId, 'active');
    },
    [session]
  );

  /**
   * Überträgt ein vom Admin eingetragenes Ergebnis zur Session,
   * sodass Sub-Geräte es live sehen.
   */
  const submitAdminResult = useCallback(
    async (
      roundIndex: number,
      matchIndex: number,
      scoreA: number,
      scoreB: number,
      scorersA?: Record<string, number>,
      scorersB?: Record<string, number>
    ) => {
      if (!session) return;
      await submitResult(
        session.sessionId,
        deviceId,
        roundIndex,
        matchIndex,
        scoreA,
        scoreB,
        scorersA,
        scorersB
      );
    },
    [session, deviceId]
  );

  // Session bei App-Start wiederherstellen (nach Page-Refresh)
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return;

    let cancelled = false;
    loadSession(savedId).then((data) => {
      if (cancelled) return;
      if (!data || data.session.status !== 'active') {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setSession(data.session);

      unsubResultsRef.current = listenToResults(savedId, (results) => {
        if (!cancelled) onRemoteResultsRef.current(results);
      });
      unsubDevicesRef.current = listenToDevices(savedId, (devs) => {
        if (!cancelled) setDevices(devs);
      });
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listener beim Unmount aufräumen
  useEffect(() => {
    return () => {
      unsubResultsRef.current?.();
      unsubDevicesRef.current?.();
    };
  }, []);

  return {
    session,
    devices,
    isStarting,
    startError,
    deviceId,
    startSession,
    stopSession,
    syncSchedule,
    updateDefaultPermissions,
    updateDevicePerms,
    revokeDevice,
    restoreDevice,
    submitAdminResult,
  };
}
