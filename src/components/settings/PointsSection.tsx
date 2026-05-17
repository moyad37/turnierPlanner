// ============================================
// Punkte-System Sektion der Einstellungen
// ============================================

import React, { useCallback } from 'react';
import type { PointSettings } from '../../types';

interface PointsSectionProps {
  pointSettings: PointSettings;
  onChange: (settings: PointSettings) => void;
}

export const PointsSection: React.FC<PointsSectionProps> = ({
  pointSettings,
  onChange,
}) => {
  const update = useCallback(
    <K extends keyof PointSettings>(key: K, value: PointSettings[K]) => {
      onChange({ ...pointSettings, [key]: value });
    },
    [pointSettings, onChange]
  );

  return (
    <section className="form-section">
      <h3>🏅 Punkte-System</h3>

      {/* Basissätze */}
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
            value={pointSettings.pointsForWin}
            onChange={(e) => update('pointsForWin', parseInt(e.target.value) || 0)}
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
            value={pointSettings.pointsForDraw}
            onChange={(e) => update('pointsForDraw', parseInt(e.target.value) || 0)}
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
            value={pointSettings.pointsForLoss}
            onChange={(e) => update('pointsForLoss', parseInt(e.target.value) || 0)}
          />
          <small>Punkte</small>
        </div>
      </div>

      {/* Bonus-Optionen */}
      <div className="bonus-options">
        <BonusOption
          emoji="⚽"
          label="Team-Tore belohnen"
          enabled={pointSettings.enableTeamGoalPoints}
          onToggle={(v) => update('enableTeamGoalPoints', v)}
        >
          {pointSettings.enableTeamGoalPoints && (
            <div className="bonus-value">
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={pointSettings.pointsPerTeamGoal}
                onChange={(e) => update('pointsPerTeamGoal', parseFloat(e.target.value) || 0)}
              />
              <span>Punkte pro Tor</span>
            </div>
          )}
        </BonusOption>

        <BonusOption
          emoji="🎯"
          label="Torschützen belohnen"
          enabled={pointSettings.enableScorerPoints}
          onToggle={(v) => update('enableScorerPoints', v)}
        >
          {pointSettings.enableScorerPoints && (
            <>
              <div className="bonus-value">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={pointSettings.pointsPerScorerGoal}
                  onChange={(e) => update('pointsPerScorerGoal', parseFloat(e.target.value) || 0)}
                />
                <span>Punkte pro persönlichem Tor</span>
              </div>
              <small className="bonus-hint">
                Torschützen können im Spielplan eingetragen werden
              </small>
            </>
          )}
        </BonusOption>

        <BonusOption
          emoji="🧤"
          label="Zu-Null-Spiele (Clean Sheet)"
          enabled={pointSettings.enableCleanSheet}
          onToggle={(v) => update('enableCleanSheet', v)}
        >
          {pointSettings.enableCleanSheet && (
            <div className="bonus-value">
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={pointSettings.pointsForCleanSheet}
                onChange={(e) => update('pointsForCleanSheet', parseFloat(e.target.value) || 0)}
              />
              <span>Bonus-Punkte</span>
            </div>
          )}
        </BonusOption>
      </div>
    </section>
  );
};

// Kleiner Hilfs-Wrapper für Toggle-Optionen
interface BonusOptionProps {
  emoji: string;
  label: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  children?: React.ReactNode;
}

const BonusOption: React.FC<BonusOptionProps> = ({
  emoji,
  label,
  enabled,
  onToggle,
  children,
}) => (
  <div className="bonus-option">
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span className="toggle-slider" />
      <span className="toggle-label">
        <span className="toggle-emoji">{emoji}</span>
        {label}
      </span>
    </label>
    {children}
  </div>
);
