// ============================================
// LocalStorage Persistenz
// ============================================

import type { Settings, Schedule, StoredData, Player, PointSettings } from '../types';

const STORAGE_KEY = 'dutch-tournament-data';

// Standard-Spielernamen
export const DEFAULT_PLAYER_NAMES = [
  'Max', 'Anna', 'Lukas', 'Sophie', 'Felix',
  'Emma', 'Paul', 'Lena', 'Tim', 'Marie',
  'Jonas', 'Laura', 'Leon', 'Julia', 'Ben',
  'Sarah', 'Niklas', 'Lisa', 'David', 'Hannah'
];

// Generiere Spieler aus Namen
export function createPlayersFromNames(names: string[]): Player[] {
  return names.map((name, index) => ({
    id: `player-${index + 1}`,
    name: name.trim(),
  }));
}

// Standard-Punkteeinstellungen
export function getDefaultPointSettings(): PointSettings {
  return {
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    enableTeamGoalPoints: false,
    pointsPerTeamGoal: 1,
    enableScorerPoints: false,
    pointsPerScorerGoal: 1,
    enableCleanSheet: false,
    pointsForCleanSheet: 1,
  };
}

// Standard-Einstellungen
export function getDefaultSettings(): Settings {
  return {
    players: createPlayersFromNames(DEFAULT_PLAYER_NAMES),
    playersPerTeam: 5,
    teamsPerRound: 4,
    roundsCount: 10,
    fieldsCount: 2,
    allowByes: false,
    fairnessMode: 'maxCoverage',
    seed: null,
    pointSettings: getDefaultPointSettings(),
    distributeGoalkeepers: true,
  };
}

// Lade Daten aus LocalStorage
export function loadFromStorage(): StoredData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data) as StoredData;
    
    // Validiere grundlegende Struktur
    if (!parsed.settings || !Array.isArray(parsed.settings.players)) {
      return null;
    }
    
    // Migration: Füge fehlende pointSettings hinzu (für alte Daten)
    if (!parsed.settings.pointSettings) {
      parsed.settings.pointSettings = getDefaultPointSettings();
    }
    
    // Migration: Füge fehlende distributeGoalkeepers hinzu
    if (parsed.settings.distributeGoalkeepers === undefined) {
      parsed.settings.distributeGoalkeepers = true;
    }
    
    // Migration: Füge fehlende scorersA/scorersB zu Matches hinzu
    if (parsed.schedule) {
      for (const round of parsed.schedule.rounds) {
        for (const match of round.matches) {
          if (!match.scorersA) match.scorersA = {};
          if (!match.scorersB) match.scorersB = {};
        }
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('Fehler beim Laden aus LocalStorage:', error);
    return null;
  }
}

// Speichere Daten in LocalStorage
export function saveToStorage(settings: Settings, schedule: Schedule | null): void {
  try {
    const data: StoredData = {
      settings,
      schedule,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Fehler beim Speichern in LocalStorage:', error);
  }
}

// Lösche Daten aus LocalStorage
export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Fehler beim Löschen aus LocalStorage:', error);
  }
}

// Update nur Schedule (z.B. nach Score-Eingabe)
export function updateScheduleInStorage(schedule: Schedule): void {
  const data = loadFromStorage();
  if (data) {
    saveToStorage(data.settings, schedule);
  }
}

// Parse Spielernamen aus Text (z.B. aus Textarea)
export function parsePlayersFromText(text: string): Player[] {
  const lines = text.split(/[\n,;]+/);
  const names = lines
    .map(line => line.trim())
    .filter(name => name.length > 0);
  
  return createPlayersFromNames(names);
}

// Exportiere Spielernamen als Text
export function playersToText(players: Player[]): string {
  return players.map(p => p.name).join('\n');
}
