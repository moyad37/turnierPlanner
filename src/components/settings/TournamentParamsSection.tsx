// ============================================
// Turnier-Parameter Sektion der Einstellungen
// ============================================

import React, { useCallback } from 'react';
import type { Settings, FairnessMode, AgeGroupSettings } from '../../types';
import { getPlayersNeededPerRound, getMatchesPerRound } from '../../lib/validation';

interface TournamentParamsSectionProps {
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const TournamentParamsSection: React.FC<TournamentParamsSectionProps> = ({
  settings,
  onChange,
}) => {
  const updateAgeGroup = useCallback(
    <K extends keyof AgeGroupSettings>(key: K, value: AgeGroupSettings[K]) => {
      onChange('ageGroupSettings', { enabled: false, maxAgeDifference: 5, ...settings.ageGroupSettings, [key]: value });
    },
    [settings.ageGroupSettings, onChange]
  );

  const playersNeeded = getPlayersNeededPerRound(
    settings.teamsPerRound,
    settings.playersPerTeam
  );
  const matchesPerRound = getMatchesPerRound(settings.teamsPerRound);
  const extraPlayers = settings.players.length - playersNeeded;
  const substituteCount =
    !settings.allowByes && extraPlayers > 0 ? extraPlayers : 0;
  const goalkeeperCount = settings.players.filter((p) => p.isGoalkeeper).length;

  return (
    <>
      {/* Berechnungs-Infobox */}
      <div className="info-box">
        <strong>Berechnung:</strong> {settings.teamsPerRound} Teams ×{' '}
        {settings.playersPerTeam} Spieler =
        <strong> {playersNeeded} Spieler pro Runde</strong> |{' '}
        {matchesPerRound} Spiele pro Runde auf{' '}
        {Math.min(settings.fieldsCount, matchesPerRound)} Feld(ern)
        {substituteCount > 0 && (
          <span className="info-substitute">
            {' '}—
            <strong> {substituteCount} Auswechselspieler</strong> (🔄):{' '}
            {settings.players.length} Spieler ÷ {settings.teamsPerRound} Teams
            = {Math.floor(settings.players.length / settings.teamsPerRound)}–
            {Math.ceil(settings.players.length / settings.teamsPerRound)}{' '}
            Spieler pro Team
          </span>
        )}
      </div>

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
              onChange={(e) =>
                onChange('playersPerTeam', parseInt(e.target.value) || 1)
              }
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
              onChange={(e) =>
                onChange('teamsPerRound', parseInt(e.target.value) || 2)
              }
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
              onChange={(e) =>
                onChange('roundsCount', parseInt(e.target.value) || 1)
              }
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
              onChange={(e) =>
                onChange('fieldsCount', parseInt(e.target.value) || 1)
              }
            />
          </div>
        </div>
      </section>

      {/* Altersgruppen */}
      <section className="form-section">
        <h3>👶 Altersgruppen-Prüfung</h3>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.ageGroupSettings?.enabled ?? false}
              onChange={(e) => updateAgeGroup('enabled', e.target.checked)}
            />
            <span>Altersgruppen-Prüfung aktivieren</span>
          </label>
          <small>
            Verhindert, dass Spieler mit zu großem Altersunterschied
            gegeneinander spielen. Wenn aktiviert, erscheint ein
            Alterseingabe-Feld pro Spieler.
          </small>
        </div>

        {settings.ageGroupSettings?.enabled && (
          <>
            <div className="form-group">
              <label htmlFor="maxAgeDifference">
                Max. Altersunterschied (Jahre)
              </label>
              <input
                id="maxAgeDifference"
                type="number"
                min={1}
                max={10}
                value={settings.ageGroupSettings.maxAgeDifference}
                onChange={(e) =>
                  updateAgeGroup(
                    'maxAgeDifference',
                    parseInt(e.target.value) || 2
                  )
                }
              />
              <small>
                Spieler mit mehr als{' '}
                {settings.ageGroupSettings.maxAgeDifference} Jahr(en)
                Unterschied sollen nicht gegeneinander spielen.
              </small>
            </div>
            <AgeGroupOverview
              players={settings.players}
              maxDiff={settings.ageGroupSettings.maxAgeDifference}
              playersPerTeam={settings.playersPerTeam}
            />
          </>
        )}
      </section>

      {/* Erweiterte Optionen */}
      <section className="form-section">
        <h3>🎛️ Erweiterte Optionen</h3>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.allowByes}
              onChange={(e) => onChange('allowByes', e.target.checked)}
            />
            <span>Pausen erlauben (Byes)</span>
          </label>
          <small>
            {settings.allowByes ? (
              'Überschüssige Spieler pausieren pro Runde (Bye) — sie bekommen keinen Einsatz.'
            ) : (
              <>
                Alle Spieler spielen jede Runde.
                {substituteCount > 0 ? (
                  <>
                    {' '}
                    🔄{' '}
                    <strong>
                      {substituteCount} Spieler werden als Auswechselspieler
                      eingeteilt
                    </strong>{' '}
                    und rotieren fair durch alle Teams. 👍
                  </>
                ) : (
                  ' Überschüssige Spieler werden automatisch als Auswechselspieler (🔄) zugeteilt.'
                )}
              </>
            )}
          </small>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.distributeGoalkeepers}
              onChange={(e) =>
                onChange('distributeGoalkeepers', e.target.checked)
              }
            />
            <span>🧤 Torleute verteilen</span>
          </label>
          <small>
            Wenn aktiviert, wird maximal ein Tormann pro Team eingeteilt.
            {goalkeeperCount > settings.teamsPerRound && (
              <span className="gk-warning">
                {' '}
                ⚠️ Mehr Torleute ({goalkeeperCount}) als Teams (
                {settings.teamsPerRound}) — manche Teams werden mehrere haben.
              </span>
            )}
            {goalkeeperCount === 0 && (
              <span className="gk-hint">
                {' '}
                Markiere Spieler mit 🧤 in der Liste als Torleute.
              </span>
            )}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="fairnessMode">Fairness-Modus</label>
          <select
            id="fairnessMode"
            value={settings.fairnessMode}
            onChange={(e) =>
              onChange('fairnessMode', e.target.value as FairnessMode)
            }
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
            onChange={(e) =>
              onChange('seed', e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="Zufällig"
          />
          <small>Für reproduzierbare Turnierplanungen</small>
        </div>
      </section>
    </>
  );
};

// Altersgruppen-Übersicht
interface AgeGroupOverviewProps {
  players: Settings['players'];
  maxDiff: number;
  playersPerTeam: number;
}

const AgeGroupOverview: React.FC<AgeGroupOverviewProps> = ({
  players,
  maxDiff,
  playersPerTeam,
}) => {
  const playersWithAge = players.filter((p) => typeof p.age === 'number');

  if (playersWithAge.length === 0) {
    return (
      <div className="age-group-info">
        <strong>📊 Altersübersicht:</strong>
        <span className="age-group-hint">
          {' '}
          Noch kein Spieler hat ein Alter angegeben.
        </span>
      </div>
    );
  }

  const groupMap = playersWithAge.reduce((map, p) => {
    const groupKey = Math.floor(p.age! / maxDiff);
    const ageStart = groupKey * maxDiff;
    const label = `${ageStart}–${ageStart + maxDiff - 1} Jahre`;
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p.name);
    return map;
  }, new Map<string, string[]>());

  return (
    <div className="age-group-info">
      <strong>📊 Altersübersicht:</strong>
      <ul className="age-group-list">
        {Array.from(groupMap.entries()).map(([label, names]) => (
          <li key={label}>
            <strong>{label}</strong>: {names.join(', ')}
            {names.length < playersPerTeam && (
              <span className="age-group-warning">
                {' '}
                ⚠️ Zu wenige Spieler für ein eigenständiges Team!
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
