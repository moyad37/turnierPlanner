// ============================================
// Types für den Holländischen Turnierplan-Generator
// ============================================

export interface Player {
  id: string;
  name: string;
  isGoalkeeper?: boolean;
}

export interface Team {
  id: string;
  playerIds: string[];
}

export interface Match {
  id: string;
  roundIndex: number;
  matchIndex: number;
  fieldNumber: number;
  teamA: Team;
  teamB: Team;
  scoreA: number | null;
  scoreB: number | null;
  // Torschützen: playerId -> Anzahl Tore
  scorersA: Record<string, number>;
  scorersB: Record<string, number>;
}

export interface Round {
  index: number;
  matches: Match[];
  byePlayerIds: string[]; // Spieler mit Pause in dieser Runde
}

export interface Schedule {
  rounds: Round[];
  seed: number;
  createdAt: string;
}

export type FairnessMode = 'maxCoverage' | 'balancedMinutes';

// Punkte-Einstellungen
export interface PointSettings {
  // Basis-Punkte
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  
  // Team-Punkte pro Tor
  enableTeamGoalPoints: boolean;
  pointsPerTeamGoal: number;
  
  // Torschützen-Punkte (individuelle Spieler-Punkte)
  enableScorerPoints: boolean;
  pointsPerScorerGoal: number;
  
  // Clean Sheet (Zu-Null)
  enableCleanSheet: boolean;
  pointsForCleanSheet: number;
}

export interface Settings {
  players: Player[];
  playersPerTeam: number;
  teamsPerRound: number;
  roundsCount: number;
  fieldsCount: number;
  allowByes: boolean;
  fairnessMode: FairnessMode;
  seed: number | null;
  pointSettings: PointSettings;
  // Tormann-Verteilung: Maximal ein Tormann pro Team wenn möglich
  distributeGoalkeepers: boolean;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  wins: number;
  draws: number;
  losses: number;
  cleanSheets: number;
  goalsScored: number; // Individuelle Tore (Torschütze)
  points: number;
  rank: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Für den Generator: Tracking von Paarungen
export interface PairingHistory {
  // Key: "playerId1-playerId2" (sortiert), Value: Anzahl
  teammateCount: Map<string, number>;
  opponentCount: Map<string, number>;
  gamesPlayed: Map<string, number>; // playerId -> Anzahl Spiele
}

// Storage Types
export interface StoredData {
  settings: Settings;
  schedule: Schedule | null;
  lastUpdated: string;
}
