// ============================================
// Settings Form Komponente
// ============================================

import React, { useState, useCallback } from 'react';
import type { Settings, Player, FairnessMode, ValidationResult, PointSettings } from '../types';
import { validateSettings, getPlayersNeededPerRound, getMatchesPerRound } from '../lib/validation';
import { parsePlayersFromText, playersToText } from '../lib/storage';

interface SettingsFormProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onGenerate: () => void;
  onReset: () => void;
  hasSchedule: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  settings,
  onSettingsChange,
  onGenerate,
  onReset,
  hasSchedule,
}) => {
  const [playerTextMode, setPlayerTextMode] = useState(false);
  const [playerText, setPlayerText] = useState(() => playersToText(settings.players));

  const validation: ValidationResult = validateSettings(settings);

  const updateSetting = useCallback(<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  }, [settings, onSettingsChange]);

  const updatePointSetting = useCallback(<K extends keyof PointSettings>(
    key: K,
    value: PointSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      pointSettings: { ...settings.pointSettings, [key]: value }
    });
  }, [settings, onSettingsChange]);

  const handlePlayerTextChange = useCallback((text: string) => {
    setPlayerText(text);
    const players = parsePlayersFromText(text);
    updateSetting('players', players);
  }, [updateSetting]);

  const handlePlayerNameChange = useCallback((index: number, name: string) => {
    const newPlayers = [...settings.players];
    newPlayers[index] = { ...newPlayers[index], name };
    updateSetting('players', newPlayers);
    setPlayerText(playersToText(newPlayers));
  }, [settings.players, updateSetting]);

  const handleGoalkeeperChange = useCallback((index: number, isGoalkeeper: boolean) => {
    const newPlayers = [...settings.players];
    newPlayers[index] = { ...newPlayers[index], isGoalkeeper };
    updateSetting('players', newPlayers);
  }, [settings.players, updateSetting]);

  const addPlayer = useCallback(() => {
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: `Spieler ${settings.players.length + 1}`,
      isGoalkeeper: false,
    };
    const newPlayers = [...settings.players, newPlayer];
    updateSetting('players', newPlayers);
    setPlayerText(playersToText(newPlayers));
  }, [settings.players, updateSetting]);

  const removePlayer = useCallback((index: number) => {
    const newPlayers = settings.players.filter((_, i) => i !== index);
    updateSetting('players', newPlayers);
    setPlayerText(playersToText(newPlayers));
  }, [settings.players, updateSetting]);

  const goalkeeperCount = settings.players.filter(p => p.isGoalkeeper).length;
  const playersNeeded = getPlayersNeededPerRound(settings.teamsPerRound, settings.playersPerTeam);
  const matchesPerRound = getMatchesPerRound(settings.teamsPerRound);

  return (
    <div className="settings-form">
      <h2>⚙️ Turnier-Einstellungen</h2>

      {/* Info Box */}
      <div className="info-box">
        <strong>Berechnung:</strong> {settings.teamsPerRound} Teams × {settings.playersPerTeam} Spieler = 
        <strong> {playersNeeded} Spieler pro Runde</strong> | 
        {matchesPerRound} Spiele pro Runde auf {Math.min(settings.fieldsCount, matchesPerRound)} Feld(ern)
      </div>

      {/* Spieler-Sektion */}
      <section className="form-section">
        <div className="section-header">
          <h3>👥 Spieler ({settings.players.length}){goalkeeperCount > 0 && <span className="gk-count"> • 🧤 {goalkeeperCount} Torleute</span>}</h3>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => setPlayerTextMode(!playerTextMode)}
          >
            {playerTextMode ? '📝 Liste' : '📋 Text-Import'}
          </button>
        </div>

        {playerTextMode ? (
          <div className="player-text-input">
            <textarea
              value={playerText}
              onChange={(e) => handlePlayerTextChange(e.target.value)}
              placeholder="Spielernamen eingeben (ein Name pro Zeile oder kommagetrennt)"
              rows={10}
            />
            <small>Ein Name pro Zeile oder durch Komma/Semikolon getrennt. Tormann-Status muss danach in der Liste gesetzt werden.</small>
          </div>
        ) : (
          <div className="player-list">
            {settings.players.map((player, index) => (
              <div key={player.id} className="player-item">
                <span className="player-number">{index + 1}.</span>
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  placeholder={`Spieler ${index + 1}`}
                />
                <button
                  type="button"
                  className={`btn-gk ${player.isGoalkeeper ? 'active' : ''}`}
                  onClick={() => handleGoalkeeperChange(index, !player.isGoalkeeper)}
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

      {/* Turnier-Parameter */}
      <section className="form-section">
        <h3>🏆 Turnier-Parameter</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="playersPerTeam">Spieler pro Team</label>
            <input
              id="playersPerTeam"
              type="number"
              min={1}
              max={11}
              value={settings.playersPerTeam}
              onChange={(e) => updateSetting('playersPerTeam', parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="teamsPerRound">Teams pro Runde</label>
            <input
              id="teamsPerRound"
              type="number"
              min={2}
              max={20}
              step={2}
              value={settings.teamsPerRound}
              onChange={(e) => updateSetting('teamsPerRound', parseInt(e.target.value) || 2)}
            />
            <small>Muss gerade sein</small>
          </div>

          <div className="form-group">
            <label htmlFor="roundsCount">Anzahl Runden</label>
            <input
              id="roundsCount"
              type="number"
              min={1}
              max={100}
              value={settings.roundsCount}
              onChange={(e) => updateSetting('roundsCount', parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fieldsCount">Anzahl Spielfelder</label>
            <input
              id="fieldsCount"
              type="number"
              min={1}
              max={10}
              value={settings.fieldsCount}
              onChange={(e) => updateSetting('fieldsCount', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </section>

      {/* Erweiterte Optionen */}
      <section className="form-section">
        <h3>🎛️ Erweiterte Optionen</h3>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.allowByes}
              onChange={(e) => updateSetting('allowByes', e.target.checked)}
            />
            <span>Pausen erlauben (Byes)</span>
          </label>
          <small>
            Wenn aktiviert, können mehr Spieler als benötigt teilnehmen. 
            Überschüssige Spieler pausieren pro Runde.
          </small>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.distributeGoalkeepers}
              onChange={(e) => updateSetting('distributeGoalkeepers', e.target.checked)}
            />
            <span>🧤 Torleute verteilen</span>
          </label>
          <small>
            Wenn aktiviert, wird maximal ein Tormann pro Team eingeteilt.
            {goalkeeperCount > settings.teamsPerRound && (
              <span className="gk-warning">
                {' '}⚠️ Mehr Torleute ({goalkeeperCount}) als Teams ({settings.teamsPerRound}) — 
                manche Teams werden mehrere haben.
              </span>
            )}
            {goalkeeperCount === 0 && (
              <span className="gk-hint">
                {' '}Markiere Spieler mit 🧤 in der Liste als Torleute.
              </span>
            )}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="fairnessMode">Fairness-Modus</label>
          <select
            id="fairnessMode"
            value={settings.fairnessMode}
            onChange={(e) => updateSetting('fairnessMode', e.target.value as FairnessMode)}
          >
            <option value="maxCoverage">
              Maximale Abdeckung (viele verschiedene Mit-/Gegenspieler)
            </option>
            <option value="balancedMinutes">
              Ausgewogene Einsätze (gleiche Spielzeit für alle)
            </option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="seed">Seed (optional)</label>
          <input
            id="seed"
            type="number"
            value={settings.seed ?? ''}
            onChange={(e) => updateSetting('seed', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Zufällig"
          />
          <small>Für reproduzierbare Turnierplanungen</small>
        </div>
      </section>

      {/* Punkte-Einstellungen */}
      <section className="form-section">
        <h3>🏅 Punkte-System</h3>

        <div className="points-grid">
          <div className="points-card">
            <div className="points-card-header">
              <span className="points-emoji">🏆</span>
              <span>Sieg</span>
            </div>
            <input
              type="number"
              min={0}
              max={10}
              value={settings.pointSettings.pointsForWin}
              onChange={(e) => updatePointSetting('pointsForWin', parseInt(e.target.value) || 0)}
            />
            <small>Punkte</small>
          </div>

          <div className="points-card">
            <div className="points-card-header">
              <span className="points-emoji">🤝</span>
              <span>Unentschieden</span>
            </div>
            <input
              type="number"
              min={0}
              max={10}
              value={settings.pointSettings.pointsForDraw}
              onChange={(e) => updatePointSetting('pointsForDraw', parseInt(e.target.value) || 0)}
            />
            <small>Punkte</small>
          </div>

          <div className="points-card">
            <div className="points-card-header">
              <span className="points-emoji">❌</span>
              <span>Niederlage</span>
            </div>
            <input
              type="number"
              min={0}
              max={10}
              value={settings.pointSettings.pointsForLoss}
              onChange={(e) => updatePointSetting('pointsForLoss', parseInt(e.target.value) || 0)}
            />
            <small>Punkte</small>
          </div>
        </div>

        <div className="bonus-options">
          <div className="bonus-option">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.pointSettings.enableTeamGoalPoints}
                onChange={(e) => updatePointSetting('enableTeamGoalPoints', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                <span className="toggle-emoji">⚽</span>
                Team-Tore belohnen
              </span>
            </label>
            {settings.pointSettings.enableTeamGoalPoints && (
              <div className="bonus-value">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={settings.pointSettings.pointsPerTeamGoal}
                  onChange={(e) => updatePointSetting('pointsPerTeamGoal', parseFloat(e.target.value) || 0)}
                />
                <span>Punkte pro Tor</span>
              </div>
            )}
          </div>

          <div className="bonus-option">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.pointSettings.enableScorerPoints}
                onChange={(e) => updatePointSetting('enableScorerPoints', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                <span className="toggle-emoji">🎯</span>
                Torschützen belohnen
              </span>
            </label>
            {settings.pointSettings.enableScorerPoints && (
              <div className="bonus-value">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={settings.pointSettings.pointsPerScorerGoal}
                  onChange={(e) => updatePointSetting('pointsPerScorerGoal', parseFloat(e.target.value) || 0)}
                />
                <span>Punkte pro persönlichem Tor</span>
              </div>
            )}
            {settings.pointSettings.enableScorerPoints && (
              <small className="bonus-hint">Torschützen können im Spielplan eingetragen werden</small>
            )}
          </div>

          <div className="bonus-option">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.pointSettings.enableCleanSheet}
                onChange={(e) => updatePointSetting('enableCleanSheet', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                <span className="toggle-emoji">🧤</span>
                Zu-Null-Spiele (Clean Sheet)
              </span>
            </label>
            {settings.pointSettings.enableCleanSheet && (
              <div className="bonus-value">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={settings.pointSettings.pointsForCleanSheet}
                  onChange={(e) => updatePointSetting('pointsForCleanSheet', parseFloat(e.target.value) || 0)}
                />
                <span>Bonus-Punkte</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Validierung */}
      {validation.errors.length > 0 && (
        <div className="validation-errors">
          <strong>❌ Fehler:</strong>
          <ul>
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="validation-warnings">
          <strong>⚠️ Hinweise:</strong>
          <ul>
            {validation.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Aktions-Buttons */}
      <div className="form-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={onGenerate}
          disabled={!validation.isValid}
        >
          🎲 {hasSchedule ? 'Neu Generieren' : 'Turnierplan Generieren'}
        </button>
        
        <button
          type="button"
          className="btn-secondary"
          onClick={onReset}
        >
          🔄 Zurücksetzen
        </button>
      </div>
    </div>
  );
};
