import { useState, useRef } from 'react';
import type { Player, PlayerStats, HeadToHeadStats } from '../types';
import { useApp } from '../contexts/AppContext';
import type { FormResult } from '../lib/stats';

interface PlayerProfileProps {
  player: Player;
  stats?: PlayerStats;
  headToHead?: HeadToHeadStats[];
  onUpdatePlayer?: (player: Player) => void;
  readonly?: boolean;
}

function SkillRating({
  rating,
  onChange,
  readonly,
}: {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const display = hoverRating !== null ? hoverRating : rating;

  return (
    <div className={`skill-rating${readonly ? '' : ' skill-rating--interactive'}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="skill-star"
          style={{ color: star <= display ? '#fbbf24' : '#d1d5db' }}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(null)}
          onClick={() => !readonly && onChange?.(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function PlayerAvatar({
  photo,
  name,
  size = 80,
  onPhotoChange,
  readonly,
}: {
  photo?: string;
  name: string;
  size?: number;
  onPhotoChange?: (photo: string) => void;
  readonly?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onPhotoChange?.(reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="player-avatar">
      <div
        className={`player-avatar__circle${readonly ? '' : ' player-avatar__circle--clickable'}`}
        style={{ width: size, height: size }}
        onClick={() => !readonly && fileInputRef.current?.click()}
      >
        {photo ? (
          <img className="player-avatar__img" src={photo} alt={name} />
        ) : (
          <span
            className="player-avatar__initials"
            style={{ fontSize: size * 0.35 }}
          >
            {initials}
          </span>
        )}
      </div>
      {!readonly && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            className="player-avatar__btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📷
          </button>
        </>
      )}
    </div>
  );
}

function FormCurveMini({ form }: { form: FormResult[] }) {
  if (!form || form.length === 0) return null;
  const titles: Record<FormResult, string> = { W: 'Sieg', D: 'Unentschieden', L: 'Niederlage' };
  return (
    <div className="form-bars">
      {form.map((result, i) => (
        <div key={i} className={`form-bar form-bar--${result}`} title={titles[result]} />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

function H2HCard({ h2h }: { h2h: HeadToHeadStats }) {
  return (
    <div className="stat-card" style={{ marginBottom: '8px', textAlign: 'left' }}>
      <div style={{ fontWeight: 500, marginBottom: '8px' }}>vs. {h2h.player2Name}</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Zusammen: </span>
          <span>
            {h2h.gamesAsTeammates} Sp. ({h2h.winsAsTeammates} S)
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Gegeneinander: </span>
          <span>
            {h2h.player1WinsAsOpponent}S / {h2h.drawsAsOpponents}U / {h2h.player2WinsAsOpponent}N
          </span>
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        Tore: {h2h.goalsPlayer1 || 0} vs {h2h.goalsPlayer2 || 0}
      </div>
    </div>
  );
}

export function PlayerProfile({
  player,
  stats,
  headToHead,
  onUpdatePlayer,
  readonly = false,
}: PlayerProfileProps) {
  const { t } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [editedPlayer, setEditedPlayer] = useState<Player>(player);

  const handleSave = () => {
    onUpdatePlayer?.(editedPlayer);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditedPlayer(player);
    setEditMode(false);
  };

  return (
    <div className="player-profile">
      <div className="player-profile__header">
        <PlayerAvatar
          photo={editMode ? editedPlayer.photo : player.photo}
          name={player.name}
          size={100}
          readonly={readonly || !editMode}
          onPhotoChange={(photo) => setEditedPlayer({ ...editedPlayer, photo })}
        />

        <div style={{ flex: 1 }}>
          {editMode ? (
            <input
              type="text"
              className="player-profile__name-input"
              value={editedPlayer.name}
              onChange={(e) =>
                setEditedPlayer({ ...editedPlayer, name: e.target.value })
              }
            />
          ) : (
            <h2 className="player-profile__name">{player.name}</h2>
          )}

          <div className="player-profile__rating">
            <span className="player-profile__rating-label">Skill Rating:</span>
            <SkillRating
              rating={editMode ? editedPlayer.skillRating || 3 : player.skillRating || 3}
              readonly={readonly || !editMode}
              onChange={(rating) =>
                setEditedPlayer({ ...editedPlayer, skillRating: rating })
              }
            />
          </div>

          {player.isGoalkeeper && (
            <span className="player-profile__gk-badge">🧤 Torwart</span>
          )}
        </div>

        {!readonly && (
          <div>
            {editMode ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary btn-small" onClick={handleSave}>
                  {t('save')}
                </button>
                <button className="btn-secondary btn-small" onClick={handleCancel}>
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <button className="btn-secondary btn-small" onClick={() => setEditMode(true)}>
                ✏️ Bearbeiten
              </button>
            )}
          </div>
        )}
      </div>

      {stats && stats.gamesPlayed > 0 && (
        <div className="player-profile__stats">
          <h3>{t('statistics')}</h3>
          <div className="player-profile__stat-grid">
            <StatCard label="Rang" value={`#${stats.rank}`} />
            <StatCard label="Spiele" value={stats.gamesPlayed} />
            <StatCard label="Siege" value={stats.wins} color="#22c55e" />
            <StatCard label="Unent." value={stats.draws} color="#eab308" />
            <StatCard label="Niederl." value={stats.losses} color="#ef4444" />
            <StatCard label="Tore" value={stats.goalsScored} />
            <StatCard label="Punkte" value={stats.points} color="var(--primary-color)" />
            <StatCard label="MVP Score" value={stats.mvpScore || 0} color="#fbbf24" />
          </div>

          {stats.formCurve && stats.formCurve.length > 0 && (
            <div className="player-profile__form">
              <span className="player-profile__form-label">Letzte 5 Spiele:</span>
              <FormCurveMini form={stats.formCurve} />
            </div>
          )}
        </div>
      )}

      {headToHead && headToHead.length > 0 && (
        <div className="player-profile__h2h">
          <h3>Head-to-Head</h3>
          <div className="player-profile__h2h-list">
            {headToHead.map((h2h, i) => (
              <H2HCard key={i} h2h={h2h} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PlayerCard({
  player,
  stats,
  onClick,
}: {
  player: Player;
  stats?: PlayerStats;
  onClick?: () => void;
}) {
  return (
    <div
      className={`player-card${onClick ? ' player-card--clickable' : ''}`}
      onClick={onClick}
    >
      <PlayerAvatar photo={player.photo} name={player.name} size={48} readonly />
      <div className="player-card__info">
        <div className="player-card__name">{player.name}</div>
        <div className="player-card__meta">
          {player.skillRating && <span>{'★'.repeat(player.skillRating)}</span>}
          {player.isGoalkeeper && <span>🧤</span>}
        </div>
      </div>
      {stats && (
        <div className="player-card__score">
          <div className="player-card__points">{stats.points} Pkt</div>
          <div className="player-card__rank">#{stats.rank}</div>
        </div>
      )}
    </div>
  );
}