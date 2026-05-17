// ============================================
// Holländisches Turnier - Hauptkomponente
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { useTournament } from './hooks/useTournament';
import { useLiveSession } from './hooks/useLiveSession';
import { SettingsForm } from './components/SettingsForm';
import { ScheduleTab } from './components/ScheduleTab';
import { PlayersTab } from './components/PlayersTab';
import { ExportButtons } from './components/ExportButtons';
import { TournamentArchive } from './components/TournamentArchive';
import { UnsavedChangesModal } from './components/UnsavedChangesModal';
import { AuthButton } from './components/AuthButton';
import { SessionPanel } from './components/session/SessionPanel';
import { SubDeviceApp } from './components/SubDeviceApp';
import { onAuthChange } from './lib/firebase';
import type { User } from 'firebase/auth';
import type { Settings, Schedule } from './types';
import './App.css';

/** Liest den ?session= URL-Parameter (Sub-Gerät-Modus). */
function getSessionIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('session');
}

/** Findet roundIndex + matchIndex anhand der Match-ID. */
function findMatchIndices(
  schedule: Schedule,
  matchId: string
): { roundIndex: number; matchIndex: number } | null {
  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      if (match.id === matchId) {
        return { roundIndex: round.index, matchIndex: match.matchIndex };
      }
    }
  }
  return null;
}

type TabType = 'archive' | 'settings' | 'schedule' | 'players';

function AppContent() {
  const { theme, setTheme, language, setLanguage, t } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('archive');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [archiveKey, setArchiveKey] = useState(0);
  const [showSessionPanel, setShowSessionPanel] = useState(false);

  // Auth-State beobachten
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => setAuthUser(user));
    return unsubscribe;
  }, []);

  // Pending-Action für das Modal (wird gesetzt, wenn unsaved changes + Wechsel)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const {
    settings,
    setSettings,
    schedule,
    generationTime,
    currentTournamentId,
    currentTournamentName,
    hasUnsavedChanges,
    playerStats,
    scheduleAnalysis,
    handleGenerate,
    handleReset,
    handleNewTournament,
    handleLoadTournament,
    handleScoreChange,
    applyAllRemoteResults,
    handlePDFExport,
    quickSave,
    saveAsNew,
    markAsSaved,
  } = useTournament();

  // ── Live-Session (Admin) ──
  const {
    session,
    devices,
    isStarting,
    startError,
    deviceId: adminDeviceId,
    startSession,
    stopSession,
    syncSchedule,
    updateDefaultPermissions,
    updateDevicePerms,
    revokeDevice,
    restoreDevice,
    submitAdminResult,
  } = useLiveSession({ onRemoteResults: applyAllRemoteResults });

  // Spielplan mit Session synchronisieren (debounced 1 s, spart Firestore-Writes)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!session || !schedule) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncSchedule(schedule), 1000);
    return () => clearTimeout(syncTimerRef.current);
  }, [schedule]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ergebnis eintragen – lokal + wenn Session aktiv auch zu Firestore */
  const handleScoreChangeWithSync = useCallback(
    (
      matchId: string,
      scoreA: number | null,
      scoreB: number | null,
      scorersA?: Record<string, number>,
      scorersB?: Record<string, number>
    ) => {
      handleScoreChange(matchId, scoreA, scoreB, scorersA, scorersB);
      if (session && scoreA !== null && scoreB !== null && schedule) {
        const idx = findMatchIndices(schedule, matchId);
        if (idx) {
          submitAdminResult(
            idx.roundIndex,
            idx.matchIndex,
            scoreA,
            scoreB,
            scorersA,
            scorersB
          );
        }
      }
    },
    [handleScoreChange, session, schedule, submitAdminResult]
  );

  // Prüft unsaved changes, zeigt Modal oder führt Aktion direkt aus
  const withUnsavedCheck = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        setPendingAction(() => action);
      } else {
        action();
      }
    },
    [hasUnsavedChanges]
  );

  function onGenerate() {
    const newSchedule = handleGenerate();
    if (newSchedule) setActiveTab('schedule');
  }

  function onReset() {
    handleReset();
    setActiveTab('settings');
  }

  function onNewTournament() {
    withUnsavedCheck(() => {
      handleNewTournament();
      setActiveTab('settings');
    });
  }

  function onLoadTournament(
    loadedSettings: Settings,
    loadedSchedule: Schedule | null,
    id: string,
    name: string
  ) {
    withUnsavedCheck(() => {
      handleLoadTournament(loadedSettings, loadedSchedule, id, name);
      setActiveTab(loadedSchedule ? 'schedule' : 'settings');
    });
  }

  // Modal: Speichern & dann Pending-Action ausführen
  async function handleModalSave(newName?: string) {
    if (newName) {
      await saveAsNew(newName);
    } else {
      await quickSave();
    }
    pendingAction?.();
    setPendingAction(null);
  }

  // Modal: Verwerfen & Pending-Action ausführen
  function handleModalDiscard() {
    pendingAction?.();
    setPendingAction(null);
  }

  // Quick-Save aus der Status-Bar
  async function handleQuickSave(name?: string) {
    if (currentTournamentId) {
      await quickSave();
    } else if (name) {
      await saveAsNew(name);
    }
  }

  return (
    <div className="app" data-theme={theme}>
      {/* Unsaved Changes Modal */}
      {pendingAction && (
        <UnsavedChangesModal
          tournamentName={currentTournamentName}
          hasSavedId={!!currentTournamentId}
          onSave={handleModalSave}
          onDiscard={handleModalDiscard}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-main">
          <h1>🏆 {t('appTitle')}</h1>
          <p className="subtitle">{t('appSubtitle')}</p>
        </div>

        <div className="header-controls">
          <button
            type="button"
            className="header-button"
            onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
            title={t('language')}
          >
            {language === 'de' ? '🇩🇪' : '🇬🇧'}
          </button>

          <button
            type="button"
            className="header-button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={t('theme')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {schedule && (
            <button
              type="button"
              className="header-button"
              onClick={handlePDFExport}
              title={t('pdfExport')}
            >
              📄
            </button>
          )}

          <button
            type="button"
            className={`header-button${session ? ' session-active' : ''}`}
            onClick={() => setShowSessionPanel(true)}
            title="Live-Session (Mehrere Geräte)"
          >
            📡{session ? ' LIVE' : ''}
          </button>

          <AuthButton
            user={authUser}
            onAuthChange={() => setArchiveKey(k => k + 1)}
          />
        </div>
      </header>

      {/* Live-Session Panel */}
      {showSessionPanel && (
        <SessionPanel
          session={session}
          devices={devices}
          isStarting={isStarting}
          startError={startError}
          adminDeviceId={adminDeviceId}
          settings={settings}
          schedule={schedule}
          tournamentName={currentTournamentName || 'Turnier'}
          onStartSession={startSession}
          onStopSession={stopSession}
          onUpdateDefaultPermissions={updateDefaultPermissions}
          onUpdateDevicePermissions={updateDevicePerms}
          onRevokeDevice={revokeDevice}
          onRestoreDevice={restoreDevice}
          onClose={() => setShowSessionPanel(false)}
        />
      )}

      {/* Turnier-Status-Bar */}
      <TournamentStatusBar
        name={currentTournamentName}
        hasUnsavedChanges={hasUnsavedChanges}
        hasSavedId={!!currentTournamentId}
        onQuickSave={handleQuickSave}
      />

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <button
          type="button"
          className={`tab-button ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          📁 {t('archive')}
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ {t('settings')}
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          disabled={!schedule}
        >
          📅 {t('schedule')}
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          📊 {t('statistics')}
        </button>
      </nav>

      {/* Export-Leiste */}
      {schedule && activeTab !== 'archive' && (
        <ExportButtons
          schedule={schedule}
          players={settings.players}
          stats={playerStats}
        />
      )}

      {/* Tab-Inhalt */}
      <main className="tab-content">
        {activeTab === 'archive' && (
          <TournamentArchive
            key={archiveKey}
            currentSettings={settings}
            currentSchedule={schedule}
            currentTournamentId={currentTournamentId}
            onLoadTournament={onLoadTournament}
            onNewTournament={onNewTournament}
            onSaved={markAsSaved}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsForm
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={onGenerate}
            onReset={onReset}
            hasSchedule={!!schedule}
          />
        )}

        {activeTab === 'schedule' && schedule && (
          <ScheduleTab
            schedule={schedule}
            players={settings.players}
            pointSettings={settings.pointSettings}
            onScoreChange={handleScoreChangeWithSync}
          />
        )}

        {activeTab === 'players' && (
          <PlayersTab
            stats={playerStats}
            schedule={schedule}
            pointSettings={settings.pointSettings}
          />
        )}
      </main>

      {/* Footer */}
      {schedule && (
        <footer className="app-footer">
          <div className="generation-info">
            {generationTime !== null && (
              <span>⚡ Generiert in {generationTime}ms</span>
            )}
            <span>🎲 Seed: {schedule.seed}</span>
            {scheduleAnalysis && (
              <>
                <span title="Wie oft Spieler zusammen im Team waren">
                  👥 Mitspieler: {scheduleAnalysis.teammateStats.min}–{scheduleAnalysis.teammateStats.max}×
                </span>
                <span title="Wie oft Spieler gegeneinander gespielt haben">
                  ⚔️ Gegner: {scheduleAnalysis.opponentStats.min}–{scheduleAnalysis.opponentStats.max}×
                </span>
                <span title="Anzahl Spiele pro Spieler">
                  🎮 Einsätze: {scheduleAnalysis.gamesPlayedStats.min}–{scheduleAnalysis.gamesPlayedStats.max}
                </span>
              </>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

// ============================================
// Turnier-Status-Bar
// ============================================
interface StatusBarProps {
  name: string;
  hasUnsavedChanges: boolean;
  hasSavedId: boolean;
  onQuickSave: (name?: string) => void;
}

function TournamentStatusBar({ name, hasUnsavedChanges, hasSavedId, onQuickSave }: StatusBarProps) {
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');

  function handleSaveClick() {
    if (hasSavedId) {
      onQuickSave();
    } else {
      setNameInput(name || `Turnier ${new Date().toLocaleDateString('de-DE')}`);
      setShowNamePrompt(true);
    }
  }

  function confirmNewName() {
    if (nameInput.trim()) {
      onQuickSave(nameInput.trim());
      setShowNamePrompt(false);
    }
  }

  return (
    <div className={`tournament-status-bar${hasUnsavedChanges ? ' has-unsaved' : ''}`}>
      <div className="status-bar-info">
        <span className="status-bar-label">📂 Aktuelles Turnier:</span>
        <span className="status-bar-name">
          {name || 'Neues Turnier'}
        </span>
        {hasUnsavedChanges ? (
          <span className="status-bar-badge unsaved">● Ungespeichert</span>
        ) : (
          <span className="status-bar-badge saved">✓ Gespeichert</span>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="status-bar-actions">
          {showNamePrompt ? (
            <>
              <input
                className="status-bar-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewName();
                  if (e.key === 'Escape') setShowNamePrompt(false);
                }}
                autoFocus
                placeholder="Turniername..."
              />
              <button type="button" className="btn-save-now" onClick={confirmNewName}>
                ✓
              </button>
              <button type="button" className="btn-cancel-save" onClick={() => setShowNamePrompt(false)}>
                ✕
              </button>
            </>
          ) : (
            <button type="button" className="btn-save-now" onClick={handleSaveClick}>
              💾 Jetzt speichern
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Sub-Gerät-Modus: URL-Parameter prüfen (außerhalb der Hook-Kette)
  const urlSessionId = getSessionIdFromUrl();
  if (urlSessionId) {
    return (
      <AppProvider>
        <SubDeviceApp initialSessionId={urlSessionId} />
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

