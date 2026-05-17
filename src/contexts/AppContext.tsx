// ============================================
// App Context - Theme, Language, Settings
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export type Theme = 'light' | 'dark';
export type Language = 'de' | 'en';

interface AppContextType {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  
  // Timer
  defaultMatchDuration: number;
  setDefaultMatchDuration: (minutes: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Translations
const translations: Record<Language, Record<string, string>> = {
  de: {
    // App Header
    appTitle: 'Holländisches Turnier',
    appSubtitle: 'Turnierplan-Generator mit rotierenden Teams',
    
    // Navigation Tabs
    archive: 'Archiv',
    settings: 'Einstellungen',
    schedule: 'Spielplan',
    statistics: 'Statistiken',
    live: 'Live',
    
    // Header Buttons (tooltips)
    language: 'Sprache wechseln',
    theme: 'Design wechseln',
    pdfExport: 'Als PDF exportieren',
    
    // Settings
    settingsTitle: 'Turnier-Einstellungen',
    players: 'Spieler',
    playersPerTeam: 'Spieler pro Team',
    teamsPerRound: 'Teams pro Runde',
    rounds: 'Anzahl Runden',
    fields: 'Anzahl Spielfelder',
    allowByes: 'Pausen erlauben',
    distributeGK: 'Torleute verteilen',
    generate: 'Turnierplan Generieren',
    regenerate: 'Neu Generieren',
    reset: 'Zurücksetzen',
    
    // Schedule
    scheduleTitle: 'Spielplan',
    round: 'Runde',
    field: 'Feld',
    vs: 'vs',
    bye: 'Pause',
    played: 'gespielt',
    remaining: 'offen',
    
    // Stats / Table
    statsTitle: 'Spieler-Statistiken',
    rank: 'Rang',
    playerName: 'Spieler',
    games: 'Spiele',
    wins: 'Siege',
    draws: 'Unent.',
    losses: 'Nied.',
    goals: 'Tore',
    against: 'Gegen',
    diff: 'Diff',
    points: 'Punkte',
    mvp: 'MVP',
    noPlayersYet: 'Noch keine Spieler vorhanden',
    
    // Timer
    timerStart: 'Start',
    timerPause: 'Pause',
    timerReset: 'Reset',
    matchTime: 'Spielzeit',
    
    // Actions
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    export: 'Exportieren',
    import: 'Importieren',
    print: 'Drucken',
    close: 'Schließen',
    
    // Messages
    confirmDelete: 'Wirklich löschen?',
    saved: 'Gespeichert!',
    error: 'Fehler',
    
    // Misc
    goalkeeper: 'Tormann',
    goalkeepers: 'Torleute',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
  },
  en: {
    // App Header
    appTitle: 'Dutch Tournament',
    appSubtitle: 'Tournament Generator with Rotating Teams',
    
    // Navigation Tabs
    archive: 'Archive',
    settings: 'Settings',
    schedule: 'Schedule',
    statistics: 'Statistics',
    live: 'Live',
    
    // Header Buttons (tooltips)
    language: 'Switch Language',
    theme: 'Switch Theme',
    pdfExport: 'Export as PDF',
    
    // Settings
    settingsTitle: 'Tournament Settings',
    players: 'Players',
    playersPerTeam: 'Players per Team',
    teamsPerRound: 'Teams per Round',
    rounds: 'Number of Rounds',
    fields: 'Number of Fields',
    allowByes: 'Allow Byes',
    distributeGK: 'Distribute Goalkeepers',
    generate: 'Generate Tournament',
    regenerate: 'Regenerate',
    reset: 'Reset',
    
    // Schedule
    scheduleTitle: 'Schedule',
    round: 'Round',
    field: 'Field',
    vs: 'vs',
    bye: 'Bye',
    played: 'played',
    remaining: 'remaining',
    
    // Stats / Table
    statsTitle: 'Player Statistics',
    rank: 'Rank',
    playerName: 'Player',
    games: 'Games',
    wins: 'Wins',
    draws: 'Draws',
    losses: 'Losses',
    goals: 'Goals',
    against: 'Against',
    diff: 'Diff',
    points: 'Points',
    mvp: 'MVP',
    noPlayersYet: 'No players yet',
    
    // Timer
    timerStart: 'Start',
    timerPause: 'Pause',
    timerReset: 'Reset',
    matchTime: 'Match Time',
    
    // Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    close: 'Close',
    
    // Messages
    confirmDelete: 'Really delete?',
    saved: 'Saved!',
    error: 'Error',
    
    // Misc
    goalkeeper: 'Goalkeeper',
    goalkeepers: 'Goalkeepers',
    themeLight: 'Light',
    themeDark: 'Dark',
  },
};

const APP_SETTINGS_KEY = 'dutch-tournament-app-settings';

interface AppSettings {
  theme: Theme;
  language: Language;
  defaultMatchDuration: number;
}

function loadAppSettings(): AppSettings {
  try {
    const data = localStorage.getItem(APP_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading app settings:', e);
  }
  
  // Default settings
  return {
    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    language: navigator.language.startsWith('de') ? 'de' : 'en',
    defaultMatchDuration: 10,
  };
}

function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving app settings:', e);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    saveAppSettings(settings);
  }, [settings]);
  
  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  }, []);
  
  const setTheme = useCallback((theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
  }, []);
  
  const setLanguage = useCallback((language: Language) => {
    setSettings(prev => ({ ...prev, language }));
  }, []);
  
  const setDefaultMatchDuration = useCallback((defaultMatchDuration: number) => {
    setSettings(prev => ({ ...prev, defaultMatchDuration }));
  }, []);
  
  const t = useCallback((key: string): string => {
    return translations[settings.language][key] || key;
  }, [settings.language]);
  
  const value: AppContextType = {
    theme: settings.theme,
    toggleTheme,
    setTheme,
    language: settings.language,
    setLanguage,
    t,
    defaultMatchDuration: settings.defaultMatchDuration,
    setDefaultMatchDuration,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
