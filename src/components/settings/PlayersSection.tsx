// ============================================
// Spieler-Sektion der Einstellungen
// ============================================

import React, { useState, useCallback } from 'react';
import type { Player } from '../../types';
import { parsePlayersFromText, playersToText } from '../../lib/storage';

interface PlayersSectionProps {
  players: Player[];
  ageGroupEnabled: boolean;
  onChange: (players: Player[]) => void;
}

export const PlayersSection: React.FC<PlayersSectionProps> = ({
  players,
  ageGroupEnabled,
  onChange,
}) => {
  const [textMode, setTextMode] = useState(false);
  const [playerText, setPlayerText] = useState(() => playersToText(players));

  const goalkeeperCount = players.filter(p => p.isGoalkeeper).length;

  const handleTextChange = useCallback(
    (text: string) => {
      setPlayerText(text);
      onChange(parsePlayersFromText(text));
    },
    [onChange]
  );

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      const updated = players.map((p, i) => (i === index ? { ...p, name } : p));
      onChange(updated);
      setPlayerText(playersToText(updated));
    },
    [players, onChange]
  );

  const handleGoalkeeperToggle = useCallback(
    (index: number) => {
      onChange(
        players.map((p, i) =>
          i === index ? { ...p, isGoalkeeper: !p.isGoalkeeper } : p
        )
      );
    },
    [players, onChange]
  );

  const handleAgeChange = useCallback(
    (index: number, value: string) => {
      const age = value === '' ? undefined : parseInt(value);
      onChange(players.map((p, i) => (i === index ? { ...p, age } : p)));
    },
    [players, onChange]
  );

  const addPlayer = useCallback(() => {
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: `Spieler ${players.length + 1}`,
      isGoalkeeper: false,
    };
    const updated = [...players, newPlayer];
    onChange(updated);
    setPlayerText(playersToText(updated));
  }, [players, onChange]);

  const removePlayer = useCallback(
    (index: number) => {
      const updated = players.filter((_, i) => i !== index);
      onChange(updated);
      setPlayerText(playersToText(updated));
    },
    [players, onChange]
  );

  return (
    <section className="form-section">
      <div className="section-header">
        <h3>
          👥 Spieler ({players.length})
          {goalkeeperCount > 0 && (
            <span className="gk-count"> • 🧤 {goalkeeperCount} Torleute</span>
          )}
        </h3>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setTextMode(!textMode)}
        >
          {textMode ? '📝 Liste' : '📋 Text-Import'}
        </button>
      </div>

      {textMode ? (
        <div className="player-text-input">
          <textarea
            value={playerText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Spielernamen eingeben (ein Name pro Zeile oder kommagetrennt)"
            rows={10}
          />
          <small>
            Ein Name pro Zeile oder durch Komma/Semikolon getrennt.
            Tormann-Status muss danach in der Liste gesetzt werden.
          </small>
        </div>
      ) : (
        <div className="player-list">
          {players.map((player, index) => (
            <div key={player.id} className="player-item">
              <span className="player-number">{index + 1}.</span>
              <input
                type="text"
                value={player.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`Spieler ${index + 1}`}
              />
              {ageGroupEnabled && (
                <input
                  type="number"
                  className="player-age-input"
                  value={player.age ?? ''}
                  min={4}
                  max={99}
                  onChange={(e) => handleAgeChange(index, e.target.value)}
                  placeholder="Alter"
                  title="Alter des Spielers in Jahren"
                />
              )}
              <button
                type="button"
                className={`btn-gk ${player.isGoalkeeper ? 'active' : ''}`}
                onClick={() => handleGoalkeeperToggle(index)}
                title={player.isGoalkeeper ? 'Tormann entfernen' : 'Als Tormann markieren'}
              >
                🧤
              </button>
              <button
                type="button"
                className="btn-icon btn-danger"
                onClick={() => removePlayer(index)}
                title="Spieler entfernen"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addPlayer}>
            + Spieler hinzufügen
          </button>
        </div>
      )}
    </section>
  );
};
