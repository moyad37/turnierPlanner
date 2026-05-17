// ============================================
// Types für den Holländischen Turnierplan-Generator
// ============================================

// Team Colors
export type TeamColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan';

export interface Player {
  id: string;
  name: string;
  isGoalkeeper?: boolean;
  age?: number; // Alter in Jahren (optional)
  // Erweiterte Spieler-Profile
  photo?: string; // Base64 oder URL
  skillRating?: number; // 1-10
  preferredColor?: TeamColor;
  // Stats für Liga-Modus
  totalPoints?: number;
  tournamentsPlayed?: number;
}

export interface Team {
  id: string;
  playerIds: string[];
  substitutePlayerIds?: string[]; // Auswechselspieler (wenn mehr Spieler als Teamgröße)
  color?: TeamColor; // Trikot-Farbe
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
  // Timer
  timerStartedAt?: string; // ISO timestamp
  timerDuration?: number; // Sekunden
  timerPausedAt?: number; // Verbleibende Sekunden bei Pause
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
export type TournamentMode = 'standard' | 'playoff' | 'league' | 'captain';

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

// Altersgruppen-Einstellungen
export interface AgeGroupSettings {
  enabled: boolean;
  maxAgeDifference: number; // Maximal erlaubte Alters-Differenz zwischen Gegnern (Jahre)
}

// Handicap-Einstellungen
export interface HandicapSettings {
  enabled: boolean;
  // Skill-basiertes Handicap: Differenz × Faktor = Bonus-Punkte
  skillDifferenceMultiplier: number;
}

// Playoff-Einstellungen
export interface PlayoffSettings {
  enabled: boolean;
  topPlayersCount: number; // z.B. Top 8 kommen ins Playoff
  playoffRounds: number; // Anzahl KO-Runden
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
  distributeGoalkeepers: boolean;
  // Neue Einstellungen
  tournamentMode: TournamentMode;
  matchDuration: number; // Minuten
  useSkillBalancing: boolean; // Teams nach Skill ausgleichen
  handicapSettings: HandicapSettings;
  playoffSettings: PlayoffSettings;
  teamColors: [TeamColor, TeamColor]; // Standard-Farben für Teams
  ageGroupSettings?: AgeGroupSettings; // Altersgruppen-Prüfung
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
  // MVP-Berechnung
  mvpScore: number;
  // Formkurve (letzte N Spiele)
  formCurve: ('W' | 'D' | 'L')[]; // Win, Draw, Loss
  // Head-to-Head wird separat berechnet
}

// Head-to-Head Statistik
export interface HeadToHeadStats {
  playerId1: string;
  playerId2: string;
  player1Name?: string;
  player2Name?: string;
  // Als Mitspieler
  gamesAsTeammates: number;
  winsAsTeammates: number;
  // Als Gegner
  gamesAsOpponents: number;
  player1WinsAsOpponent: number;
  player2WinsAsOpponent: number;
  drawsAsOpponents: number;
  // Tore
  goalsPlayer1?: number;
  goalsPlayer2?: number;
}

// Turnier-Vorlage
export interface TournamentTemplate {
  id: string;
  name: string;
  description?: string;
  settings: Omit<Settings, 'players'>; // Ohne Spieler
  createdAt: string;
}

// Liga-Modus: Mehrere Turniere
export interface LeagueSeason {
  id: string;
  name: string;
  tournaments: string[]; // Tournament IDs
  startDate: string;
  endDate?: string;
  playerStandings: Record<string, number>; // playerId -> Gesamtpunkte
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
