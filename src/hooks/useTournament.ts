// ============================================
// useTournament Hook - Turnier-State & Handler
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Settings, Schedule } from '../types';
import { generateSchedule, analyzeSchedule } from '../lib/generator';
import { calculatePlayerStats } from '../lib/stats';
import { validateSettings } from '../lib/validation';
import {
  loadFromStorage,
  saveToStorage,
  getDefaultSettings,
  clearStorage,
} from '../lib/storage';
import { saveTournament } from '../lib/cloudArchive';
import { exportToPDF } from '../lib/pdfExport';

export function useTournament() {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = loadFromStorage();
    return stored?.settings ?? getDefaultSettings();
  });

  const [schedule, setSchedule] = useState<Schedule | null>(() => {
    const stored = loadFromStorage();
    return stored?.schedule ?? null;
  });

  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [currentTournamentName, setCurrentTournamentName] = useState<string>('');

  // Dirty-Tracking: true nur bei echten Nutzer-Änderungen (nicht bei Load/Reset)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Persistenz: Speichere bei jeder Änderung
  useEffect(() => {
    saveToStorage(settings, schedule);
  }, [settings, schedule]);

  // Berechnete Statistiken
  const playerStats = useMemo(
    () => calculatePlayerStats(settings.players, schedule, settings.pointSettings),
    [settings.players, schedule, settings.pointSettings]
  );

  // Analyse des Spielplans (für Footer-Infos)
  const scheduleAnalysis = useMemo(() => {
    if (!schedule) return null;
    return analyzeSchedule(schedule, settings.players);
  }, [schedule, settings.players]);

  // Wrapper für Settings-Änderungen durch den Nutzer (markiert dirty)
  const handleSettingsChange = useCallback(
    (newSettings: Settings | ((prev: Settings) => Settings)) => {
      setSettings(newSettings);
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleGenerate = useCallback(() => {
    const validation = validateSettings(settings);
    if (!validation.isValid) {
      alert('Bitte behebe zuerst die Validierungsfehler.');
      return;
    }
    const start = performance.now();
    const newSchedule = generateSchedule(settings);
    setGenerationTime(Math.round(performance.now() - start));
    setSchedule(newSchedule);
    setHasUnsavedChanges(true);
    return newSchedule; // Caller kann nach Schedule-Tab wechseln
  }, [settings]);

  const handleReset = useCallback(() => {
    clearStorage();
    setSettings(getDefaultSettings());
    setSchedule(null);
    setGenerationTime(null);
    setCurrentTournamentId(null);
    setCurrentTournamentName('');
    setHasUnsavedChanges(false);
  }, []);

  const handleNewTournament = useCallback(() => {
    clearStorage();
    setSettings(getDefaultSettings());
    setSchedule(null);
    setGenerationTime(null);
    setCurrentTournamentId(null);
    setCurrentTournamentName('');
    setHasUnsavedChanges(false);
  }, []);

  const handleLoadTournament = useCallback(
    (
      loadedSettings: Settings,
      loadedSchedule: Schedule | null,
      id: string,
      name: string
    ) => {
      setSettings(loadedSettings);
      setSchedule(loadedSchedule);
      setCurrentTournamentId(id);
      setCurrentTournamentName(name);
      setHasUnsavedChanges(false);
    },
    []
  );

  // Speichert aktuelles Turnier ins Archiv (Quick-Save für bestehendes)
  const quickSave = useCallback(async (): Promise<boolean> => {
    if (!currentTournamentId || !currentTournamentName) return false;
    await saveTournament(settings, schedule, currentTournamentName, currentTournamentId);
    setHasUnsavedChanges(false);
    return true;
  }, [settings, schedule, currentTournamentId, currentTournamentName]);

  // Speichert aktuelles Turnier als neues Archiv-Eintrag
  const saveAsNew = useCallback(async (name: string): Promise<string> => {
    const id = await saveTournament(settings, schedule, name);
    setCurrentTournamentId(id);
    setCurrentTournamentName(name);
    setHasUnsavedChanges(false);
    return id;
  }, [settings, schedule]);

  // Markiert manuell als gespeichert (z.B. nach externem Save)
  const markAsSaved = useCallback((id?: string, name?: string) => {
    if (id) setCurrentTournamentId(id);
    if (name) setCurrentTournamentName(name);
    setHasUnsavedChanges(false);
  }, []);

  const handleScoreChange = useCallback(
    (
      matchId: string,
      scoreA: number | null,
      scoreB: number | null,
      scorersA?: Record<string, number>,
      scorersB?: Record<string, number>
    ) => {
      if (!schedule) return;
      setSchedule({
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
                  ...(scorersB !== undefined && { scorersB }),
                }
              : match
          ),
        })),
      });
      setHasUnsavedChanges(true);
    },
    [schedule]
  );

  const handlePDFExport = useCallback(() => {
    exportToPDF({
      players: settings.players,
      schedule,
      stats: playerStats,
      settings,
      tournamentName: currentTournamentName || 'Turnier',
      date: new Date().toLocaleDateString('de-DE'),
    });
  }, [settings, schedule, playerStats, currentTournamentName]);

  return {
    // State
    settings,
    setSettings: handleSettingsChange,
    schedule,
    generationTime,
    currentTournamentId,
    currentTournamentName,
    hasUnsavedChanges,
    // Abgeleitete Daten
    playerStats,
    scheduleAnalysis,
    // Handler
    handleGenerate,
    handleReset,
    handleNewTournament,
    handleLoadTournament,
    handleScoreChange,
    handlePDFExport,
    quickSave,
    saveAsNew,
    markAsSaved,
  };
}
