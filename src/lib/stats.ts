// ============================================
// Spieler-Statistiken Berechnung
// ============================================

import type { Player, Schedule, PlayerStats, Match, PointSettings } from '../types';
import { getDefaultPointSettings } from './storage';

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
    });
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
        if (stats) {
          stats.gamesPlayed++;
          stats.goalsFor += scoreA;
          stats.goalsAgainst += scoreB;
          
          const result = calculateMatchPoints(scoreA, scoreB, settings);
          stats.points += result.points;
          if (result.win) stats.wins++;
          if (result.draw) stats.draws++;
          if (result.loss) stats.losses++;
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
        if (stats) {
          stats.gamesPlayed++;
          stats.goalsFor += scoreB;
          stats.goalsAgainst += scoreA;
          
          const result = calculateMatchPoints(scoreB, scoreA, settings);
          stats.points += result.points;
          if (result.win) stats.wins++;
          if (result.draw) stats.draws++;
          if (result.loss) stats.losses++;
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

  // Berechne Tordifferenz und sortiere für Ranking
  const statsArray = Array.from(statsMap.values());
  
  for (const stats of statsArray) {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
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
