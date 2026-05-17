// ============================================
// Turnier-Varianten: Playoff, Handicap, Captain, League
// ============================================

import type { 
  Player, 
  Match, 
  Team, 
  TournamentMode,
  HandicapSettings,
} from '../types';

// Typen für Playoff-Bracket
export interface PlayoffMatch {
  id: string;
  round: number; // 0 = Finale, 1 = Halbfinale, 2 = Viertelfinale, etc.
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  nextMatchId: string | null;
}

export interface PlayoffBracket {
  matches: PlayoffMatch[];
  totalRounds: number;
  thirdPlaceMatch?: PlayoffMatch;
}

// ============================================
// PLAYOFF MODE
// ============================================

// Generiere Single Elimination Bracket
export function generatePlayoffBracket(
  players: Player[],
  seeding: 'ranking' | 'random' = 'ranking',
  includeThirdPlaceMatch: boolean = false
): PlayoffBracket {
  const numPlayers = players.length;
  
  // Finde nächste Potenz von 2
  let bracketSize = 2;
  while (bracketSize < numPlayers) {
    bracketSize *= 2;
  }
  
  const totalRounds = Math.log2(bracketSize);
  const matches: PlayoffMatch[] = [];
  
  // Generiere alle Matches von unten nach oben
  let matchId = 1;
  let previousRoundMatches: string[] = [];
  
  for (let round = totalRounds - 1; round >= 0; round--) {
    const matchesInRound = Math.pow(2, round);
    const currentRoundMatches: string[] = [];
    
    for (let pos = 0; pos < matchesInRound; pos++) {
      const id = `M${matchId++}`;
      currentRoundMatches.push(id);
      
      const match: PlayoffMatch = {
        id,
        round,
        position: pos,
        player1Id: null,
        player2Id: null,
        score1: null,
        score2: null,
        winnerId: null,
        nextMatchId: round > 0 ? previousRoundMatches[Math.floor(pos / 2)] : null,
      };
      
      matches.push(match);
    }
    
    previousRoundMatches = currentRoundMatches;
  }
  
  // Sortiere Spieler nach Seed (oder Zufall wenn kein Seed)
  const seededPlayers = seeding === 'ranking' 
    ? [...players] // Annahme: bereits nach Ranking sortiert
    : shuffleArray([...players]);
  
  // Weise Spieler den ersten Runden zu (mit Byes für fehlende Spieler)
  const firstRoundMatches = matches.filter(m => m.round === totalRounds - 1);
  
  for (let i = 0; i < seededPlayers.length; i++) {
    const matchIndex = Math.floor(i / 2);
    const isPlayer1 = i % 2 === 0;
    
    if (matchIndex < firstRoundMatches.length) {
      if (isPlayer1) {
        firstRoundMatches[matchIndex].player1Id = seededPlayers[i].id;
      } else {
        firstRoundMatches[matchIndex].player2Id = seededPlayers[i].id;
      }
    }
  }
  
  // Verarbeite Byes (Freilose)
  for (const match of firstRoundMatches) {
    if (match.player1Id && !match.player2Id) {
      // Spieler 1 bekommt Freilos
      match.winnerId = match.player1Id;
      // Advance to next match
      advanceWinner(matches, match);
    } else if (!match.player1Id && match.player2Id) {
      // Spieler 2 bekommt Freilos
      match.winnerId = match.player2Id;
      advanceWinner(matches, match);
    }
  }
  
  // Optional: Spiel um Platz 3
  let thirdPlaceMatch: PlayoffMatch | undefined;
  if (includeThirdPlaceMatch) {
    thirdPlaceMatch = {
      id: 'M3rd',
      round: -1, // Spezieller Wert für Platz 3
      position: 0,
      player1Id: null,
      player2Id: null,
      score1: null,
      score2: null,
      winnerId: null,
      nextMatchId: null,
    };
  }
  
  return {
    matches,
    totalRounds,
    thirdPlaceMatch,
  };
}

// Helfer: Gewinner in nächste Runde übertragen
function advanceWinner(matches: PlayoffMatch[], currentMatch: PlayoffMatch): void {
  if (!currentMatch.nextMatchId || !currentMatch.winnerId) return;
  
  const nextMatch = matches.find(m => m.id === currentMatch.nextMatchId);
  if (!nextMatch) return;
  
  // Finde Position im nächsten Match (0 oder 1)
  const sameRoundMatches = matches.filter(m => m.round === currentMatch.round);
  const currentIndex = sameRoundMatches.indexOf(currentMatch);
  
  if (currentIndex % 2 === 0) {
    nextMatch.player1Id = currentMatch.winnerId;
  } else {
    nextMatch.player2Id = currentMatch.winnerId;
  }
}

// Update Playoff Match mit Ergebnis
export function updatePlayoffMatch(
  bracket: PlayoffBracket,
  matchId: string,
  score1: number,
  score2: number
): PlayoffBracket {
  const matches = [...bracket.matches];
  const match = matches.find(m => m.id === matchId);
  
  if (!match) return bracket;
  
  match.score1 = score1;
  match.score2 = score2;
  
  // Bestimme Gewinner
  if (score1 > score2) {
    match.winnerId = match.player1Id;
  } else if (score2 > score1) {
    match.winnerId = match.player2Id;
  }
  // Bei Unentschieden: Kein Gewinner (erfordert Verlängerung/Elfmeter)
  
  if (match.winnerId) {
    advanceWinner(matches, match);
  }
  
  return {
    ...bracket,
    matches,
  };
}

// ============================================
// HANDICAP SYSTEM
// ============================================

export interface HandicapResult {
  playerId: string;
  handicap: number;
  effectiveScore: number; // Original Score + Handicap
  reason: string;
}

// Berechne Handicap für einen Spieler basierend auf bisherigen Ergebnissen
export function calculatePlayerHandicap(
  playerId: string,
  stats: { points: number; gamesPlayed: number; rank: number },
  settings: HandicapSettings,
  totalPlayers: number,
  maxHandicap: number = 3
): HandicapResult {
  if (!settings.enabled || stats.gamesPlayed === 0) {
    return {
      playerId,
      handicap: 0,
      effectiveScore: 0,
      reason: 'Kein Handicap',
    };
  }
  
  let handicap = 0;
  let reason = '';
  
  // Berechne Handicap basierend auf Rang
  const rankPercentile = stats.rank / totalPlayers;
  
  if (rankPercentile <= 0.25) {
    // Top 25% - negativer Handicap
    handicap = -maxHandicap * (0.25 - rankPercentile) * 4;
    reason = 'Top-Spieler Malus';
  } else if (rankPercentile >= 0.75) {
    // Bottom 25% - positiver Handicap
    handicap = maxHandicap * (rankPercentile - 0.75) * 4;
    reason = 'Aufhol-Bonus';
  } else {
    reason = 'Mittelfeld';
  }
  
  // Runde auf ganze Zahl
  handicap = Math.round(handicap);
  
  // Begrenze auf maxHandicap
  handicap = Math.max(-maxHandicap, Math.min(maxHandicap, handicap));
  
  return {
    playerId,
    handicap,
    effectiveScore: stats.points + handicap,
    reason,
  };
}

// Wende Handicap auf alle Spieler an
export function applyHandicaps(
  stats: Array<{ playerId: string; points: number; gamesPlayed: number; rank: number }>,
  settings: HandicapSettings
): HandicapResult[] {
  const totalPlayers = stats.length;
  
  return stats.map(s => calculatePlayerHandicap(
    s.playerId,
    s,
    settings,
    totalPlayers
  ));
}

// ============================================
// CAPTAIN MODE
// ============================================

export interface CaptainPick {
  captainId: string;
  pickedPlayerId: string;
  order: number;
}

export interface CaptainDraft {
  captains: string[];
  picks: CaptainPick[];
  currentCaptainIndex: number;
  currentRound: number;
  isComplete: boolean;
  teams: Map<string, string[]>; // Captain ID -> Team Player IDs
}

// Initialisiere Captain Draft
export function initCaptainDraft(
  captainIds: string[]
): CaptainDraft {
  const teams = new Map<string, string[]>();
  
  // Jeder Captain ist automatisch in seinem Team
  captainIds.forEach(id => {
    teams.set(id, [id]);
  });
  
  return {
    captains: captainIds,
    picks: [],
    currentCaptainIndex: 0,
    currentRound: 1,
    isComplete: false,
    teams,
  };
}

// Captain wählt einen Spieler
export function captainPick(
  draft: CaptainDraft,
  captainId: string,
  pickedPlayerId: string,
  allPlayers: Player[],
  teamSize: number
): CaptainDraft {
  // Validierung
  if (draft.isComplete) return draft;
  if (draft.captains[draft.currentCaptainIndex] !== captainId) return draft;
  
  // Überprüfe, ob Spieler bereits gewählt
  const allPicked = Array.from(draft.teams.values()).flat();
  if (allPicked.includes(pickedPlayerId)) return draft;
  
  // Füge Spieler zum Team hinzu
  const newTeams = new Map(draft.teams);
  const team = newTeams.get(captainId) || [captainId];
  team.push(pickedPlayerId);
  newTeams.set(captainId, team);
  
  // Neuer Pick
  const newPicks = [...draft.picks, {
    captainId,
    pickedPlayerId,
    order: draft.picks.length + 1,
  }];
  
  // Nächster Captain (Snake Draft: 1,2,3,3,2,1,1,2,3,...)
  let nextIndex = draft.currentCaptainIndex;
  let nextRound = draft.currentRound;
  
  if (nextRound % 2 === 1) {
    // Vorwärts
    nextIndex++;
    if (nextIndex >= draft.captains.length) {
      nextIndex = draft.captains.length - 1;
      nextRound++;
    }
  } else {
    // Rückwärts
    nextIndex--;
    if (nextIndex < 0) {
      nextIndex = 0;
      nextRound++;
    }
  }
  
  // Überprüfe, ob Draft abgeschlossen
  const totalPlayersNeeded = draft.captains.length * teamSize;
  const isComplete = allPicked.length + 1 >= totalPlayersNeeded ||
    allPicked.length + 1 >= allPlayers.length;
  
  return {
    ...draft,
    picks: newPicks,
    teams: newTeams,
    currentCaptainIndex: nextIndex,
    currentRound: nextRound,
    isComplete,
  };
}

// Hol verfügbare Spieler für Auswahl
export function getAvailablePlayers(
  draft: CaptainDraft,
  allPlayers: Player[]
): Player[] {
  const picked = Array.from(draft.teams.values()).flat();
  return allPlayers.filter(p => !picked.includes(p.id));
}

// ============================================
// LEAGUE MODE
// ============================================

export interface LeagueRound {
  roundNumber: number;
  date?: string;
  matches: Match[];
  isComplete: boolean;
}

export interface LeagueSeason {
  id: string;
  name: string;
  players: string[];
  rounds: LeagueRound[];
  matchdays: number;
  currentMatchday: number;
  standings: LeagueStanding[];
}

export interface LeagueStanding {
  playerId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[]; // Letzte 5 Spiele
}

// Generiere Round-Robin Schedule für Liga
export function generateLeagueSchedule(
  players: Player[],
  homeAndAway: boolean = true
): LeagueRound[] {
  const n = players.length;
  const rounds: LeagueRound[] = [];
  
  // Wenn ungerade Anzahl, füge "Bye" hinzu
  const playerIds = players.map(p => p.id);
  if (n % 2 !== 0) {
    playerIds.push('BYE');
  }
  
  const numPlayers = playerIds.length;
  const numRounds = numPlayers - 1;
  
  // Round-Robin Algorithmus
  for (let round = 0; round < numRounds; round++) {
    const matches: Match[] = [];
    
    for (let match = 0; match < numPlayers / 2; match++) {
      const home = (round + match) % (numPlayers - 1);
      let away = (numPlayers - 1 - match + round) % (numPlayers - 1);
      
      if (match === 0) {
        away = numPlayers - 1;
      }
      
      const homeId = playerIds[home];
      const awayId = playerIds[away];
      
      // Überspringe Bye-Matches
      if (homeId === 'BYE' || awayId === 'BYE') continue;
      
      matches.push({
        id: `R${round + 1}M${match + 1}`,
        roundIndex: round,
        matchIndex: match,
        fieldNumber: 1,
        teamA: { id: `T${round + 1}M${match + 1}A`, playerIds: [homeId] },
        teamB: { id: `T${round + 1}M${match + 1}B`, playerIds: [awayId] },
        scoreA: null,
        scoreB: null,
        scorersA: {},
        scorersB: {},
      });
    }
    
    rounds.push({
      roundNumber: round + 1,
      matches,
      isComplete: false,
    });
  }
  
  // Rückrunde (Home and Away)
  if (homeAndAway) {
    const returnRounds = rounds.map((round, index) => ({
      roundNumber: numRounds + index + 1,
      matches: round.matches.map(m => ({
        ...m,
        id: `R${numRounds + index + 1}M${m.id.split('M')[1]}`,
        teamA: m.teamB,
        teamB: m.teamA,
        scoreA: null,
        scoreB: null,
      })),
      isComplete: false,
    }));
    
    rounds.push(...returnRounds);
  }
  
  return rounds;
}

// Berechne Liga-Tabelle
export function calculateLeagueStandings(
  rounds: LeagueRound[],
  players: Player[]
): LeagueStanding[] {
  const standings = new Map<string, LeagueStanding>();
  
  // Initialisiere Standings
  for (const player of players) {
    standings.set(player.id, {
      playerId: player.id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  }
  
  // Verarbeite alle Matches
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.scoreA === null || match.scoreB === null) continue;
      
      const homeId = match.teamA.playerIds[0];
      const awayId = match.teamB.playerIds[0];
      const home = standings.get(homeId);
      const away = standings.get(awayId);
      
      if (!home || !away) continue;
      
      home.played++;
      away.played++;
      home.goalsFor += match.scoreA;
      home.goalsAgainst += match.scoreB;
      away.goalsFor += match.scoreB;
      away.goalsAgainst += match.scoreA;
      
      if (match.scoreA > match.scoreB) {
        home.wins++;
        home.points += 3;
        away.losses++;
        home.form.push('W');
        away.form.push('L');
      } else if (match.scoreA < match.scoreB) {
        away.wins++;
        away.points += 3;
        home.losses++;
        home.form.push('L');
        away.form.push('W');
      } else {
        home.draws++;
        away.draws++;
        home.points += 1;
        away.points += 1;
        home.form.push('D');
        away.form.push('D');
      }
      
      // Behalte nur letzte 5 Spiele
      if (home.form.length > 5) home.form = home.form.slice(-5);
      if (away.form.length > 5) away.form = away.form.slice(-5);
    }
  }
  
  // Berechne Tordifferenz
  for (const standing of standings.values()) {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
  }
  
  // Sortiere Tabelle
  const sorted = Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  return sorted;
}

// ============================================
// HILFSFUNKTIONEN
// ============================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generiere Team-Kombinationen basierend auf Turnier-Modus
export function generateTeamsForMode(
  players: Player[],
  mode: TournamentMode,
  captainDraft?: CaptainDraft
): Team[] {
  switch (mode) {
    case 'captain':
      if (!captainDraft || !captainDraft.isComplete) {
        throw new Error('Captain Draft nicht abgeschlossen');
      }
      return Array.from(captainDraft.teams.entries()).map(([_captainId, playerIds], index) => ({
        id: `captain-team-${index}`,
        playerIds,
        color: undefined,
      }));
    
    case 'playoff':
    case 'league':
      // Einzelspieler als "Teams"
      return players.map((p, index) => ({
        id: `single-team-${index}`,
        playerIds: [p.id],
        color: undefined,
      }));
    
    case 'standard':
    default:
      // Standard Dutch Tournament - zufällige Teams werden in generateSchedule erstellt
      return [];
  }
}
