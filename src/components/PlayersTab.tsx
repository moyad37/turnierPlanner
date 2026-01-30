// ============================================
// Players Tab Komponente (Statistiken)
// ============================================

import React, { useState, useMemo } from 'react';
import type { PlayerStats, Schedule, PointSettings } from '../types';

interface PlayersTabProps {
  stats: PlayerStats[];
  schedule: Schedule | null;
  pointSettings: PointSettings;
}

type SortField = 'rank' | 'playerName' | 'gamesPlayed' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'points' | 'goalsScored' | 'cleanSheets';
type SortDirection = 'asc' | 'desc';

export const PlayersTab: React.FC<PlayersTabProps> = ({ stats, schedule, pointSettings }) => {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedStats = useMemo(() => {
    const sorted = [...stats];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'playerName':
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        case 'gamesPlayed':
          comparison = a.gamesPlayed - b.gamesPlayed;
          break;
        case 'goalsFor':
          comparison = a.goalsFor - b.goalsFor;
          break;
        case 'goalsAgainst':
          comparison = a.goalsAgainst - b.goalsAgainst;
          break;
        case 'goalDifference':
          comparison = a.goalDifference - b.goalDifference;
          break;
        case 'points':
          comparison = a.points - b.points;
          break;
        case 'goalsScored':
          comparison = (a.goalsScored || 0) - (b.goalsScored || 0);
          break;
        case 'cleanSheets':
          comparison = (a.cleanSheets || 0) - (b.cleanSheets || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [stats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'playerName' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Berechne Gesamtstatistiken (echte Match-Statistiken)
  const matchStats = useMemo(() => {
    if (!schedule) return { played: 0, totalGoals: 0 };
    
    let totalGoals = 0;
    let played = 0;
    
    for (const round of schedule.rounds) {
      for (const match of round.matches) {
        if (match.scoreA !== null && match.scoreB !== null) {
          played++;
          totalGoals += match.scoreA + match.scoreB;
        }
      }
    }
    
    return { played, totalGoals };
  }, [schedule]);

  const hasAnyGames = stats.some(s => s.gamesPlayed > 0);

  return (
    <div className="players-tab">
      <h2>📊 Spieler-Statistiken</h2>

      {!hasAnyGames && (
        <div className="empty-stats-message">
          <p>Noch keine Ergebnisse eingetragen.</p>
          <p>Trage im Spielplan-Tab die Ergebnisse ein, um die Statistiken zu sehen.</p>
        </div>
      )}

      {/* Zusammenfassung */}
      {hasAnyGames && (
        <div className="stats-summary">
          <div className="summary-item">
            <span className="summary-value">{matchStats.played}</span>
            <span className="summary-label">Spiele</span>
          </div>
          <div className="summary-item">
            <span className="summary-value">{matchStats.totalGoals}</span>
            <span className="summary-label">Tore</span>
          </div>
          <div className="summary-item">
            <span className="summary-value">
              {matchStats.played > 0 
                ? (matchStats.totalGoals / matchStats.played).toFixed(1) 
                : '0.0'}
            </span>
            <span className="summary-label">Tore/Spiel</span>
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div className="stats-table-container">
        <table className="stats-table">
          <thead>
            <tr>
              <th 
                className={`sortable ${sortField === 'rank' ? 'sorted' : ''}`}
                onClick={() => handleSort('rank')}
              >
                # {getSortIcon('rank')}
              </th>
              <th 
                className={`sortable ${sortField === 'playerName' ? 'sorted' : ''}`}
                onClick={() => handleSort('playerName')}
              >
                Spieler {getSortIcon('playerName')}
              </th>
              <th 
                className={`sortable ${sortField === 'gamesPlayed' ? 'sorted' : ''}`}
                onClick={() => handleSort('gamesPlayed')}
                title="Spiele"
              >
                Sp {getSortIcon('gamesPlayed')}
              </th>
              <th title="Siege">S</th>
              <th title="Unentschieden">U</th>
              <th title="Niederlagen">N</th>
              <th 
                className={`sortable ${sortField === 'goalsFor' ? 'sorted' : ''}`}
                onClick={() => handleSort('goalsFor')}
                title="Tore"
              >
                Tore {getSortIcon('goalsFor')}
              </th>
              <th 
                className={`sortable ${sortField === 'goalsAgainst' ? 'sorted' : ''}`}
                onClick={() => handleSort('goalsAgainst')}
                title="Gegentore"
              >
                Gegen {getSortIcon('goalsAgainst')}
              </th>
              <th 
                className={`sortable ${sortField === 'goalDifference' ? 'sorted' : ''}`}
                onClick={() => handleSort('goalDifference')}
                title="Tordifferenz"
              >
                Diff {getSortIcon('goalDifference')}
              </th>
              {pointSettings.enableScorerPoints && (
                <th 
                  className={`sortable ${sortField === 'goalsScored' ? 'sorted' : ''}`}
                  onClick={() => handleSort('goalsScored')}
                  title="Eigene Tore"
                >
                  ⚽ {getSortIcon('goalsScored')}
                </th>
              )}
              {pointSettings.enableCleanSheet && (
                <th 
                  className={`sortable ${sortField === 'cleanSheets' ? 'sorted' : ''}`}
                  onClick={() => handleSort('cleanSheets')}
                  title="Zu-Null-Spiele"
                >
                  🧤 {getSortIcon('cleanSheets')}
                </th>
              )}
              <th 
                className={`sortable ${sortField === 'points' ? 'sorted' : ''}`}
                onClick={() => handleSort('points')}
                title="Punkte"
              >
                Pkt {getSortIcon('points')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat, index) => {
              const isTopThree = stat.rank <= 3 && hasAnyGames;
              const rankClass = isTopThree ? `rank-${stat.rank}` : '';
              
              return (
                <tr key={stat.playerId} className={rankClass}>
                  <td className="rank-cell">
                    {hasAnyGames ? (
                      <>
                        {stat.rank === 1 && '🥇'}
                        {stat.rank === 2 && '🥈'}
                        {stat.rank === 3 && '🥉'}
                        {stat.rank > 3 && stat.rank}
                      </>
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td className="player-name-cell">{stat.playerName}</td>
                  <td>{stat.gamesPlayed}</td>
                  <td className="wins">{stat.wins}</td>
                  <td className="draws">{stat.draws}</td>
                  <td className="losses">{stat.losses}</td>
                  <td>{stat.goalsFor}</td>
                  <td>{stat.goalsAgainst}</td>
                  <td className={`diff ${stat.goalDifference > 0 ? 'positive' : stat.goalDifference < 0 ? 'negative' : ''}`}>
                    {stat.goalDifference > 0 ? '+' : ''}{stat.goalDifference}
                  </td>
                  {pointSettings.enableScorerPoints && (
                    <td className="scorer-cell">{stat.goalsScored || 0}</td>
                  )}
                  {pointSettings.enableCleanSheet && (
                    <td className="cleansheet-cell">{stat.cleanSheets || 0}</td>
                  )}
                  <td className="points-cell"><strong>{stat.points}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legende */}
      <div className="stats-legend">
        <span><strong>Sp</strong> = Spiele</span>
        <span><strong>S</strong> = Siege</span>
        <span><strong>U</strong> = Unentschieden</span>
        <span><strong>N</strong> = Niederlagen</span>
        <span>
          <strong>Pkt</strong> = Punkte (S: {pointSettings.pointsForWin}, U: {pointSettings.pointsForDraw}, N: {pointSettings.pointsForLoss}
          {pointSettings.enableTeamGoalPoints && `, +${pointSettings.pointsPerTeamGoal}/Tor`}
          {pointSettings.enableScorerPoints && `, +${pointSettings.pointsPerScorerGoal}/pers. Tor`}
          {pointSettings.enableCleanSheet && `, +${pointSettings.pointsForCleanSheet} Zu-Null`}
          )
        </span>
      </div>
    </div>
  );
};
