// ============================================
// SubDeviceApp – Komplette Sub-Gerät-Ansicht
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSubDevice } from '../hooks/useSubDevice';
import { JoinSessionView } from './session/JoinSessionView';
import { LiveTable } from './LiveTable';
import { calculatePlayerStats } from '../lib/stats';
import type { Match, Player } from '../types';

interface SubDeviceAppProps {
  /** Session-ID aus URL-Parameter – null wenn noch kein Code gescannt */
  initialSessionId: string | null;
}

type SubTab = 'fields' | 'schedule' | 'table';

export function SubDeviceApp({ initialSessionId }: SubDeviceAppProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const {
    status,
    session,
    settings,
    schedule,
    effectivePermissions,
    submitMatchResult,
  } = useSubDevice(sessionId);

  const [activeTab, setActiveTab] = useState<SubTab>('fields');

  // Wenn noch keine Session-ID bekannt: Code-Eingabe anzeigen
  if (!sessionId) {
    return (
      <JoinSessionView
        onJoin={(id) => {
          // URL aktualisieren für direkten Link
          const url = new URL(window.location.href);
          url.searchParams.set('session', id);
          window.history.replaceState(null, '', url.toString());
          setSessionId(id);
        }}
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="sub-device-loading">
        <div className="loading-spinner" />
        <p>Verbinde mit Session…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="sub-device-error">
        <h2>Session nicht gefunden</h2>
        <p>Die Session existiert nicht oder der Code ist abgelaufen.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setSessionId(null)}
        >
          Anderen Code eingeben
        </button>
      </div>
    );
  }

  if (status === 'closed') {
    return (
      <div className="sub-device-error">
        <h2>Session beendet</h2>
        <p>Der Veranstalter hat die Live-Session beendet.</p>
      </div>
    );
  }

  if (status === 'revoked') {
    return (
      <div className="sub-device-error">
        <h2>Zugriff gesperrt</h2>
        <p>Dein Gerät wurde vom Veranstalter gesperrt. Bitte wende dich an den Veranstalter.</p>
      </div>
    );
  }

  // Active state
  const players = settings?.players ?? [];
  const stats =
    schedule && settings
      ? calculatePlayerStats(players, schedule, settings.pointSettings)
      : [];

  return (
    <div className="sub-device-app">
      <header className="sub-device-header">
        <div className="sub-device-header-main">
          <h1>🏆 {session?.tournamentName ?? 'Turnier'}</h1>
          <span className="sub-device-live-badge">● LIVE</span>
        </div>
      </header>

      {/* Tab-Navigation */}
      <nav className="tab-nav">
        <button
          type="button"
          className={`tab-button${activeTab === 'fields' ? ' active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          ⚽ Ergebnisse
        </button>
        {effectivePermissions.canViewSchedule && (
          <button
            type="button"
            className={`tab-button${activeTab === 'schedule' ? ' active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Spielplan
          </button>
        )}
        {effectivePermissions.canViewLiveTable && (
          <button
            type="button"
            className={`tab-button${activeTab === 'table' ? ' active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📊 Tabelle
          </button>
        )}
      </nav>

      <main className="tab-content">
        {activeTab === 'fields' && schedule && (
          <FieldResultsView
            schedule={schedule}
            players={players}
            allowedFields={effectivePermissions.allowedFields}
            showPlayerAssignments={effectivePermissions.canViewPlayerAssignments}
            onSubmitResult={submitMatchResult}
          />
        )}

        {activeTab === 'schedule' && schedule && effectivePermissions.canViewSchedule && (
          <FullScheduleView schedule={schedule} players={players} />
        )}

        {activeTab === 'table' && effectivePermissions.canViewLiveTable && (
          <div className="sub-device-table-wrapper">
            <LiveTable stats={stats} />
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// Ergebnis-Eingabe für erlaubte Felder
// ============================================

interface FieldResultsViewProps {
  schedule: ReturnType<typeof useSubDevice>['schedule'];
  players: Player[];
  allowedFields: number[] | null;
  showPlayerAssignments: boolean;
  onSubmitResult: (
    roundIndex: number,
    matchIndex: number,
    scoreA: number,
    scoreB: number,
    scorersA?: Record<string, number>,
    scorersB?: Record<string, number>
  ) => Promise<void>;
}

function FieldResultsView({
  schedule,
  players,
  allowedFields,
  showPlayerAssignments,
  onSubmitResult,
}: FieldResultsViewProps) {
  if (!schedule) return <p>Kein Spielplan vorhanden.</p>;

  // Alle Runden-Matches für die erlaubten Felder
  const relevantMatches: Array<{ match: Match; roundLabel: string }> = [];
  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      if (allowedFields === null || allowedFields.includes(match.fieldNumber)) {
        relevantMatches.push({
          match,
          roundLabel: `Runde ${round.index + 1}`,
        });
      }
    }
  }

  if (relevantMatches.length === 0) {
    return <p>Keine Spiele für deine Felder gefunden.</p>;
  }

  // Nach Feld gruppieren
  const byField = new Map<number, typeof relevantMatches>();
  for (const entry of relevantMatches) {
    const fieldNo = entry.match.fieldNumber;
    if (!byField.has(fieldNo)) byField.set(fieldNo, []);
    byField.get(fieldNo)!.push(entry);
  }

  return (
    <div className="field-results-view">
      {Array.from(byField.entries())
        .sort(([a], [b]) => a - b)
        .map(([fieldNo, matches]) => (
          <div key={fieldNo} className="field-section">
            <h3 className="field-section-title">Feld {fieldNo}</h3>
            {matches.map(({ match, roundLabel }) => (
              <MatchResultCard
                key={match.id}
                match={match}
                roundLabel={roundLabel}
                players={players}
                showPlayerAssignments={showPlayerAssignments}
                onSubmit={(scoreA, scoreB, scorersA, scorersB) =>
                  onSubmitResult(match.roundIndex, match.matchIndex, scoreA, scoreB, scorersA, scorersB)
                }
              />
            ))}
          </div>
        ))}
    </div>
  );
}

// ============================================
// Einzelne Match-Karte mit Ergebnis-Eingabe
// ============================================

interface MatchResultCardProps {
  match: Match;
  roundLabel: string;
  players: Player[];
  showPlayerAssignments: boolean;
  onSubmit: (scoreA: number, scoreB: number, scorersA: Record<string, number>, scorersB: Record<string, number>) => Promise<void>;
}

function getPlayerName(id: string, players: Player[]): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

function MatchResultCard({
  match,
  roundLabel,
  players,
  showPlayerAssignments,
  onSubmit,
}: MatchResultCardProps) {
  const [scoreA, setScoreA] = useState(
    match.scoreA !== null ? String(match.scoreA) : ''
  );
  const [scoreB, setScoreB] = useState(
    match.scoreB !== null ? String(match.scoreB) : ''
  );
  const [scorersA, setScorersA] = useState<Record<string, number>>(match.scorersA ?? {});
  const [scorersB, setScorersB] = useState<Record<string, number>>(match.scorersB ?? {});
  const [showScorers, setShowScorers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);

  // Flag: Torschützen wurden vom Nutzer geändert (nicht von Firestore-Sync)
  const scorersDirty = useRef(false);

  // Wenn Firestore-Ergebnis reinkommt, Felder synchronisieren
  useEffect(() => {
    setScoreA(match.scoreA !== null ? String(match.scoreA) : '');
    setScoreB(match.scoreB !== null ? String(match.scoreB) : '');
  }, [match.scoreA, match.scoreB]);
  useEffect(() => {
    setScorersA(match.scorersA ?? {});
    setScorersB(match.scorersB ?? {});
    scorersDirty.current = false; // Sync von Firestore → kein Auto-Submit nötig
  }, [match.scorersA, match.scorersB]);

  const numA = scoreA === '' ? NaN : parseInt(scoreA);
  const numB = scoreB === '' ? NaN : parseInt(scoreB);
  const hasValidScore = !isNaN(numA) && !isNaN(numB) && numA >= 0 && numB >= 0;

  const totalScorersA = Object.values(scorersA).reduce((s, g) => s + g, 0);
  const totalScorersB = Object.values(scorersB).reduce((s, g) => s + g, 0);
  const remainingA = hasValidScore ? numA - totalScorersA : 0;
  const remainingB = hasValidScore ? numB - totalScorersB : 0;

  function handleScorerAChange(playerId: string, goals: number) {
    const updated = { ...scorersA, [playerId]: goals };
    if (goals === 0) delete updated[playerId];
    scorersDirty.current = true;
    setScorersA(updated);
  }
  function handleScorerBChange(playerId: string, goals: number) {
    const updated = { ...scorersB, [playerId]: goals };
    if (goals === 0) delete updated[playerId];
    scorersDirty.current = true;
    setScorersB(updated);
  }

  // Auto-Submit: Torschützen sofort zu Firestore senden wenn Nutzer sie ändert
  // (800ms Debounce, nur wenn Score gültig und Nutzer etwas geändert hat)
  useEffect(() => {
    if (!scorersDirty.current || !hasValidScore) return;
    const timer = setTimeout(() => {
      if (!scorersDirty.current) return;
      scorersDirty.current = false;
      onSubmit(numA, numB, scorersA, scorersB).catch(console.error);
    }, 800);
    return () => clearTimeout(timer);
  }, [scorersA, scorersB]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async () => {
    if (!hasValidScore) return;
    scorersDirty.current = false;
    setSaving(true);
    try {
      await onSubmit(numA, numB, scorersA, scorersB);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [hasValidScore, numA, numB, scorersA, scorersB, onSubmit]);

  const hasResult = match.scoreA !== null && match.scoreB !== null;
  const teamANames = match.teamA.playerIds.map((id) => getPlayerName(id, players));
  const teamBNames = match.teamB.playerIds.map((id) => getPlayerName(id, players));

  return (
    <div className={`match-result-card${hasResult ? ' has-result' : ''}`}>
      <div className="match-result-card-header">
        <span className="match-round-label">{roundLabel}</span>
        {hasResult && (
          <span className="match-result-badge">
            {match.scoreA} : {match.scoreB}
          </span>
        )}
      </div>

      <div className="match-result-teams">
        <div className="match-team">
          <span className="match-team-label">Team A</span>
          {showPlayerAssignments && (
            <span className="match-team-names">{teamANames.join(', ')}</span>
          )}
        </div>
        <span className="match-vs">vs</span>
        <div className="match-team">
          <span className="match-team-label">Team B</span>
          {showPlayerAssignments && (
            <span className="match-team-names">{teamBNames.join(', ')}</span>
          )}
        </div>
      </div>

      {showPlayerAssignments && (
        <button
          type="button"
          className="match-players-toggle"
          onClick={() => setShowPlayers((v) => !v)}
        >
          {showPlayers ? '▲ Spieler verbergen' : '▼ Alle Spieler anzeigen'}
        </button>
      )}

      {showPlayers && showPlayerAssignments && (
        <div className="match-players-detail">
          <div>
            <strong>Team A:</strong>
            <ul>
              {match.teamA.playerIds.map((id) => (
                <li key={id}>{getPlayerName(id, players)}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Team B:</strong>
            <ul>
              {match.teamB.playerIds.map((id) => (
                <li key={id}>{getPlayerName(id, players)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="match-score-entry">
        <input
          className="score-input"
          type="number"
          min="0"
          max="99"
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          placeholder="0"
        />
        <span className="score-separator">:</span>
        <input
          className="score-input"
          type="number"
          min="0"
          max="99"
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          placeholder="0"
        />
        <button
          type="button"
          className={`btn btn-primary score-submit-btn${saved ? ' saved' : ''}`}
          onClick={handleSubmit}
          disabled={saving || !hasValidScore}
        >
          {saving ? '⏳' : saved ? '✓ Gespeichert' : 'Eintragen'}
        </button>
      </div>

      {/* Torschützen – auf- und zuklappbar */}
      {(numA > 0 || numB > 0) && (
        <div className="match-scorers-section">
          <button
            type="button"
            className="match-scorers-section-title"
            onClick={() => setShowScorers((v) => !v)}
          >
            ⚽ Torschützen {showScorers ? '▲' : '▼'}
          </button>
          {showScorers && (
          <div className="match-scorers-panel">
            {numA > 0 && (
              <div className="match-scorers-team">
                <div className="match-scorers-team-header">
                  Team A{remainingA > 0 ? ` – noch ${remainingA} offen` : ' ✓'}
                </div>
                {match.teamA.playerIds.map((id) => {
                  const goals = scorersA[id] ?? 0;
                  return (
                    <div key={id} className="scorer-item">
                      <span className="scorer-name">{getPlayerName(id, players)}</span>
                      <div className="scorer-controls">
                        <button type="button" className="scorer-btn minus"
                          onClick={() => handleScorerAChange(id, Math.max(0, goals - 1))}
                          disabled={goals <= 0}>−</button>
                        <span className="scorer-goals">{goals}</span>
                        <button type="button" className="scorer-btn plus"
                          onClick={() => handleScorerAChange(id, goals + 1)}
                          disabled={remainingA <= 0}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {numB > 0 && (
              <div className="match-scorers-team">
                <div className="match-scorers-team-header">
                  Team B{remainingB > 0 ? ` – noch ${remainingB} offen` : ' ✓'}
                </div>
                {match.teamB.playerIds.map((id) => {
                  const goals = scorersB[id] ?? 0;
                  return (
                    <div key={id} className="scorer-item">
                      <span className="scorer-name">{getPlayerName(id, players)}</span>
                      <div className="scorer-controls">
                        <button type="button" className="scorer-btn minus"
                          onClick={() => handleScorerBChange(id, Math.max(0, goals - 1))}
                          disabled={goals <= 0}>−</button>
                        <span className="scorer-goals">{goals}</span>
                        <button type="button" className="scorer-btn plus"
                          onClick={() => handleScorerBChange(id, goals + 1)}
                          disabled={remainingB <= 0}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Vollständiger Spielplan (Nur-Lese)
// ============================================

interface FullScheduleViewProps {
  schedule: NonNullable<ReturnType<typeof useSubDevice>['schedule']>;
  players: Player[];
}

function FullScheduleView({ schedule, players }: FullScheduleViewProps) {
  return (
    <div className="sub-schedule-view">
      {schedule.rounds.map((round) => (
        <div key={round.index} className="sub-schedule-round">
          <h3>Runde {round.index + 1}</h3>
          {round.matches.map((match) => {
            const teamA = match.teamA.playerIds
              .map((id) => getPlayerName(id, players))
              .join(', ');
            const teamB = match.teamB.playerIds
              .map((id) => getPlayerName(id, players))
              .join(', ');
            const result =
              match.scoreA !== null && match.scoreB !== null
                ? `${match.scoreA}:${match.scoreB}`
                : '–';
            return (
              <div key={match.id} className="sub-schedule-match">
                <span className="sub-schedule-field">Feld {match.fieldNumber}</span>
                <span className="sub-schedule-teams">
                  {teamA} <strong>{result}</strong> {teamB}
                </span>
              </div>
            );
          })}
          {round.byePlayerIds.length > 0 && (
            <p className="sub-schedule-bye">
              Pause: {round.byePlayerIds.map((id) => getPlayerName(id, players)).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
