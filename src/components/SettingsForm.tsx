// ============================================
// Settings Form Komponente
// ============================================

import React, { useCallback } from 'react';
import type { Settings, PointSettings } from '../types';
import { validateSettings } from '../lib/validation';
import { PlayersSection } from './settings/PlayersSection';
import { TournamentParamsSection } from './settings/TournamentParamsSection';
import { PointsSection } from './settings/PointsSection';

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
  const validation = validateSettings(settings);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      onSettingsChange({ ...settings, [key]: value });
    },
    [settings, onSettingsChange]
  );

  return (
    <div className="settings-form">
      <h2>⚙️ Turnier-Einstellungen</h2>

      <PlayersSection
        players={settings.players}
        ageGroupEnabled={settings.ageGroupSettings?.enabled ?? false}
        onChange={(players) => updateSetting('players', players)}
      />

      <TournamentParamsSection
        settings={settings}
        onChange={updateSetting}
      />

      <PointsSection
        pointSettings={settings.pointSettings}
        onChange={(ps: PointSettings) => updateSetting('pointSettings', ps)}
      />

      {/* Validierungsfehler */}
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

        <button type="button" className="btn-secondary" onClick={onReset}>
          🔄 Zurücksetzen
        </button>
      </div>
    </div>
  );
};