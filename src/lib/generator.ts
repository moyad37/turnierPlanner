// ============================================
// Turnierplan-Generator mit Score-basiertem Greedy-Algorithmus
// ============================================

import type {
  Settings,
  Schedule,
  Round,
  Match,
  Team,
  Player,
  PairingHistory,
  FairnessMode,
  AgeGroupSettings,
} from '../types';

// Seeded Random Number Generator (Mulberry32)
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper: Erstelle Paar-Key (sortiert für Konsistenz)
function makePairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('-');
}

// Helper: Generiere UUID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Initialisiere Pairing History
function initPairingHistory(): PairingHistory {
  return {
    teammateCount: new Map(),
    opponentCount: new Map(),
    gamesPlayed: new Map(),
  };
}

// Update History nach einer Runde
function updateHistory(
  history: PairingHistory,
  matches: Match[]
): void {
  for (const match of matches) {
    // Teammates in Team A
    for (let i = 0; i < match.teamA.playerIds.length; i++) {
      const p1 = match.teamA.playerIds[i];
      history.gamesPlayed.set(p1, (history.gamesPlayed.get(p1) || 0) + 1);
      
      for (let j = i + 1; j < match.teamA.playerIds.length; j++) {
        const p2 = match.teamA.playerIds[j];
        const key = makePairKey(p1, p2);
        history.teammateCount.set(key, (history.teammateCount.get(key) || 0) + 1);
      }
    }

    // Teammates in Team B
    for (let i = 0; i < match.teamB.playerIds.length; i++) {
      const p1 = match.teamB.playerIds[i];
      history.gamesPlayed.set(p1, (history.gamesPlayed.get(p1) || 0) + 1);
      
      for (let j = i + 1; j < match.teamB.playerIds.length; j++) {
        const p2 = match.teamB.playerIds[j];
        const key = makePairKey(p1, p2);
        history.teammateCount.set(key, (history.teammateCount.get(key) || 0) + 1);
      }
    }

    // Opponents (Team A vs Team B)
    for (const p1 of match.teamA.playerIds) {
      for (const p2 of match.teamB.playerIds) {
        const key = makePairKey(p1, p2);
        history.opponentCount.set(key, (history.opponentCount.get(key) || 0) + 1);
      }
    }
  }
}

// Berechne Penalty Score für ein Team
function calculateTeamPenalty(
  playerIds: string[],
  history: PairingHistory,
  fairnessMode: FairnessMode,
  allPlayers: Player[],
  distributeGoalkeepers: boolean
): number {
  let penalty = 0;

  // Teammate Penalty: Spieler, die schon oft zusammen gespielt haben
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const key = makePairKey(playerIds[i], playerIds[j]);
      const count = history.teammateCount.get(key) || 0;
      penalty += count * count; // Quadratisch für stärkere Bestrafung
    }
  }

  // Bei balancedMinutes: Bevorzuge Spieler mit weniger Einsätzen
  if (fairnessMode === 'balancedMinutes') {
    for (const playerId of playerIds) {
      const games = history.gamesPlayed.get(playerId) || 0;
      penalty += games * 0.5; // Leichte Bestrafung für viele Einsätze
    }
  }

  // Tormann-Verteilung: Bestrafe mehrere Torleute im selben Team
  if (distributeGoalkeepers) {
    const goalkeeperCount = playerIds.filter(id => {
      const player = allPlayers.find(p => p.id === id);
      return player?.isGoalkeeper;
    }).length;
    
    if (goalkeeperCount > 1) {
      // Sehr hohe Strafe für mehrere Torleute im Team
      penalty += (goalkeeperCount - 1) * 1000;
    }
  }

  return penalty;
}

// Berechne Penalty für Match (Opponent-Wiederholungen + Altersgruppen-Mismatch)
function calculateMatchPenalty(
  teamA: string[],
  teamB: string[],
  history: PairingHistory,
  allPlayers?: Player[],
  ageGroupSettings?: AgeGroupSettings
): number {
  let penalty = 0;

  for (const p1 of teamA) {
    for (const p2 of teamB) {
      const key = makePairKey(p1, p2);
      const count = history.opponentCount.get(key) || 0;
      penalty += count * count;
    }
  }

  // Altersgruppen-Penalty: Vermeide Spiele mit großem Altersunterschied zwischen Teams
  if (ageGroupSettings?.enabled && allPlayers) {
    const maxDiff = ageGroupSettings.maxAgeDifference;

    const agesA = teamA
      .map(id => allPlayers.find(p => p.id === id)?.age)
      .filter((age): age is number => typeof age === 'number');
    const agesB = teamB
      .map(id => allPlayers.find(p => p.id === id)?.age)
      .filter((age): age is number => typeof age === 'number');

    if (agesA.length > 0 && agesB.length > 0) {
      const avgAgeA = agesA.reduce((a, b) => a + b, 0) / agesA.length;
      const avgAgeB = agesB.reduce((a, b) => a + b, 0) / agesB.length;
      const avgAgeDiff = Math.abs(avgAgeA - avgAgeB);

      if (avgAgeDiff > maxDiff) {
        // Hohe Strafe proportional zur Überschreitung: Generator meidet diese Paarung stark
        penalty += (avgAgeDiff - maxDiff) * 10000;
      }

      // Zusätzliche Strafe für jeden direkten Gegner-Pairing mit zu großem Altersunterschied
      for (const ageA of agesA) {
        for (const ageB of agesB) {
          if (Math.abs(ageA - ageB) > maxDiff) {
            penalty += 2000;
          }
        }
      }
    }
  }

  return penalty;
}

// Wähle Spieler für Bye basierend auf Fairness
function selectByePlayers(
  availablePlayers: Player[],
  byeCount: number,
  history: PairingHistory,
  random: () => number
): string[] {
  if (byeCount === 0) return [];

  // Sortiere nach Anzahl Spiele (absteigend) - wer mehr gespielt hat, pausiert eher
  const sorted = [...availablePlayers].sort((a, b) => {
    const gamesA = history.gamesPlayed.get(a.id) || 0;
    const gamesB = history.gamesPlayed.get(b.id) || 0;
    if (gamesB !== gamesA) return gamesB - gamesA;
    // Bei Gleichstand: zufällig
    return random() - 0.5;
  });

  return sorted.slice(0, byeCount).map(p => p.id);
}

// Greedy Team Building für eine Runde
function buildTeamsForRound(
  activePlayers: Player[],
  playersPerTeam: number,
  teamsPerRound: number,
  history: PairingHistory,
  fairnessMode: FairnessMode,
  random: () => number,
  distributeGoalkeepers: boolean
): Team[] {
  const teams: Team[] = [];
  const availableIds = new Set(activePlayers.map(p => p.id));

  // Shuffle für Randomisierung
  const shuffledPlayers = [...activePlayers].sort(() => random() - 0.5);
  
  // Bei Tormann-Verteilung: Starte jedes Team mit einem Tormann wenn möglich
  const goalkeepers = shuffledPlayers.filter(p => p.isGoalkeeper);
  
  // Wenn Verteilung aktiviert und genug Torleute: Verteile sie zuerst
  const useGoalkeeperDistribution = distributeGoalkeepers && goalkeepers.length > 0;

  for (let t = 0; t < teamsPerRound; t++) {
    const teamPlayerIds: string[] = [];

    // Bei Tormann-Verteilung: Füge zuerst einen Tormann hinzu (falls verfügbar)
    if (useGoalkeeperDistribution) {
      const availableGKs = goalkeepers.filter(gk => availableIds.has(gk.id));
      if (availableGKs.length > 0) {
        // Wähle Tormann mit wenigsten Spielen (bei Gleichstand: zufällig)
        availableGKs.sort((a, b) => {
          const gamesA = history.gamesPlayed.get(a.id) || 0;
          const gamesB = history.gamesPlayed.get(b.id) || 0;
          if (gamesA !== gamesB) return gamesA - gamesB;
          return random() - 0.5;
        });
        
        const selectedGK = availableGKs[0];
        teamPlayerIds.push(selectedGK.id);
        availableIds.delete(selectedGK.id);
      }
    }

    // Greedy: Wähle restliche Spieler mit minimalem Penalty
    while (teamPlayerIds.length < playersPerTeam) {
      let bestPlayerId: string | null = null;
      let bestPenalty = Infinity;

      for (const player of shuffledPlayers) {
        if (!availableIds.has(player.id)) continue;

        const candidateTeam = [...teamPlayerIds, player.id];
        const penalty = calculateTeamPenalty(
          candidateTeam, 
          history, 
          fairnessMode, 
          activePlayers,
          distributeGoalkeepers
        );

        // Bei balancedMinutes: Bevorzuge Spieler mit weniger Spielen
        let adjustedPenalty = penalty;
        if (fairnessMode === 'balancedMinutes') {
          const games = history.gamesPlayed.get(player.id) || 0;
          adjustedPenalty += games * 0.3;
        }

        // Etwas Randomisierung um lokale Minima zu vermeiden
        adjustedPenalty += random() * 0.1;

        if (adjustedPenalty < bestPenalty) {
          bestPenalty = adjustedPenalty;
          bestPlayerId = player.id;
        }
      }

      if (bestPlayerId) {
        teamPlayerIds.push(bestPlayerId);
        availableIds.delete(bestPlayerId);
      } else {
        break; // Keine Spieler mehr verfügbar
      }
    }

    teams.push({
      id: generateId(),
      playerIds: teamPlayerIds,
    });
  }

  return teams;
}

// Paare Teams zu Matches mit minimalem Opponent-Penalty
function pairTeamsToMatches(
  teams: Team[],
  roundIndex: number,
  fieldsCount: number,
  history: PairingHistory,
  random: () => number,
  allPlayers?: Player[],
  ageGroupSettings?: AgeGroupSettings
): Match[] {
  const matches: Match[] = [];
  const availableTeams = [...teams];
  let matchIndex = 0;

  while (availableTeams.length >= 2) {
    // Greedy: Finde beste Paarung
    let bestPair: [number, number] = [0, 1];
    let bestPenalty = Infinity;

    for (let i = 0; i < availableTeams.length; i++) {
      for (let j = i + 1; j < availableTeams.length; j++) {
        const penalty = calculateMatchPenalty(
          availableTeams[i].playerIds,
          availableTeams[j].playerIds,
          history,
          allPlayers,
          ageGroupSettings
        ) + random() * 0.1;

        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestPair = [i, j];
        }
      }
    }

    const [idx1, idx2] = bestPair;
    const teamA = availableTeams[idx1];
    const teamB = availableTeams[idx2];

    // Entferne Teams (höheren Index zuerst)
    availableTeams.splice(idx2, 1);
    availableTeams.splice(idx1, 1);

    const fieldNumber = (matchIndex % fieldsCount) + 1;

    matches.push({
      id: generateId(),
      roundIndex,
      matchIndex,
      fieldNumber,
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
      scorersA: {},
      scorersB: {},
    });

    matchIndex++;
  }

  return matches;
}

// Verteile überschüssige Spieler als Auswechselspieler (fair rotierend)
function assignSubstitutes(
  teams: Team[],
  activePlayers: Player[],
  history: PairingHistory,
  random: () => number
): void {
  const assignedIds = new Set(teams.flatMap(t => t.playerIds));
  const extras = activePlayers.filter(p => !assignedIds.has(p.id));

  if (extras.length === 0) return;

  // Bevorzuge Spieler mit weniger bisherigen Einsätzen für faire Rotation
  extras.sort((a, b) => {
    const ga = history.gamesPlayed.get(a.id) || 0;
    const gb = history.gamesPlayed.get(b.id) || 0;
    return ga !== gb ? ga - gb : random() - 0.5;
  });

  extras.forEach((player, i) => {
    const teamIndex = i % teams.length;
    if (!teams[teamIndex].substitutePlayerIds) {
      teams[teamIndex].substitutePlayerIds = [];
    }
    teams[teamIndex].substitutePlayerIds!.push(player.id);
    // Auch Auswechselspieler als "gespielt" zählen für faire Folge-Runden
    history.gamesPlayed.set(player.id, (history.gamesPlayed.get(player.id) || 0) + 1);
  });
}

// Hauptfunktion: Generiere Turnierplan
export function generateSchedule(settings: Settings): Schedule {
  const {
    players,
    playersPerTeam,
    teamsPerRound,
    roundsCount,
    fieldsCount,
    allowByes,
    fairnessMode,
    seed,
    distributeGoalkeepers,
  } = settings;

  const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
  const random = createSeededRandom(actualSeed);
  const history = initPairingHistory();

  const playersNeededPerRound = teamsPerRound * playersPerTeam;
  const byeCount = allowByes ? Math.max(0, players.length - playersNeededPerRound) : 0;

  const rounds: Round[] = [];

  for (let roundIndex = 0; roundIndex < roundsCount; roundIndex++) {
    // Wähle Spieler für Bye
    const byePlayerIds = selectByePlayers(players, byeCount, history, random);
    const byeSet = new Set(byePlayerIds);

    // Aktive Spieler für diese Runde
    const activePlayers = players.filter(p => !byeSet.has(p.id));

    // Baue Teams
    const teams = buildTeamsForRound(
      activePlayers,
      playersPerTeam,
      teamsPerRound,
      history,
      fairnessMode,
      random,
      distributeGoalkeepers
    );

    // Verteile überschüssige Spieler als Auswechselspieler (wenn allowByes = false)
    if (!allowByes) {
      assignSubstitutes(teams, activePlayers, history, random);
    }

    // Paare Teams zu Matches
    const matches = pairTeamsToMatches(teams, roundIndex, fieldsCount, history, random, players, settings.ageGroupSettings);

    // Update History
    updateHistory(history, matches);

    rounds.push({
      index: roundIndex,
      matches,
      byePlayerIds,
    });
  }

  return {
    rounds,
    seed: actualSeed,
    createdAt: new Date().toISOString(),
  };
}

// Validiere ob Generator starten kann
export function canGenerate(
  playerCount: number,
  playersPerTeam: number,
  teamsPerRound: number,
  allowByes: boolean
): boolean {
  const playersNeeded = teamsPerRound * playersPerTeam;
  
  if (allowByes) {
    return playerCount >= playersNeeded;
  }
  
  return playerCount === playersNeeded;
}

// Berechne Statistiken zur Paarungs-Verteilung (für Debug/Info)
export function analyzeSchedule(
  schedule: Schedule,
  players: Player[]
): {
  teammateStats: { min: number; max: number; avg: number };
  opponentStats: { min: number; max: number; avg: number };
  gamesPlayedStats: { min: number; max: number; avg: number };
} {
  const history = initPairingHistory();

  for (const round of schedule.rounds) {
    updateHistory(history, round.matches);
  }

  // Teammate Stats
  const teammateValues = Array.from(history.teammateCount.values());
  const opponentValues = Array.from(history.opponentCount.values());
  const gamesValues = players.map(p => history.gamesPlayed.get(p.id) || 0);

  const calcStats = (values: number[]) => {
    if (values.length === 0) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, avg: Math.round(avg * 100) / 100 };
  };

  return {
    teammateStats: calcStats(teammateValues),
    opponentStats: calcStats(opponentValues),
    gamesPlayedStats: calcStats(gamesValues),
  };
}
