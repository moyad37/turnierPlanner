// ============================================
// Holländisches Turnier - Hauptkomponente
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Settings, Schedule } from './types';
import { generateSchedule, analyzeSchedule } from './lib/generator';
import { calculatePlayerStats } from './lib/stats';
import { validateSettings } from './lib/validation';
import { 
  loadFromStorage, 
  saveToStorage, 
  getDefaultSettings, 
  clearStorage 
} from './lib/storage';
import { SettingsForm } from './components/SettingsForm';
import { ScheduleTab } from './components/ScheduleTab';
import { PlayersTab } from './components/PlayersTab';
import { ExportButtons } from './components/ExportButtons';
import { TournamentArchive } from './components/TournamentArchive';
import './App.css';

type TabType = 'archive' | 'settings' | 'schedule' | 'players';

function App() {
  // State
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = loadFromStorage();
    return stored?.settings || getDefaultSettings();
  });

  const [schedule, setSchedule] = useState<Schedule | null>(() => {
    const stored = loadFromStorage();
    return stored?.schedule || null;
  });

  const [activeTab, setActiveTab] = useState<TabType>('archive');
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [currentTournamentName, setCurrentTournamentName] = useState<string>('');

  // Persistenz: Speichere bei Änderungen
  useEffect(() => {
    saveToStorage(settings, schedule);
  }, [settings, schedule]);

  // Berechne Statistiken
  const playerStats = useMemo(() => {
    return calculatePlayerStats(settings.players, schedule, settings.pointSettings);
  }, [settings.players, schedule, settings.pointSettings]);

  // Analysiere Turnierplan (für Debug-Info)
  const scheduleAnalysis = useMemo(() => {
    if (!schedule) return null;
    return analyzeSchedule(schedule, settings.players);
  }, [schedule, settings.players]);

  // Handler: Generiere Turnierplan
  const handleGenerate = useCallback(() => {
    const validation = validateSettings(settings);
    if (!validation.isValid) {
      alert('Bitte behebe zuerst die Validierungsfehler.');
      return;
    }

    const startTime = performance.now();
    const newSchedule = generateSchedule(settings);
    const endTime = performance.now();

    setSchedule(newSchedule);
    setGenerationTime(Math.round(endTime - startTime));
    setActiveTab('schedule');
  }, [settings]);

  // Handler: Reset
  const handleReset = useCallback(() => {
    if (schedule && !confirm('Turnierplan und alle Ergebnisse werden gelöscht. Fortfahren?')) {
      return;
    }
    
    clearStorage();
    setSettings(getDefaultSettings());
    setSchedule(null);
    setGenerationTime(null);
    setCurrentTournamentId(null);
    setCurrentTournamentName('');
    setActiveTab('settings');
  }, [schedule]);

  // Handler: Turnier laden
  const handleLoadTournament = useCallback((
    loadedSettings: Settings,
    loadedSchedule: Schedule | null,
    id: string,
    name: string
  ) => {
    setSettings(loadedSettings);
    setSchedule(loadedSchedule);
    setCurrentTournamentId(id);
    setCurrentTournamentName(name);
    setActiveTab(loadedSchedule ? 'schedule' : 'settings');
  }, []);

  // Handler: Neues Turnier
  const handleNewTournament = useCallback(() => {
    if (schedule && !confirm('Ungespeicherte Änderungen gehen verloren. Fortfahren?')) {
      return;
    }
    
    clearStorage();
    setSettings(getDefaultSettings());
    setSchedule(null);
    setGenerationTime(null);
    setCurrentTournamentId(null);
    setCurrentTournamentName('');
    setActiveTab('settings');
  }, [schedule]);

  // Handler: Score-Eingabe
  const handleScoreChange = useCallback((
    matchId: string,
    scoreA: number | null,
    scoreB: number | null,
    scorersA?: Record<string, number>,
    scorersB?: Record<string, number>
  ) => {
    if (!schedule) return;

    const newSchedule: Schedule = {
      ...schedule,
      rounds: schedule.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match => 
          match.id === matchId
            ? { 
                ...match, 
                scoreA, 
                scoreB,
                ...(scorersA !== undefined && { scorersA }),
                ...(scorersB !== undefined && { scorersB })
              }
            : match
        ),
      })),
    };

    setSchedule(newSchedule);
  }, [schedule]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>🏆 Holländisches Turnier</h1>
        <p className="subtitle">
          Turnierplan-Generator mit rotierenden Teams
          {currentTournamentName && (
            <span className="current-tournament-name"> — {currentTournamentName}</span>
          )}
        </p>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <button
          type="button"
          className={`tab-button ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          📁 Archiv
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Einstellungen
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          disabled={!schedule}
        >
          📅 Spielplan
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          📊 Statistiken
        </button>
      </nav>

      {/* Export Buttons (nur wenn Schedule existiert) */}
      {schedule && activeTab !== 'archive' && (
        <ExportButtons 
          schedule={schedule} 
          players={settings.players} 
          stats={playerStats} 
        />
      )}

      {/* Tab Content */}
      <main className="tab-content">
        {activeTab === 'archive' && (
          <TournamentArchive
            currentSettings={settings}
            currentSchedule={schedule}
            currentTournamentId={currentTournamentId}
            onLoadTournament={handleLoadTournament}
            onNewTournament={handleNewTournament}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsForm
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={handleGenerate}
            onReset={handleReset}
            hasSchedule={!!schedule}
          />
        )}

        {activeTab === 'schedule' && schedule && (
          <ScheduleTab
            schedule={schedule}
            players={settings.players}
            pointSettings={settings.pointSettings}
            onScoreChange={handleScoreChange}
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

      {/* Footer mit Generation-Info */}
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
                  👥 Mitspieler: {scheduleAnalysis.teammateStats.min}-{scheduleAnalysis.teammateStats.max}×
                </span>
                <span title="Wie oft Spieler gegeneinander gespielt haben">
                  ⚔️ Gegner: {scheduleAnalysis.opponentStats.min}-{scheduleAnalysis.opponentStats.max}×
                </span>
                <span title="Anzahl Spiele pro Spieler">
                  🎮 Einsätze: {scheduleAnalysis.gamesPlayedStats.min}-{scheduleAnalysis.gamesPlayedStats.max}
                </span>
              </>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
