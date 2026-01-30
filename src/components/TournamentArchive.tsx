// ============================================
// Turnier-Archiv Komponente
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import type { Settings, Schedule } from '../types';
import type { TournamentIndex } from '../lib/tournamentArchive';
import {
  loadTournamentIndex,
  loadTournament,
  saveTournament,
  deleteTournament,
  exportTournamentAsJSON,
  importTournamentFromJSON,
  saveImportedTournament,
  renameTournament,
  duplicateTournament,
} from '../lib/tournamentArchive';

interface TournamentArchiveProps {
  currentSettings: Settings;
  currentSchedule: Schedule | null;
  currentTournamentId: string | null;
  onLoadTournament: (settings: Settings, schedule: Schedule | null, id: string, name: string) => void;
  onNewTournament: () => void;
}

export const TournamentArchive: React.FC<TournamentArchiveProps> = ({
  currentSettings,
  currentSchedule,
  currentTournamentId,
  onLoadTournament,
  onNewTournament,
}) => {
  const [index, setIndex] = useState<TournamentIndex>(() => loadTournamentIndex());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshIndex = useCallback(() => {
    setIndex(loadTournamentIndex());
  }, []);

  // Speichern Dialog öffnen
  const handleSaveClick = useCallback(() => {
    if (currentTournamentId) {
      // Existierendes Turnier direkt speichern
      const tournament = loadTournament(currentTournamentId);
      if (tournament) {
        saveTournament(currentSettings, currentSchedule, tournament.name, currentTournamentId);
        refreshIndex();
        alert('Turnier gespeichert!');
      }
    } else {
      // Neues Turnier - Name abfragen
      setSaveName(`Turnier ${new Date().toLocaleDateString('de-DE')}`);
      setShowSaveDialog(true);
    }
  }, [currentSettings, currentSchedule, currentTournamentId, refreshIndex]);

  // Als neues Turnier speichern
  const handleSaveAsNew = useCallback(() => {
    setSaveName(`Turnier ${new Date().toLocaleDateString('de-DE')}`);
    setShowSaveDialog(true);
  }, []);

  // Speichern bestätigen
  const handleSaveConfirm = useCallback(() => {
    if (!saveName.trim()) {
      alert('Bitte gib einen Namen ein.');
      return;
    }
    
    const id = saveTournament(currentSettings, currentSchedule, saveName.trim());
    refreshIndex();
    setShowSaveDialog(false);
    setSaveName('');
    onLoadTournament(currentSettings, currentSchedule, id, saveName.trim());
  }, [saveName, currentSettings, currentSchedule, refreshIndex, onLoadTournament]);

  // Turnier laden
  const handleLoad = useCallback((id: string) => {
    const tournament = loadTournament(id);
    if (tournament) {
      onLoadTournament(tournament.settings, tournament.schedule, tournament.id, tournament.name);
    }
  }, [onLoadTournament]);

  // Turnier löschen
  const handleDelete = useCallback((id: string) => {
    deleteTournament(id);
    refreshIndex();
    setConfirmDelete(null);
    
    // Wenn aktuelles Turnier gelöscht wurde
    if (currentTournamentId === id) {
      onNewTournament();
    }
  }, [currentTournamentId, onNewTournament, refreshIndex]);

  // Turnier umbenennen
  const handleRename = useCallback((id: string) => {
    if (!editName.trim()) return;
    
    renameTournament(id, editName.trim());
    refreshIndex();
    setEditingId(null);
    setEditName('');
  }, [editName, refreshIndex]);

  // Turnier duplizieren
  const handleDuplicate = useCallback((id: string) => {
    const newId = duplicateTournament(id);
    if (newId) {
      refreshIndex();
    }
  }, [refreshIndex]);

  // Als JSON exportieren
  const handleExportJSON = useCallback((id: string) => {
    const tournament = loadTournament(id);
    if (tournament) {
      exportTournamentAsJSON(tournament.settings, tournament.schedule, tournament.name);
    }
  }, []);

  // Aktuelles Turnier als JSON exportieren
  const handleExportCurrentJSON = useCallback(() => {
    const name = currentTournamentId 
      ? loadTournament(currentTournamentId)?.name || 'Turnier'
      : 'Turnier';
    exportTournamentAsJSON(currentSettings, currentSchedule, name);
  }, [currentSettings, currentSchedule, currentTournamentId]);

  // JSON importieren
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const tournament = await importTournamentFromJSON(file);
      const id = saveImportedTournament(tournament);
      refreshIndex();
      
      // Direkt laden
      onLoadTournament(tournament.settings, tournament.schedule, id, tournament.name);
    } catch (error) {
      alert((error as Error).message);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [refreshIndex, onLoadTournament]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="tournament-archive">
      <div className="archive-header">
        <h3>📁 Turnier-Archiv</h3>
        <div className="archive-actions">
          <button type="button" className="btn-archive" onClick={handleSaveClick}>
            💾 Speichern
          </button>
          {currentTournamentId && (
            <button type="button" className="btn-archive" onClick={handleSaveAsNew}>
              📄 Als Neu speichern
            </button>
          )}
          <button type="button" className="btn-archive" onClick={handleExportCurrentJSON}>
            📥 JSON Export
          </button>
          <button type="button" className="btn-archive" onClick={handleImportClick}>
            📤 JSON Import
          </button>
          <button type="button" className="btn-archive btn-new" onClick={onNewTournament}>
            ➕ Neues Turnier
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Speichern Dialog */}
      {showSaveDialog && (
        <div className="save-dialog">
          <div className="save-dialog-content">
            <h4>Turnier speichern</h4>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Turniername eingeben..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
            />
            <div className="save-dialog-actions">
              <button type="button" className="btn-primary" onClick={handleSaveConfirm}>
                Speichern
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowSaveDialog(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turnier-Liste */}
      {index.tournaments.length === 0 ? (
        <div className="archive-empty">
          <p>Noch keine Turniere gespeichert.</p>
          <p>Klicke auf "Speichern", um das aktuelle Turnier zu archivieren.</p>
        </div>
      ) : (
        <div className="tournament-list">
          {index.tournaments.map((t) => (
            <div 
              key={t.id} 
              className={`tournament-item ${currentTournamentId === t.id ? 'active' : ''}`}
            >
              <div className="tournament-info">
                {editingId === t.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(t.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="rename-input"
                  />
                ) : (
                  <span 
                    className="tournament-name"
                    onDoubleClick={() => {
                      setEditingId(t.id);
                      setEditName(t.name);
                    }}
                    title="Doppelklick zum Umbenennen"
                  >
                    {t.name}
                    {currentTournamentId === t.id && <span className="current-badge">aktiv</span>}
                  </span>
                )}
                <span className="tournament-meta">
                  {t.playerCount} Spieler • {t.roundsCount} Runden • 
                  {t.matchesPlayed}/{t.totalMatches} Spiele
                </span>
                <span className="tournament-date">
                  Erstellt: {formatDate(t.createdAt)}
                  {t.updatedAt !== t.createdAt && (
                    <> • Aktualisiert: {formatDate(t.updatedAt)}</>
                  )}
                </span>
              </div>
              
              <div className="tournament-actions">
                {currentTournamentId !== t.id && (
                  <button 
                    type="button" 
                    className="btn-small btn-load"
                    onClick={() => handleLoad(t.id)}
                    title="Turnier laden"
                  >
                    📂 Laden
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn-small"
                  onClick={() => handleExportJSON(t.id)}
                  title="Als JSON exportieren"
                >
                  📥
                </button>
                <button 
                  type="button" 
                  className="btn-small"
                  onClick={() => handleDuplicate(t.id)}
                  title="Duplizieren"
                >
                  📋
                </button>
                {confirmDelete === t.id ? (
                  <>
                    <button 
                      type="button" 
                      className="btn-small btn-danger"
                      onClick={() => handleDelete(t.id)}
                    >
                      ✓ Ja
                    </button>
                    <button 
                      type="button" 
                      className="btn-small"
                      onClick={() => setConfirmDelete(null)}
                    >
                      ✕ Nein
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    className="btn-small btn-danger"
                    onClick={() => setConfirmDelete(t.id)}
                    title="Löschen"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
