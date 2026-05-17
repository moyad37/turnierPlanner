// ============================================
// Turnier-Archiv Komponente
// ============================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from '../lib/cloudArchive';

interface TournamentArchiveProps {
  currentSettings: Settings;
  currentSchedule: Schedule | null;
  currentTournamentId: string | null;
  onLoadTournament: (settings: Settings, schedule: Schedule | null, id: string, name: string) => void;
  onNewTournament: () => void;
  onSaved: (id: string, name: string) => void;
}

export const TournamentArchive: React.FC<TournamentArchiveProps> = ({
  currentSettings,
  currentSchedule,
  currentTournamentId,
  onLoadTournament,
  onNewTournament,
  onSaved,
}) => {
  const [index, setIndex] = useState<TournamentIndex>({ tournaments: [] });
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Turnierliste beim ersten Laden aus Firestore holen
  useEffect(() => {
    loadTournamentIndex()
      .then(idx => { setIndex(idx); setLoading(false); })
      .catch(() => { setCloudError('Verbindung zu Firebase fehlgeschlagen.'); setLoading(false); });
  }, []);

  const refreshIndex = useCallback(() => {
    loadTournamentIndex()
      .then(idx => setIndex(idx))
      .catch(() => setCloudError('Fehler beim Aktualisieren.'));
  }, []);

  // Speichern Dialog öffnen
  const handleSaveClick = useCallback(async () => {
    if (currentTournamentId) {
      const tournament = await loadTournament(currentTournamentId);
      if (tournament) {
        await saveTournament(currentSettings, currentSchedule, tournament.name, currentTournamentId);
        refreshIndex();
        onSaved(currentTournamentId, tournament.name);
        alert('Turnier gespeichert!');
      }
    } else {
      setSaveName(`Turnier ${new Date().toLocaleDateString('de-DE')}`);
      setShowSaveDialog(true);
    }
  }, [currentSettings, currentSchedule, currentTournamentId, refreshIndex, onSaved]);

  // Als neues Turnier speichern
  const handleSaveAsNew = useCallback(() => {
    setSaveName(`Turnier ${new Date().toLocaleDateString('de-DE')}`);
    setShowSaveDialog(true);
  }, []);

  // Speichern bestätigen
  const handleSaveConfirm = useCallback(async () => {
    if (!saveName.trim()) {
      alert('Bitte gib einen Namen ein.');
      return;
    }
    const trimmedName = saveName.trim();
    const id = await saveTournament(currentSettings, currentSchedule, trimmedName);
    refreshIndex();
    setShowSaveDialog(false);
    setSaveName('');
    onSaved(id, trimmedName);
    onLoadTournament(currentSettings, currentSchedule, id, trimmedName);
  }, [saveName, currentSettings, currentSchedule, refreshIndex, onSaved, onLoadTournament]);

  // Turnier laden
  const handleLoad = useCallback(async (id: string) => {
    const tournament = await loadTournament(id);
    if (tournament) {
      onLoadTournament(tournament.settings, tournament.schedule, tournament.id, tournament.name);
    }
  }, [onLoadTournament]);

  // Turnier löschen
  const handleDelete = useCallback(async (id: string) => {
    await deleteTournament(id);
    refreshIndex();
    setConfirmDelete(null);
    if (currentTournamentId === id) {
      onNewTournament();
    }
  }, [currentTournamentId, onNewTournament, refreshIndex]);

  // Turnier umbenennen
  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return;
    await renameTournament(id, editName.trim());
    refreshIndex();
    setEditingId(null);
    setEditName('');
  }, [editName, refreshIndex]);

  // Turnier duplizieren
  const handleDuplicate = useCallback(async (id: string) => {
    await duplicateTournament(id);
    refreshIndex();
  }, [refreshIndex]);

  // Als JSON exportieren
  const handleExportJSON = useCallback(async (id: string) => {
    const tournament = await loadTournament(id);
    if (tournament) {
      exportTournamentAsJSON(tournament.settings, tournament.schedule, tournament.name);
    }
  }, []);

  // Aktuelles Turnier als JSON exportieren
  const handleExportCurrentJSON = useCallback(async () => {
    let name = 'Turnier';
    if (currentTournamentId) {
      const t = await loadTournament(currentTournamentId);
      name = t?.name || 'Turnier';
    }
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
      const id = await saveImportedTournament(tournament);
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
        <h3>☁️ Turnier-Archiv</h3>
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
      {cloudError && (
        <div className="archive-empty">
          <p>⚠️ {cloudError}</p>
        </div>
      )}
      {loading ? (
        <div className="archive-empty">
          <p>☁️ Lade Turniere…</p>
        </div>
      ) : index.tournaments.length === 0 ? (
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
