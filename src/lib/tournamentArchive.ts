// ============================================
// Turnier-Archiv Verwaltung
// ============================================

import type { Settings, Schedule } from '../types';
import { getDefaultPointSettings } from './storage';

export interface SavedTournament {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  schedule: Schedule | null;
}

export interface TournamentIndex {
  tournaments: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    playerCount: number;
    roundsCount: number;
    matchesPlayed: number;
    totalMatches: number;
  }[];
}

const TOURNAMENT_INDEX_KEY = 'dutch-tournament-index';
const TOURNAMENT_PREFIX = 'dutch-tournament-';

// Generiere eindeutige ID
function generateTournamentId(): string {
  return `tournament-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// Lade Turnier-Index
export function loadTournamentIndex(): TournamentIndex {
  try {
    const data = localStorage.getItem(TOURNAMENT_INDEX_KEY);
    if (!data) return { tournaments: [] };
    return JSON.parse(data) as TournamentIndex;
  } catch {
    return { tournaments: [] };
  }
}

// Speichere Turnier-Index
function saveTournamentIndex(index: TournamentIndex): void {
  localStorage.setItem(TOURNAMENT_INDEX_KEY, JSON.stringify(index));
}

// Zähle gespielte Matches
function countMatches(schedule: Schedule | null): { played: number; total: number } {
  if (!schedule) return { played: 0, total: 0 };
  
  let played = 0;
  let total = 0;
  
  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      total++;
      if (match.scoreA !== null && match.scoreB !== null) {
        played++;
      }
    }
  }
  
  return { played, total };
}

// Speichere Turnier (neu oder aktualisieren)
export function saveTournament(
  settings: Settings,
  schedule: Schedule | null,
  name: string,
  existingId?: string
): string {
  const id = existingId || generateTournamentId();
  const now = new Date().toISOString();
  
  const tournament: SavedTournament = {
    id,
    name,
    createdAt: existingId ? loadTournament(existingId)?.createdAt || now : now,
    updatedAt: now,
    settings,
    schedule,
  };
  
  // Speichere Turnier-Daten
  localStorage.setItem(TOURNAMENT_PREFIX + id, JSON.stringify(tournament));
  
  // Update Index
  const index = loadTournamentIndex();
  const { played, total } = countMatches(schedule);
  
  const indexEntry = {
    id,
    name,
    createdAt: tournament.createdAt,
    updatedAt: now,
    playerCount: settings.players.length,
    roundsCount: settings.roundsCount,
    matchesPlayed: played,
    totalMatches: total,
  };
  
  const existingIndex = index.tournaments.findIndex(t => t.id === id);
  if (existingIndex >= 0) {
    index.tournaments[existingIndex] = indexEntry;
  } else {
    index.tournaments.unshift(indexEntry); // Neueste zuerst
  }
  
  saveTournamentIndex(index);
  
  return id;
}

// Migration Helper: Füge fehlende Felder hinzu
function migrateTournamentData(tournament: SavedTournament): SavedTournament {
  // Migration: Füge fehlende pointSettings hinzu
  if (!tournament.settings.pointSettings) {
    tournament.settings.pointSettings = getDefaultPointSettings();
  }
  
  // Migration: Füge fehlende distributeGoalkeepers hinzu
  if (tournament.settings.distributeGoalkeepers === undefined) {
    tournament.settings.distributeGoalkeepers = true;
  }
  
  // Migration: Füge fehlende scorersA/scorersB zu Matches hinzu
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

// Lade Turnier
export function loadTournament(id: string): SavedTournament | null {
  try {
    const data = localStorage.getItem(TOURNAMENT_PREFIX + id);
    if (!data) return null;
    const tournament = JSON.parse(data) as SavedTournament;
    return migrateTournamentData(tournament);
  } catch {
    return null;
  }
}

// Lösche Turnier
export function deleteTournament(id: string): void {
  localStorage.removeItem(TOURNAMENT_PREFIX + id);
  
  const index = loadTournamentIndex();
  index.tournaments = index.tournaments.filter(t => t.id !== id);
  saveTournamentIndex(index);
}

// Exportiere Turnier als JSON-Datei
export function exportTournamentAsJSON(
  settings: Settings,
  schedule: Schedule | null,
  name: string
): void {
  const tournament: SavedTournament = {
    id: generateTournamentId(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings,
    schedule,
  };
  
  const json = JSON.stringify(tournament, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `turnier_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Importiere Turnier aus JSON-Datei
export function importTournamentFromJSON(file: File): Promise<SavedTournament> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let tournament = JSON.parse(content) as SavedTournament;
        
        // Validiere Struktur
        if (!tournament.settings || !tournament.name) {
          throw new Error('Ungültiges Turnier-Format');
        }
        
        // Generiere neue ID beim Import
        tournament.id = generateTournamentId();
        tournament.updatedAt = new Date().toISOString();
        
        // Migration: Füge fehlende Felder hinzu
        tournament = migrateTournamentData(tournament);
        
        resolve(tournament);
      } catch (error) {
        reject(new Error('Konnte Datei nicht lesen: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsText(file);
  });
}

// Speichere importiertes Turnier
export function saveImportedTournament(tournament: SavedTournament): string {
  localStorage.setItem(TOURNAMENT_PREFIX + tournament.id, JSON.stringify(tournament));
  
  const index = loadTournamentIndex();
  const { played, total } = countMatches(tournament.schedule);
  
  index.tournaments.unshift({
    id: tournament.id,
    name: tournament.name + ' (importiert)',
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    playerCount: tournament.settings.players.length,
    roundsCount: tournament.settings.roundsCount,
    matchesPlayed: played,
    totalMatches: total,
  });
  
  saveTournamentIndex(index);
  
  return tournament.id;
}

// Aktualisiere Turnier-Name
export function renameTournament(id: string, newName: string): void {
  const tournament = loadTournament(id);
  if (!tournament) return;
  
  tournament.name = newName;
  tournament.updatedAt = new Date().toISOString();
  
  localStorage.setItem(TOURNAMENT_PREFIX + id, JSON.stringify(tournament));
  
  const index = loadTournamentIndex();
  const entry = index.tournaments.find(t => t.id === id);
  if (entry) {
    entry.name = newName;
    entry.updatedAt = tournament.updatedAt;
  }
  saveTournamentIndex(index);
}

// Dupliziere Turnier
export function duplicateTournament(id: string): string | null {
  const tournament = loadTournament(id);
  if (!tournament) return null;
  
  return saveTournament(
    tournament.settings,
    tournament.schedule,
    tournament.name + ' (Kopie)'
  );
}
