import { useMemo } from 'react';
import type { PlayerStats } from '../types';
import type { FormResult } from '../lib/stats';
import { useApp } from '../contexts/AppContext';

interface LiveTableProps {
  stats: PlayerStats[];
  compact?: boolean;
  showMVP?: boolean;
  highlightPlayerId?: string;
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-badge rank-badge--gold';
  if (rank === 2) return 'rank-badge rank-badge--silver';
  if (rank === 3) return 'rank-badge rank-badge--bronze';
  return 'rank-badge';
}

function FormBadge({ result }: { result: FormResult }) {
  return (
    <span className={`form-badge form-badge--${result}`}>{result}</span>
  );
}

function FormCurve({ form }: { form: FormResult[] }) {
  if (!form || form.length === 0) {
    return <span className="form-curve--empty">-</span>;
  }
  return (
    <div className="form-curve">
      {form.map((result, i) => (
        <FormBadge key={i} result={result} />
      ))}
    </div>
  );
}

function MVPBadge() {
  return <span className="mvp-badge">⭐ MVP</span>;
}

export function LiveTable({
  stats,
  compact = false,
  showMVP = true,
  highlightPlayerId,
}: LiveTableProps) {
  const { t } = useApp();

  const mvpId = useMemo(() => {
    if (!showMVP || stats.length === 0) return null;
    const eligible = stats.filter(s => s.gamesPlayed > 0);
    if (eligible.length === 0) return null;
    return [...eligible].sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0))[0]?.playerId;
  }, [stats, showMVP]);

  if (stats.length === 0) {
    return <div className="live-table-empty">{t('noPlayersYet')}</div>;
  }

  const tableClass = `live-table${compact ? ' live-table--compact' : ''}`;

  return (
    <div className="live-table-wrapper">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className="center" style={{ width: 50 }}>#</th>
            <th>{t('playerName')}</th>
            <th className="center" title="Spiele">Sp</th>
            <th className="center" title="Siege">S</th>
            <th className="center" title="Unentschieden">U</th>
            <th className="center" title="Niederlagen">N</th>
            <th className="center" title="Tore">T</th>
            <th className="center" title="Tordifferenz">+/-</th>
            {!compact && <th className="center" title="Zu Null">CS</th>}
            {!compact && <th title="Form (letzte 5 Spiele)">Form</th>}
            <th className="center" title="Punkte" style={{ fontWeight: 'bold' }}>Pkt</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((player) => {
            const isHighlighted = player.playerId === highlightPlayerId;
            const isMVP = player.playerId === mvpId;
            const rowClass = isHighlighted ? 'highlighted' : '';

            const diffClass =
              player.goalDifference > 0
                ? 'center goal-diff-pos'
                : player.goalDifference < 0
                ? 'center goal-diff-neg'
                : 'center';

            return (
              <tr key={player.playerId} className={rowClass}>
                <td className="center">
                  <span className={getRankClass(player.rank)}>{player.rank}</span>
                </td>
                <td className={`player-name-cell${isMVP ? ' is-mvp' : ''}`}>
                  {player.playerName}
                  {isMVP && showMVP && <MVPBadge />}
                </td>
                <td className="center">{player.gamesPlayed}</td>
                <td className="center wins">{player.wins}</td>
                <td className="center draws">{player.draws}</td>
                <td className="center losses">{player.losses}</td>
                <td className="center">{player.goalsScored}</td>
                <td className={diffClass}>
                  {player.goalDifference > 0 ? '+' : ''}{player.goalDifference}
                </td>
                {!compact && <td className="center">{player.cleanSheets}</td>}
                {!compact && (
                  <td>
                    <FormCurve form={player.formCurve || []} />
                  </td>
                )}
                <td className="center points">{player.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LiveTableCompact({ stats }: { stats: PlayerStats[] }) {
  return <LiveTable stats={stats} compact showMVP={false} />;
}