// ============================================
// Spieler-Statistiken Berechnung
// ============================================

import type { Player, Schedule, PlayerStats, Match, PointSettings, HeadToHeadStats } from '../types';
import { getDefaultPointSettings } from './storage';

// Formkurven-Typ: Ergebnis eines Spiels
export type FormResult = 'W' | 'D' | 'L';

// Berechne Punkte basierend auf Ergebnis und Einstellungen
function calculateMatchPoints(
  goalsFor: number,
  goalsAgainst: number,
  pointSettings: PointSettings
): { 
  points: number; 
  win: boolean; 
  draw: boolean; 
  loss: boolean;
  cleanSheet: boolean;
} {
  const cleanSheet = goalsAgainst === 0;
  let points = 0;
  let win = false;
  let draw = false;
  let loss = false;

  if (goalsFor > goalsAgainst) {
    points = pointSettings.pointsForWin;
    win = true;
  } else if (goalsFor === goalsAgainst) {
    points = pointSettings.pointsForDraw;
    draw = true;
  } else {
    points = pointSettings.pointsForLoss;
    loss = true;
  }

  // Team-Punkte pro Tor
  if (pointSettings.enableTeamGoalPoints) {
    points += goalsFor * pointSettings.pointsPerTeamGoal;
  }

  // Clean Sheet Bonus
  if (pointSettings.enableCleanSheet && cleanSheet) {
    points += pointSettings.pointsForCleanSheet;
  }

  return { points, win, draw, loss, cleanSheet };
}

// Hauptfunktion: Berechne Statistiken für alle Spieler
export function calculatePlayerStats(
  players: Player[],
  schedule: Schedule | null,
  pointSettings?: PointSettings
): PlayerStats[] {
  const settings = pointSettings || getDefaultPointSettings();
  
  // Initialisiere Stats für alle Spieler
  const statsMap = new Map<string, PlayerStats>();
  // FormCurve Map für jeden Spieler
  const formMap = new Map<string, FormResult[]>();

  for (const player of players) {
    statsMap.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      gamesPlayed: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      cleanSheets: 0,
      goalsScored: 0,
      points: 0,
      rank: 0,
      mvpScore: 0,
      formCurve: [],
    });
    formMap.set(player.id, []);
  }

  // Wenn kein Schedule, gib leere Stats zurück
  if (!schedule) {
    return Array.from(statsMap.values());
  }

  // Verarbeite alle Matches
  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      // Nur Matches mit eingetragenen Ergebnissen
      if (match.scoreA === null || match.scoreB === null) {
        continue;
      }

      const scoreA = match.scoreA;
      const scoreB = match.scoreB;

      // Verarbeite Team A Spieler
      for (const playerId of match.teamA.playerIds) {
        const stats = statsMap.get(playerId);
        const form = formMap.get(playerId);
        if (stats) {
          stats.gamesPlayed++;
          stats.goalsFor += scoreA;
          stats.goalsAgainst += scoreB;
          
          const result = calculateMatchPoints(scoreA, scoreB, settings);
          stats.points += result.points;
          if (result.win) {
            stats.wins++;
            form?.push('W');
          }
          if (result.draw) {
            stats.draws++;
            form?.push('D');
          }
          if (result.loss) {
            stats.losses++;
            form?.push('L');
          }
          if (result.cleanSheet) stats.cleanSheets++;
          
          // Torschützen-Punkte
          const scorerGoals = match.scorersA?.[playerId] || 0;
          stats.goalsScored += scorerGoals;
          if (settings.enableScorerPoints && scorerGoals > 0) {
            stats.points += scorerGoals * settings.pointsPerScorerGoal;
          }
        }
      }

      // Verarbeite Team B Spieler
      for (const playerId of match.teamB.playerIds) {
        const stats = statsMap.get(playerId);
        const form = formMap.get(playerId);
        if (stats) {
          stats.gamesPlayed++;
          stats.goalsFor += scoreB;
          stats.goalsAgainst += scoreA;
          
          const result = calculateMatchPoints(scoreB, scoreA, settings);
          stats.points += result.points;
          if (result.win) {
            stats.wins++;
            form?.push('W');
          }
          if (result.draw) {
            stats.draws++;
            form?.push('D');
          }
          if (result.loss) {
            stats.losses++;
            form?.push('L');
          }
          if (result.cleanSheet) stats.cleanSheets++;
          
          // Torschützen-Punkte
          const scorerGoals = match.scorersB?.[playerId] || 0;
          stats.goalsScored += scorerGoals;
          if (settings.enableScorerPoints && scorerGoals > 0) {
            stats.points += scorerGoals * settings.pointsPerScorerGoal;
          }
        }
      }
    }
  }

  // Berechne Tordifferenz, MVP Score und füge FormCurve hinzu
  const statsArray = Array.from(statsMap.values());
  
  for (const stats of statsArray) {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    
    // FormCurve hinzufügen (letzte 5 Spiele)
    const fullForm = formMap.get(stats.playerId) || [];
    stats.formCurve = fullForm.slice(-5);
    
    // MVP Score berechnen:
    // - Punkte pro Spiel (gewichtet x2)
    // - Tore geschossen (gewichtet x1.5)
    // - Clean Sheets (gewichtet x1)
    // - Tordifferenz (gewichtet x0.5)
    // - Win Rate Bonus
    if (stats.gamesPlayed > 0) {
      const pointsPerGame = stats.points / stats.gamesPlayed;
      const goalsPerGame = stats.goalsScored / stats.gamesPlayed;
      const cleanSheetRate = stats.cleanSheets / stats.gamesPlayed;
      const winRate = stats.wins / stats.gamesPlayed;
      const goalDiffPerGame = stats.goalDifference / stats.gamesPlayed;
      
      stats.mvpScore = Math.round(
        (pointsPerGame * 2) +
        (goalsPerGame * 1.5) +
        (cleanSheetRate * 10) +
        (goalDiffPerGame * 0.5) +
        (winRate * 5)
      );
    }
  }

  // Sortiere: Punkte (absteigend), dann Tordifferenz, dann Tore
  statsArray.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.playerName.localeCompare(b.playerName);
  });

  // Weise Ränge zu
  let currentRank = 1;
  for (let i = 0; i < statsArray.length; i++) {
    if (i > 0) {
      const prev = statsArray[i - 1];
      const curr = statsArray[i];
      // Gleicher Rang bei gleichen Werten
      if (
        prev.points !== curr.points ||
        prev.goalDifference !== curr.goalDifference ||
        prev.goalsFor !== curr.goalsFor
      ) {
        currentRank = i + 1;
      }
    }
    statsArray[i].rank = currentRank;
  }

  return statsArray;
}

// Berechne Statistiken für ein einzelnes Match (für Anzeige)
export function getMatchStats(match: Match): {
  teamAPlayers: string[];
  teamBPlayers: string[];
  hasScore: boolean;
  scoreA: number | null;
  scoreB: number | null;
} {
  return {
    teamAPlayers: match.teamA.playerIds,
    teamBPlayers: match.teamB.playerIds,
    hasScore: match.scoreA !== null && match.scoreB !== null,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
  };
}

// Hilfsfunktion: Zähle gespielte Matches
export function countPlayedMatches(schedule: Schedule | null): {
  total: number;
  played: number;
  remaining: number;
} {
  if (!schedule) {
    return { total: 0, played: 0, remaining: 0 };
  }

  let total = 0;
  let played = 0;

  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      total++;
      if (match.scoreA !== null && match.scoreB !== null) {
        played++;
      }
    }
  }

  return {
    total,
    played,
    remaining: total - played,
  };
}

// Aggregiere Statistiken pro Runde
export function getRoundStats(
  schedule: Schedule | null,
  roundIndex: number
): {
  matchesPlayed: number;
  totalMatches: number;
  totalGoals: number;
} {
  if (!schedule || roundIndex < 0 || roundIndex >= schedule.rounds.length) {
    return { matchesPlayed: 0, totalMatches: 0, totalGoals: 0 };
  }

  const round = schedule.rounds[roundIndex];
  let matchesPlayed = 0;
  let totalGoals = 0;

  for (const match of round.matches) {
    if (match.scoreA !== null && match.scoreB !== null) {
      matchesPlayed++;
      totalGoals += match.scoreA + match.scoreB;
    }
  }

  return {
    matchesPlayed,
    totalMatches: round.matches.length,
    totalGoals,
  };
}

// Head-to-Head Statistiken zwischen zwei Spielern
export function calculateHeadToHead(
  player1Id: string,
  player2Id: string,
  schedule: Schedule | null,
  players: Player[]
): HeadToHeadStats | null {
  if (!schedule) return null;

  const player1 = players.find(p => p.id === player1Id);
  const player2 = players.find(p => p.id === player2Id);
  
  if (!player1 || !player2) return null;

  const stats: HeadToHeadStats = {
    playerId1: player1Id,
    playerId2: player2Id,
    player1Name: player1.name,
    player2Name: player2.name,
    gamesAsTeammates: 0,
    gamesAsOpponents: 0,
    winsAsTeammates: 0,
    player1WinsAsOpponent: 0,
    player2WinsAsOpponent: 0,
    drawsAsOpponents: 0,
    goalsPlayer1: 0,
    goalsPlayer2: 0,
  };

  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      if (match.scoreA === null || match.scoreB === null) continue;

      const p1InTeamA = match.teamA.playerIds.includes(player1Id);
      const p1InTeamB = match.teamB.playerIds.includes(player1Id);
      const p2InTeamA = match.teamA.playerIds.includes(player2Id);
      const p2InTeamB = match.teamB.playerIds.includes(player2Id);

      // Beide im selben Team
      if ((p1InTeamA && p2InTeamA) || (p1InTeamB && p2InTeamB)) {
        stats.gamesAsTeammates++;
        const inTeamA = p1InTeamA && p2InTeamA;
        const teamScore = inTeamA ? match.scoreA : match.scoreB;
        const oppScore = inTeamA ? match.scoreB : match.scoreA;
        if (teamScore > oppScore) stats.winsAsTeammates++;
        
        // Tore wenn im selben Team
        if (inTeamA) {
          stats.goalsPlayer1 = (stats.goalsPlayer1 || 0) + (match.scorersA?.[player1Id] || 0);
          stats.goalsPlayer2 = (stats.goalsPlayer2 || 0) + (match.scorersA?.[player2Id] || 0);
        } else {
          stats.goalsPlayer1 = (stats.goalsPlayer1 || 0) + (match.scorersB?.[player1Id] || 0);
          stats.goalsPlayer2 = (stats.goalsPlayer2 || 0) + (match.scorersB?.[player2Id] || 0);
        }
      }
      // Gegner
      else if ((p1InTeamA && p2InTeamB) || (p1InTeamB && p2InTeamA)) {
        stats.gamesAsOpponents++;
        const p1Score = p1InTeamA ? match.scoreA : match.scoreB;
        const p2Score = p2InTeamA ? match.scoreA : match.scoreB;
        
        if (p1Score > p2Score) stats.player1WinsAsOpponent++;
        else if (p2Score > p1Score) stats.player2WinsAsOpponent++;
        else stats.drawsAsOpponents++;
        
        // Tore als Gegner
        if (p1InTeamA) {
          stats.goalsPlayer1 = (stats.goalsPlayer1 || 0) + (match.scorersA?.[player1Id] || 0);
          stats.goalsPlayer2 = (stats.goalsPlayer2 || 0) + (match.scorersB?.[player2Id] || 0);
        } else {
          stats.goalsPlayer1 = (stats.goalsPlayer1 || 0) + (match.scorersB?.[player1Id] || 0);
          stats.goalsPlayer2 = (stats.goalsPlayer2 || 0) + (match.scorersA?.[player2Id] || 0);
        }
      }
    }
  }

  return stats;
}

// Alle Head-to-Head Statistiken für einen Spieler
export function getAllHeadToHead(
  playerId: string,
  schedule: Schedule | null,
  players: Player[]
): HeadToHeadStats[] {
  const results: HeadToHeadStats[] = [];
  
  for (const player of players) {
    if (player.id === playerId) continue;
    const h2h = calculateHeadToHead(playerId, player.id, schedule, players);
    if (h2h && (h2h.gamesAsTeammates > 0 || h2h.gamesAsOpponents > 0)) {
      results.push(h2h);
    }
  }
  
  return results;
}

// MVP des Turniers ermitteln
export function getMVP(stats: PlayerStats[]): PlayerStats | null {
  if (stats.length === 0) return null;
  
  // Nur Spieler die mindestens 1 Spiel gespielt haben
  const eligiblePlayers = stats.filter(s => s.gamesPlayed > 0);
  if (eligiblePlayers.length === 0) return null;
  
  // Nach MVP Score sortieren
  const sorted = [...eligiblePlayers].sort((a, b) => 
    (b.mvpScore || 0) - (a.mvpScore || 0)
  );
  
  return sorted[0];
}

// Top-Spieler in verschiedenen Kategorien
export function getTopPlayers(stats: PlayerStats[], minGames: number = 1): {
  topScorer: PlayerStats | null;
  mostCleanSheets: PlayerStats | null;
  bestWinRate: PlayerStats | null;
  mostPoints: PlayerStats | null;
} {
  const eligible = stats.filter(s => s.gamesPlayed >= minGames);
  
  return {
    topScorer: eligible.length > 0 
      ? [...eligible].sort((a, b) => b.goalsScored - a.goalsScored)[0] 
      : null,
    mostCleanSheets: eligible.length > 0 
      ? [...eligible].sort((a, b) => b.cleanSheets - a.cleanSheets)[0] 
      : null,
    bestWinRate: eligible.length > 0 
      ? [...eligible].sort((a, b) => {
          const rateA = a.wins / a.gamesPlayed;
          const rateB = b.wins / b.gamesPlayed;
          return rateB - rateA;
        })[0] 
      : null,
    mostPoints: eligible.length > 0 
      ? [...eligible].sort((a, b) => b.points - a.points)[0] 
      : null,
  };
}
