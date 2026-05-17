// ============================================
// Unit Tests für den Turnierplan-Generator
// ============================================

import { describe, it, expect } from 'vitest';
import { validateSettings, getMatchesPerRound, getPlayersNeededPerRound } from '../lib/validation';
import { generateSchedule, canGenerate } from '../lib/generator';
import { calculatePlayerStats, countPlayedMatches } from '../lib/stats';
import type { Settings, Player, Schedule, Match } from '../types';
import { createPlayersFromNames, DEFAULT_PLAYER_NAMES, getDefaultPointSettings } from '../lib/storage';

// Helper: Erstelle Test-Spieler
function createTestPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Spieler ${i + 1}`,
  }));
}

// Helper: Erstelle Standard-Settings
function createTestSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    players: createTestPlayers(20),
    playersPerTeam: 5,
    teamsPerRound: 4,
    roundsCount: 10,
    fieldsCount: 2,
    allowByes: false,
    fairnessMode: 'maxCoverage',
    seed: 12345,
    pointSettings: getDefaultPointSettings(),
    distributeGoalkeepers: true,
    tournamentMode: 'standard',
    matchDuration: 10,
    useSkillBalancing: false,
    handicapSettings: { enabled: false, skillDifferenceMultiplier: 0.5 },
    playoffSettings: { enabled: false, topPlayersCount: 8, playoffRounds: 3 },
    teamColors: ['red', 'blue'],
    ageGroupSettings: { enabled: false, maxAgeDifference: 5 },
    ...overrides,
  };
}

// ============================================
// Validation Tests
// ============================================

describe('Validation', () => {
  describe('validateSettings', () => {
    it('sollte gültige Settings akzeptieren', () => {
      const settings = createTestSettings();
      const result = validateSettings(settings);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('sollte Fehler bei zu wenigen Spielern ohne Byes', () => {
      const settings = createTestSettings({
        players: createTestPlayers(15), // 20 benötigt
        allowByes: false,
      });
      const result = validateSettings(settings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Spieler'))).toBe(true);
    });

    it('sollte Fehler bei ungerader Teamanzahl', () => {
      const settings = createTestSettings({
        teamsPerRound: 3, // muss gerade sein
      });
      const result = validateSettings(settings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('gerade'))).toBe(true);
    });

    it('sollte Fehler bei leeren Spielernamen', () => {
      const players = createTestPlayers(20);
      players[5].name = '   '; // Leer
      
      const settings = createTestSettings({ players });
      const result = validateSettings(settings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Namen'))).toBe(true);
    });

    it('sollte Warnungen bei mehr Spielern mit Byes erlauben', () => {
      const settings = createTestSettings({
        players: createTestPlayers(22), // 2 extra
        allowByes: true,
      });
      const result = validateSettings(settings);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('pausieren'))).toBe(true);
    });

    it('sollte Warnung bei zu vielen Feldern', () => {
      const settings = createTestSettings({
        fieldsCount: 10, // Nur 2 Spiele pro Runde
      });
      const result = validateSettings(settings);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Felder'))).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('getMatchesPerRound sollte korrekt berechnen', () => {
      expect(getMatchesPerRound(4)).toBe(2);
      expect(getMatchesPerRound(6)).toBe(3);
      expect(getMatchesPerRound(8)).toBe(4);
    });

    it('getPlayersNeededPerRound sollte korrekt berechnen', () => {
      expect(getPlayersNeededPerRound(4, 5)).toBe(20);
      expect(getPlayersNeededPerRound(2, 3)).toBe(6);
      expect(getPlayersNeededPerRound(6, 4)).toBe(24);
    });
  });
});

// ============================================
// Generator Tests
// ============================================

describe('Generator', () => {
  describe('generateSchedule', () => {
    it('sollte korrekte Anzahl Runden generieren', () => {
      const settings = createTestSettings({ roundsCount: 5 });
      const schedule = generateSchedule(settings);
      
      expect(schedule.rounds).toHaveLength(5);
    });

    it('sollte korrekte Anzahl Matches pro Runde generieren', () => {
      const settings = createTestSettings({
        teamsPerRound: 4, // 2 Matches pro Runde
        roundsCount: 3,
      });
      const schedule = generateSchedule(settings);
      
      schedule.rounds.forEach(round => {
        expect(round.matches).toHaveLength(2);
      });
    });

    it('sollte korrekte Spieleranzahl pro Team', () => {
      const settings = createTestSettings({
        playersPerTeam: 5,
      });
      const schedule = generateSchedule(settings);
      
      schedule.rounds.forEach(round => {
        round.matches.forEach(match => {
          expect(match.teamA.playerIds).toHaveLength(5);
          expect(match.teamB.playerIds).toHaveLength(5);
        });
      });
    });

    it('sollte unterschiedliche Spieler in einem Match haben', () => {
      const settings = createTestSettings();
      const schedule = generateSchedule(settings);
      
      schedule.rounds.forEach(round => {
        round.matches.forEach(match => {
          const allPlayers = [...match.teamA.playerIds, ...match.teamB.playerIds];
          const uniquePlayers = new Set(allPlayers);
          expect(uniquePlayers.size).toBe(allPlayers.length);
        });
      });
    });

    it('sollte mit gleichem Seed reproduzierbar sein', () => {
      const settings = createTestSettings({ seed: 42 });
      
      const schedule1 = generateSchedule(settings);
      const schedule2 = generateSchedule(settings);
      
      expect(schedule1.seed).toBe(schedule2.seed);
      expect(schedule1.rounds[0].matches[0].teamA.playerIds)
        .toEqual(schedule2.rounds[0].matches[0].teamA.playerIds);
    });

    it('sollte Felder korrekt zuweisen', () => {
      const settings = createTestSettings({
        teamsPerRound: 4, // 2 Matches
        fieldsCount: 2,
      });
      const schedule = generateSchedule(settings);
      
      schedule.rounds.forEach(round => {
        const fields = round.matches.map(m => m.fieldNumber);
        expect(fields).toContain(1);
        expect(fields).toContain(2);
      });
    });

    it('sollte Bye-Spieler bei allowByes tracken', () => {
      const settings = createTestSettings({
        players: createTestPlayers(22), // 2 extra
        allowByes: true,
      });
      const schedule = generateSchedule(settings);
      
      schedule.rounds.forEach(round => {
        expect(round.byePlayerIds).toHaveLength(2);
      });
    });

    it('sollte performant für große Turniere sein', () => {
      const settings = createTestSettings({
        players: createTestPlayers(30),
        teamsPerRound: 6,
        playersPerTeam: 5,
        roundsCount: 20,
        allowByes: false,
      });
      
      const startTime = performance.now();
      const schedule = generateSchedule(settings);
      const endTime = performance.now();
      
      expect(schedule.rounds).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(1000); // <1s
    });
  });

  describe('canGenerate', () => {
    it('sollte true bei exakter Spieleranzahl ohne Byes', () => {
      expect(canGenerate(20, 5, 4, false)).toBe(true);
    });

    it('sollte false bei zu wenigen Spielern ohne Byes', () => {
      expect(canGenerate(15, 5, 4, false)).toBe(false);
    });

    it('sollte true bei mehr Spielern mit Byes', () => {
      expect(canGenerate(25, 5, 4, true)).toBe(true);
    });
  });
});

// ============================================
// Stats Tests
// ============================================

describe('Stats', () => {
  // Helper: Erstelle Match mit Score
  function createMatchWithScore(
    teamAIds: string[],
    teamBIds: string[],
    scoreA: number,
    scoreB: number
  ): Match {
    return {
      id: `match-${Math.random()}`,
      roundIndex: 0,
      matchIndex: 0,
      fieldNumber: 1,
      teamA: { id: 'teamA', playerIds: teamAIds },
      teamB: { id: 'teamB', playerIds: teamBIds },
      scoreA,
      scoreB,
      scorersA: {},
      scorersB: {},
    };
  }

  describe('calculatePlayerStats', () => {
    it('sollte Stats für alle Spieler zurückgeben', () => {
      const players = createTestPlayers(4);
      const stats = calculatePlayerStats(players, null);
      
      expect(stats).toHaveLength(4);
      stats.forEach(s => {
        expect(s.gamesPlayed).toBe(0);
        expect(s.points).toBe(0);
      });
    });

    it('sollte Siege korrekt zählen (3 Punkte)', () => {
      const players = createTestPlayers(4);
      const schedule: Schedule = {
        seed: 1,
        createdAt: new Date().toISOString(),
        rounds: [{
          index: 0,
          byePlayerIds: [],
          matches: [
            createMatchWithScore(
              ['player-1', 'player-2'],
              ['player-3', 'player-4'],
              3, 1 // Team A gewinnt
            ),
          ],
        }],
      };
      
      const stats = calculatePlayerStats(players, schedule);
      
      const player1Stats = stats.find(s => s.playerId === 'player-1')!;
      expect(player1Stats.wins).toBe(1);
      expect(player1Stats.points).toBe(3);
      expect(player1Stats.goalsFor).toBe(3);
      expect(player1Stats.goalsAgainst).toBe(1);
    });

    it('sollte Unentschieden korrekt zählen (1 Punkt)', () => {
      const players = createTestPlayers(4);
      const schedule: Schedule = {
        seed: 1,
        createdAt: new Date().toISOString(),
        rounds: [{
          index: 0,
          byePlayerIds: [],
          matches: [
            createMatchWithScore(
              ['player-1', 'player-2'],
              ['player-3', 'player-4'],
              2, 2 // Unentschieden
            ),
          ],
        }],
      };
      
      const stats = calculatePlayerStats(players, schedule);
      
      const player1Stats = stats.find(s => s.playerId === 'player-1')!;
      expect(player1Stats.draws).toBe(1);
      expect(player1Stats.points).toBe(1);
    });

    it('sollte Tordifferenz korrekt berechnen', () => {
      const players = createTestPlayers(4);
      const schedule: Schedule = {
        seed: 1,
        createdAt: new Date().toISOString(),
        rounds: [{
          index: 0,
          byePlayerIds: [],
          matches: [
            createMatchWithScore(['player-1'], ['player-2'], 5, 2),
          ],
        }, {
          index: 1,
          byePlayerIds: [],
          matches: [
            createMatchWithScore(['player-1'], ['player-3'], 3, 4),
          ],
        }],
      };
      
      const stats = calculatePlayerStats(players, schedule);
      
      const player1Stats = stats.find(s => s.playerId === 'player-1')!;
      expect(player1Stats.goalsFor).toBe(8); // 5 + 3
      expect(player1Stats.goalsAgainst).toBe(6); // 2 + 4
      expect(player1Stats.goalDifference).toBe(2); // 8 - 6
    });

    it('sollte Ranking korrekt berechnen', () => {
      const players = createTestPlayers(3);
      const schedule: Schedule = {
        seed: 1,
        createdAt: new Date().toISOString(),
        rounds: [{
          index: 0,
          byePlayerIds: [],
          matches: [
            createMatchWithScore(['player-1'], ['player-2'], 3, 0),
            createMatchWithScore(['player-3'], ['player-2'], 2, 0),
          ],
        }],
      };
      
      const stats = calculatePlayerStats(players, schedule);
      
      // Player 1: 1 Sieg = 3 Punkte
      // Player 3: 1 Sieg = 3 Punkte (aber weniger Tore)
      // Player 2: 2 Niederlagen = 0 Punkte
      const player1Stats = stats.find(s => s.playerId === 'player-1')!;
      const player2Stats = stats.find(s => s.playerId === 'player-2')!;
      const player3Stats = stats.find(s => s.playerId === 'player-3')!;
      
      expect(player1Stats.rank).toBeLessThanOrEqual(2);
      expect(player3Stats.rank).toBeLessThanOrEqual(2);
      expect(player2Stats.rank).toBe(3);
    });

    it('sollte Matches ohne Score ignorieren', () => {
      const players = createTestPlayers(2);
      const schedule: Schedule = {
        seed: 1,
        createdAt: new Date().toISOString(),
        rounds: [{
          index: 0,
          byePlayerIds: [],
          matches: [{
            id: 'match-1',
            roundIndex: 0,
            matchIndex: 0,
            fieldNumber: 1,
            teamA: { id: 'teamA', playerIds: ['player-1'] },
            teamB: { id: 'teamB', playerIds: ['player-2'] },
            scoreA: null, // Kein Score
            scoreB: null,
            scorersA: {},
            scorersB: {},
          }],
        }],
      };
      
      const stats = calculatePlayerStats(players, schedule);
      
      stats.forEach(s => {
        expect(s.gamesPlayed).toBe(0);
      });
    });
  });

  describe('countPlayedMatches', () => {
    it('sollte null Schedule handhaben', () => {
      const result = countPlayedMatches(null);
      expect(result).toEqual({ total: 0, played: 0, remaining: 0 });
    });

    it('sollte gespielte Matches korrekt zählen', () => {
      const schedule: Schedule = {
        seed: 1,
        createdAt: new Date().toISOString(),
        rounds: [{
          index: 0,
          byePlayerIds: [],
          matches: [
            { id: '1', roundIndex: 0, matchIndex: 0, fieldNumber: 1,
              teamA: { id: 'a', playerIds: [] }, teamB: { id: 'b', playerIds: [] },
              scoreA: 1, scoreB: 1, scorersA: {}, scorersB: {} },
            { id: '2', roundIndex: 0, matchIndex: 1, fieldNumber: 2,
              teamA: { id: 'c', playerIds: [] }, teamB: { id: 'd', playerIds: [] },
              scoreA: null, scoreB: null, scorersA: {}, scorersB: {} },
          ],
        }],
      };
      
      const result = countPlayedMatches(schedule);
      expect(result).toEqual({ total: 2, played: 1, remaining: 1 });
    });
  });
});

// ============================================
// Storage Tests
// ============================================

describe('Storage', () => {
  it('createPlayersFromNames sollte Spieler erstellen', () => {
    const names = ['Max', 'Anna', 'Tim'];
    const players = createPlayersFromNames(names);
    
    expect(players).toHaveLength(3);
    expect(players[0].name).toBe('Max');
    expect(players[1].name).toBe('Anna');
    expect(players[2].name).toBe('Tim');
    players.forEach(p => {
      expect(p.id).toBeDefined();
    });
  });

  it('DEFAULT_PLAYER_NAMES sollte 20 Namen haben', () => {
    expect(DEFAULT_PLAYER_NAMES).toHaveLength(20);
  });
});
