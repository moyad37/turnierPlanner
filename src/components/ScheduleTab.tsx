// ============================================
// Schedule Tab Komponente
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import type { Schedule, Player, Match, PointSettings } from '../types';
import { countPlayedMatches, getRoundStats } from '../lib/stats';

interface ScheduleTabProps {
  schedule: Schedule;
  players: Player[];
  pointSettings: PointSettings;
  onScoreChange: (
    matchId: string, 
    scoreA: number | null, 
    scoreB: number | null,
    scorersA?: Record<string, number>,
    scorersB?: Record<string, number>
  ) => void;
}

// Finde Spielernamen nach ID
function getPlayerName(playerId: string, players: Player[]): string {
  return players.find(p => p.id === playerId)?.name || playerId;
}

// Torschützen-Eingabe Komponente
const ScorerInput: React.FC<{
  playerId: string;
  playerName: string;
  goals: number;
  maxGoals: number;
  onGoalsChange: (playerId: string, goals: number) => void;
}> = ({ playerId, playerName, goals, maxGoals, onGoalsChange }) => {
  return (
    <div className="scorer-item">
      <span className="scorer-name">{playerName}</span>
      <div className="scorer-controls">
        <button
          type="button"
          className="scorer-btn minus"
          onClick={() => onGoalsChange(playerId, Math.max(0, goals - 1))}
          disabled={goals <= 0}
        >
          -
        </button>
        <span className="scorer-goals">{goals}</span>
        <button
          type="button"
          className="scorer-btn plus"
          onClick={() => onGoalsChange(playerId, goals + 1)}
          disabled={goals >= maxGoals}
        >
          +
        </button>
      </div>
    </div>
  );
};

// Match-Komponente mit Score-Eingabe – React.memo verhindert Re-Render wenn Match sich nicht ändert
const MatchRow = React.memo<{
  match: Match;
  players: Player[];
  enableScorerPoints: boolean;
  onScoreChange: (
    matchId: string,
    scoreA: number | null,
    scoreB: number | null,
    scorersA?: Record<string, number>,
    scorersB?: Record<string, number>
  ) => void;
}>(({ match, players, enableScorerPoints, onScoreChange }) => {
  const [localScoreA, setLocalScoreA] = useState<string>(
    match.scoreA !== null ? String(match.scoreA) : ''
  );
  const [localScoreB, setLocalScoreB] = useState<string>(
    match.scoreB !== null ? String(match.scoreB) : ''
  );
  const [showScorers, setShowScorers] = useState(false);
  const [scorersA, setScorersA] = useState<Record<string, number>>(
    match.scorersA || {}
  );
  const [scorersB, setScorersB] = useState<Record<string, number>>(
    match.scorersB || {}
  );

  // Wenn ein Remote-Gerät ein Ergebnis einträgt, lokalen State synchronisieren
  useEffect(() => {
    setLocalScoreA(match.scoreA !== null ? String(match.scoreA) : '');
    setLocalScoreB(match.scoreB !== null ? String(match.scoreB) : '');
  }, [match.scoreA, match.scoreB]);

  useEffect(() => {
    setScorersA(match.scorersA || {});
    setScorersB(match.scorersB || {});
  }, [match.scorersA, match.scorersB]);

  const handleScoreAChange = useCallback((value: string) => {
    setLocalScoreA(value);
    const numA = value === '' ? null : parseInt(value);
    const numB = localScoreB === '' ? null : parseInt(localScoreB);
    
    if ((numA === null || !isNaN(numA)) && (numB === null || !isNaN(numB))) {
      onScoreChange(match.id, numA, numB, scorersA, scorersB);
    }
  }, [match.id, localScoreB, onScoreChange, scorersA, scorersB]);

  const handleScoreBChange = useCallback((value: string) => {
    setLocalScoreB(value);
    const numA = localScoreA === '' ? null : parseInt(localScoreA);
    const numB = value === '' ? null : parseInt(value);
    
    if ((numA === null || !isNaN(numA)) && (numB === null || !isNaN(numB))) {
      onScoreChange(match.id, numA, numB, scorersA, scorersB);
    }
  }, [match.id, localScoreA, onScoreChange, scorersA, scorersB]);

  const handleScorerAChange = useCallback((playerId: string, goals: number) => {
    const newScorers = { ...scorersA, [playerId]: goals };
    if (goals === 0) delete newScorers[playerId];
    setScorersA(newScorers);
    
    const numA = localScoreA === '' ? null : parseInt(localScoreA);
    const numB = localScoreB === '' ? null : parseInt(localScoreB);
    onScoreChange(match.id, numA, numB, newScorers, scorersB);
  }, [match.id, localScoreA, localScoreB, scorersA, scorersB, onScoreChange]);

  const handleScorerBChange = useCallback((playerId: string, goals: number) => {
    const newScorers = { ...scorersB, [playerId]: goals };
    if (goals === 0) delete newScorers[playerId];
    setScorersB(newScorers);
    
    const numA = localScoreA === '' ? null : parseInt(localScoreA);
    const numB = localScoreB === '' ? null : parseInt(localScoreB);
    onScoreChange(match.id, numA, numB, scorersA, newScorers);
  }, [match.id, localScoreA, localScoreB, scorersA, scorersB, onScoreChange]);

  const teamANames = match.teamA.playerIds.map(id => getPlayerName(id, players));
  const teamBNames = match.teamB.playerIds.map(id => getPlayerName(id, players));
  const teamASubNames = (match.teamA.substitutePlayerIds || []).map(id => getPlayerName(id, players));
  const teamBSubNames = (match.teamB.substitutePlayerIds || []).map(id => getPlayerName(id, players));

  const hasResult = match.scoreA !== null && match.scoreB !== null;
  const teamAWon = hasResult && match.scoreA! > match.scoreB!;
  const teamBWon = hasResult && match.scoreB! > match.scoreA!;

  // Berechne verbleibende Tore zum Verteilen
  const totalScorersA = Object.values(scorersA).reduce((sum, g) => sum + g, 0);
  const totalScorersB = Object.values(scorersB).reduce((sum, g) => sum + g, 0);
  const remainingA = (match.scoreA || 0) - totalScorersA;
  const remainingB = (match.scoreB || 0) - totalScorersB;

  return (
    <>
      <tr className={`match-row ${hasResult ? 'has-result' : ''}`}>
        <td className="field-number">Feld {match.fieldNumber}</td>
        <td className={`team team-a ${teamAWon ? 'winner' : ''}`}>
          <div className="team-players">
            {teamANames.map((name, i) => (
              <span key={i} className="player-name">{name}</span>
            ))}
            {teamASubNames.map((name, i) => (
              <span key={`sub-${i}`} className="player-name player-substitute" title="Auswechselspieler">
                🔄 {name}
              </span>
            ))}
          </div>
        </td>
        <td className="score-input">
          <input
            type="number"
            min={0}
            max={99}
            value={localScoreA}
            onChange={(e) => handleScoreAChange(e.target.value)}
            placeholder="-"
            className={teamAWon ? 'winner' : ''}
          />
          <span className="score-separator">:</span>
          <input
            type="number"
            min={0}
            max={99}
            value={localScoreB}
            onChange={(e) => handleScoreBChange(e.target.value)}
            placeholder="-"
            className={teamBWon ? 'winner' : ''}
          />
        </td>
        <td className={`team team-b ${teamBWon ? 'winner' : ''}`}>
          <div className="team-players">
            {teamBNames.map((name, i) => (
              <span key={i} className="player-name">{name}</span>
            ))}
            {teamBSubNames.map((name, i) => (
              <span key={`sub-${i}`} className="player-name player-substitute" title="Auswechselspieler">
                🔄 {name}
              </span>
            ))}
          </div>
        </td>
        {enableScorerPoints && hasResult && (match.scoreA! > 0 || match.scoreB! > 0) && (
          <td className="scorer-toggle">
            <button
              type="button"
              className={`btn-scorer-toggle ${showScorers ? 'active' : ''}`}
              onClick={() => setShowScorers(!showScorers)}
              title="Torschützen eingeben"
            >
              🎯
            </button>
          </td>
        )}
      </tr>
      {enableScorerPoints && showScorers && hasResult && (
        <tr className="scorer-row">
          <td colSpan={5}>
            <div className="scorer-container">
              {match.scoreA! > 0 && (
                <div className="scorer-team team-a-scorers">
                  <div className="scorer-team-header">
                    Team A ({remainingA > 0 ? `noch ${remainingA} Tor(e) offen` : '✓'})
                  </div>
                  {[...match.teamA.playerIds, ...(match.teamA.substitutePlayerIds || [])].map(playerId => (
                    <ScorerInput
                      key={playerId}
                      playerId={playerId}
                      playerName={getPlayerName(playerId, players)}
                      goals={scorersA[playerId] || 0}
                      maxGoals={(scorersA[playerId] || 0) + remainingA}
                      onGoalsChange={handleScorerAChange}
                    />
                  ))}
                </div>
              )}
              {match.scoreB! > 0 && (
                <div className="scorer-team team-b-scorers">
                  <div className="scorer-team-header">
                    Team B ({remainingB > 0 ? `noch ${remainingB} Tor(e) offen` : '✓'})
                  </div>
                  {[...match.teamB.playerIds, ...(match.teamB.substitutePlayerIds || [])].map(playerId => (
                    <ScorerInput
                      key={playerId}
                      playerId={playerId}
                      playerName={getPlayerName(playerId, players)}
                      goals={scorersB[playerId] || 0}
                      maxGoals={(scorersB[playerId] || 0) + remainingB}
                      onGoalsChange={handleScorerBChange}
                    />
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  schedule,
  players,
  pointSettings,
  onScoreChange,
}) => {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(() => {
    // Standardmäßig alle Runden expandiert
    return new Set(schedule.rounds.map(r => r.index));
  });

  const toggleRound = useCallback((roundIndex: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundIndex)) {
        next.delete(roundIndex);
      } else {
        next.add(roundIndex);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedRounds(new Set(schedule.rounds.map(r => r.index)));
  }, [schedule.rounds]);

  const collapseAll = useCallback(() => {
    setExpandedRounds(new Set());
  }, []);

  const { total, played, remaining } = countPlayedMatches(schedule);

  return (
    <div className="schedule-tab">
      {/* Header mit Fortschritt */}
      <div className="schedule-header">
        <h2>📅 Spielplan</h2>
        <div className="schedule-info">
          <span className="seed-info">Seed: {schedule.seed}</span>
          <span className="progress-info">
            {played} / {total} Spiele ({remaining} offen)
          </span>
        </div>
      </div>

      {/* Fortschrittsbalken */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${total > 0 ? (played / total) * 100 : 0}%` }}
        />
      </div>

      {/* Expand/Collapse Buttons */}
      <div className="round-controls">
        <button type="button" className="btn-small" onClick={expandAll}>
          Alle aufklappen
        </button>
        <button type="button" className="btn-small" onClick={collapseAll}>
          Alle zuklappen
        </button>
      </div>

      {/* Runden */}
      <div className="rounds-container">
        {schedule.rounds.map((round) => {
          const roundStats = getRoundStats(schedule, round.index);
          const isExpanded = expandedRounds.has(round.index);
          const isComplete = roundStats.matchesPlayed === roundStats.totalMatches;

          return (
            <div 
              key={round.index} 
              className={`round-card ${isComplete ? 'complete' : ''}`}
            >
              <div 
                className="round-header"
                onClick={() => toggleRound(round.index)}
              >
                <div className="round-title">
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  <h3>Runde {round.index + 1}</h3>
                  {isComplete && <span className="complete-badge">✓</span>}
                </div>
                <div className="round-stats">
                  <span>{roundStats.matchesPlayed}/{roundStats.totalMatches} Spiele</span>
                  {roundStats.totalGoals > 0 && (
                    <span className="goals-info">{roundStats.totalGoals} Tore</span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="round-content">
                  <table className="matches-table">
                    <tbody>
                      {round.matches.map((match) => (
                        <MatchRow
                          key={match.id}
                          match={match}
                          players={players}
                          enableScorerPoints={pointSettings.enableScorerPoints}
                          onScoreChange={onScoreChange}
                        />
                      ))}
                    </tbody>
                  </table>

                  {round.byePlayerIds.length > 0 && (
                    <div className="bye-info">
                      <span className="bye-label">⏸️ Pause:</span>
                      <span className="bye-players">
                        {round.byePlayerIds
                          .map(id => getPlayerName(id, players))
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
