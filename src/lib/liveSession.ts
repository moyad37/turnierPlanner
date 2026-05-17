// ============================================
// Live-Session – Firestore-Operationen
// ============================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, ensureSignedIn } from './firebase';
import type { Settings, Schedule } from '../types';
import type {
  LiveSession,
  DeviceInfo,
  LiveResult,
  SessionPermissions,
} from '../types/session';

// ---------- Hilfsfunktionen ----------

function generateSessionId(): string {
  return `ls-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generiert einen 6-stelligen Code ohne mehrdeutige Zeichen (I, O, 0, 1).
 */
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ---------- Gerät-ID ----------

/**
 * Gibt die persistente Gerät-ID aus localStorage zurück, oder erstellt eine neue.
 */
export function getOrCreateDeviceId(): string {
  const key = 'liveSession_deviceId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ---------- Standard-Berechtigungen ----------

export const DEFAULT_SESSION_PERMISSIONS: SessionPermissions = {
  canViewLiveTable: true,
  canViewSchedule: true,
  canViewPlayerAssignments: true,
  allowedFields: null, // alle Felder
};

// ---------- Session-CRUD ----------

/**
 * Erstellt eine neue Live-Session (Admin).
 */
export async function createSession(
  settings: Settings,
  schedule: Schedule | null,
  tournamentName: string
): Promise<{ sessionId: string; sessionCode: string }> {
  const user = await ensureSignedIn();
  const sessionId = generateSessionId();
  const sessionCode = generateSessionCode();

  await setDoc(doc(db, 'liveSessions', sessionId), {
    adminUid: user.uid,
    sessionCode,
    tournamentName: tournamentName || 'Turnier',
    status: 'active',
    createdAt: serverTimestamp(),
    settings: JSON.parse(JSON.stringify(settings)),
    schedule: schedule ? JSON.parse(JSON.stringify(schedule)) : null,
    defaultPermissions: DEFAULT_SESSION_PERMISSIONS,
  });

  return { sessionId, sessionCode };
}

/**
 * Beendet eine Session (Admin).
 */
export async function closeSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'liveSessions', sessionId), { status: 'closed' });
}

/**
 * Synchronisiert den aktuellen Spielplan zur Session (Admin).
 */
export async function updateSessionSchedule(
  sessionId: string,
  schedule: Schedule
): Promise<void> {
  await updateDoc(doc(db, 'liveSessions', sessionId), {
    schedule: JSON.parse(JSON.stringify(schedule)),
  });
}

/**
 * Aktualisiert die Default-Berechtigungen der Session (Admin).
 */
export async function updateSessionDefaultPermissions(
  sessionId: string,
  permissions: SessionPermissions
): Promise<void> {
  await updateDoc(doc(db, 'liveSessions', sessionId), {
    defaultPermissions: permissions,
  });
}

/**
 * Lädt eine Session anhand der Session-ID.
 */
export async function loadSession(
  sessionId: string
): Promise<{ session: LiveSession; settings: Settings; schedule: Schedule | null } | null> {
  const docSnap = await getDoc(doc(db, 'liveSessions', sessionId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    session: parseSessionDoc(docSnap.id, data),
    settings: data.settings as Settings,
    schedule: (data.schedule as Schedule) ?? null,
  };
}

/**
 * Sucht eine aktive Session anhand des 6-stelligen Codes.
 */
export async function findSessionByCode(
  code: string
): Promise<{ sessionId: string; session: LiveSession } | null> {
  const q = query(
    collection(db, 'liveSessions'),
    where('sessionCode', '==', code.toUpperCase().trim()),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { sessionId: d.id, session: parseSessionDoc(d.id, d.data()) };
}

// ---------- Geräte ----------

/**
 * Registriert dieses Gerät in der Session.
 */
export async function registerDevice(
  sessionId: string,
  deviceId: string,
  name: string
): Promise<void> {
  const now = new Date().toISOString();
  // setDoc with merge so existing docs are preserved
  await setDoc(
    doc(db, 'liveSessions', sessionId, 'devices', deviceId),
    {
      name,
      joinedAt: now,
      lastSeen: now,
      permissions: null,
      status: 'active',
    },
    { merge: true }
  );
}

/**
 * Aktualisiert den lastSeen-Timestamp eines Geräts.
 */
export async function updateDeviceLastSeen(
  sessionId: string,
  deviceId: string
): Promise<void> {
  await updateDoc(
    doc(db, 'liveSessions', sessionId, 'devices', deviceId),
    { lastSeen: new Date().toISOString() }
  );
}

/**
 * Setzt die Berechtigungen eines Geräts (Admin). null = Session-Default verwenden.
 */
export async function updateDevicePermissions(
  sessionId: string,
  deviceId: string,
  permissions: SessionPermissions | null
): Promise<void> {
  await updateDoc(
    doc(db, 'liveSessions', sessionId, 'devices', deviceId),
    { permissions }
  );
}

/**
 * Aktiviert oder sperrt ein Gerät (Admin).
 */
export async function setDeviceStatus(
  sessionId: string,
  deviceId: string,
  status: 'active' | 'revoked'
): Promise<void> {
  await updateDoc(
    doc(db, 'liveSessions', sessionId, 'devices', deviceId),
    { status }
  );
}

// ---------- Ergebnisse ----------

/**
 * Trägt ein Ergebnis in die Session ein (Sub-Gerät oder Admin).
 */
export async function submitResult(
  sessionId: string,
  deviceId: string,
  roundIndex: number,
  matchIndex: number,
  scoreA: number,
  scoreB: number,
  scorersA?: Record<string, number>,
  scorersB?: Record<string, number>
): Promise<void> {
  const matchKey = `r${roundIndex}_m${matchIndex}`;
  await setDoc(doc(db, 'liveSessions', sessionId, 'results', matchKey), {
    matchKey,
    roundIndex,
    matchIndex,
    scoreA,
    scoreB,
    scorersA: scorersA ?? {},
    scorersB: scorersB ?? {},
    deviceId,
    updatedAt: new Date().toISOString(),
  });
}

// ---------- Realtime Listeners ----------

/**
 * Hört auf Änderungen am Session-Dokument (Schedule, Status, Default-Berechtigungen).
 */
export function listenToSession(
  sessionId: string,
  callback: (
    data: { session: LiveSession; settings: Settings; schedule: Schedule | null } | null
  ) => void
): () => void {
  return onSnapshot(doc(db, 'liveSessions', sessionId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    const data = docSnap.data();
    callback({
      session: parseSessionDoc(docSnap.id, data),
      settings: data.settings as Settings,
      schedule: (data.schedule as Schedule) ?? null,
    });
  });
}

/**
 * Hört auf alle Ergebnisse in der Session.
 */
export function listenToResults(
  sessionId: string,
  callback: (results: LiveResult[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'liveSessions', sessionId, 'results'),
    (snap) => {
      callback(snap.docs.map((d) => d.data() as LiveResult));
    }
  );
}

/**
 * Hört auf alle verbundenen Geräte in der Session (Admin-View).
 */
export function listenToDevices(
  sessionId: string,
  callback: (devices: DeviceInfo[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'liveSessions', sessionId, 'devices'),
    (snap) => {
      callback(
        snap.docs.map((d) => ({ deviceId: d.id, ...d.data() } as DeviceInfo))
      );
    }
  );
}

/**
 * Hört auf ein einzelnes Gerät (für Berechtigungs-/Status-Änderungen).
 */
export function listenToDevice(
  sessionId: string,
  deviceId: string,
  callback: (device: DeviceInfo | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'liveSessions', sessionId, 'devices', deviceId),
    (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      callback({ deviceId: docSnap.id, ...docSnap.data() } as DeviceInfo);
    }
  );
}

// ---------- Interne Hilfsfunktionen ----------

function parseSessionDoc(id: string, data: Record<string, unknown>): LiveSession {
  return {
    sessionId: id,
    adminUid: data.adminUid as string,
    sessionCode: data.sessionCode as string,
    tournamentName: data.tournamentName as string,
    status: data.status as 'active' | 'closed',
    createdAt:
      (data.createdAt as Timestamp)?.toDate().toISOString() ??
      new Date().toISOString(),
    defaultPermissions:
      (data.defaultPermissions as SessionPermissions) ?? DEFAULT_SESSION_PERMISSIONS,
  };
}
