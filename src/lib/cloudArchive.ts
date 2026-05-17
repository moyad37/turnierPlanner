// ============================================
// Cloud-Archiv (Firestore) – async API
// Ersetzt tournamentArchive.ts für gespeicherte Turniere
// ============================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db, ensureSignedIn } from './firebase';
import type { Settings, Schedule } from '../types';
import type { SavedTournament, TournamentIndex } from './tournamentArchive';
import { getDefaultPointSettings } from './storage';

// ---------- Hilfsfunktionen ----------

function generateId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getUserId(): Promise<string> {
  const user = await ensureSignedIn();
  return user.uid;
}

function countMatches(schedule: Schedule | null): { played: number; total: number } {
  if (!schedule) return { played: 0, total: 0 };
  let played = 0;
  let total = 0;
  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      total++;
      if (match.scoreA !== null && match.scoreB !== null) played++;
    }
  }
  return { played, total };
}

function migrateTournamentData(tournament: SavedTournament): SavedTournament {
  if (!tournament.settings.pointSettings) {
    tournament.settings.pointSettings = getDefaultPointSettings();
  }
  if (tournament.settings.distributeGoalkeepers === undefined) {
    tournament.settings.distributeGoalkeepers = true;
  }
  if (tournament.schedule) {
    for (const round of tournament.schedule.rounds) {
      for (const match of round.matches) {
        if (!match.scorersA) match.scorersA = {};
        if (!match.scorersB) match.scorersB = {};
      }
    }
  }
  return tournament;
}

// ---------- Öffentliche API ----------

export async function loadTournamentIndex(): Promise<TournamentIndex> {
  const uid = await getUserId();
  const q = query(
    collection(db, 'users', uid, 'tournaments'),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  const tournaments = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name as string,
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() ?? new Date().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() ?? new Date().toISOString(),
      playerCount: (data.playerCount as number) ?? 0,
      roundsCount: (data.roundsCount as number) ?? 0,
      matchesPlayed: (data.matchesPlayed as number) ?? 0,
      totalMatches: (data.totalMatches as number) ?? 0,
    };
  });
  return { tournaments };
}

export async function saveTournament(
  settings: Settings,
  schedule: Schedule | null,
  name: string,
  existingId?: string,
): Promise<string> {
  const uid = await getUserId();
  const id = existingId ?? generateId();
  const ref = doc(db, 'users', uid, 'tournaments', id);

  // createdAt beim Update beibehalten
  let createdAt: Timestamp = Timestamp.now();
  if (existingId) {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      createdAt = (existing.data().createdAt as Timestamp) ?? Timestamp.now();
    }
  }

  const { played, total } = countMatches(schedule);
  await setDoc(ref, {
    name,
    createdAt,
    updatedAt: serverTimestamp(),
    playerCount: settings.players.length,
    roundsCount: settings.roundsCount,
    matchesPlayed: played,
    totalMatches: total,
    settings,
    schedule,
  });
  return id;
}

export async function loadTournament(id: string): Promise<SavedTournament | null> {
  const uid = await getUserId();
  const snap = await getDoc(doc(db, 'users', uid, 'tournaments', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  const tournament: SavedTournament = {
    id: snap.id,
    name: data.name,
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() ?? new Date().toISOString(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() ?? new Date().toISOString(),
    settings: data.settings,
    schedule: data.schedule,
  };
  return migrateTournamentData(tournament);
}

export async function deleteTournament(id: string): Promise<void> {
  const uid = await getUserId();
  await deleteDoc(doc(db, 'users', uid, 'tournaments', id));
}

export async function renameTournament(id: string, newName: string): Promise<void> {
  const uid = await getUserId();
  await setDoc(
    doc(db, 'users', uid, 'tournaments', id),
    { name: newName, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function duplicateTournament(id: string): Promise<string> {
  const tournament = await loadTournament(id);
  if (!tournament) throw new Error('Turnier nicht gefunden');
  return saveTournament(
    tournament.settings,
    tournament.schedule,
    `${tournament.name} (Kopie)`,
  );
}

export async function saveImportedTournament(tournament: SavedTournament): Promise<string> {
  return saveTournament(tournament.settings, tournament.schedule, tournament.name);
}

export { exportTournamentAsJSON, importTournamentFromJSON } from './tournamentArchive';
