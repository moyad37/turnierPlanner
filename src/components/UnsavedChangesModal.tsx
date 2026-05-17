// ============================================
// UnsavedChangesModal - Ungespeicherte Änderungen
// ============================================

import React, { useState } from 'react';

interface UnsavedChangesModalProps {
  tournamentName: string;
  hasSavedId: boolean;
  onSave: (name?: string) => void;   // undefined = bestehenden Namen benutzen
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  tournamentName,
  hasSavedId,
  onSave,
  onDiscard,
  onCancel,
}) => {
  const [nameInput, setNameInput] = useState(
    tournamentName || `Turnier ${new Date().toLocaleDateString('de-DE')}`
  );

  const handleSave = () => {
    if (!hasSavedId) {
      if (!nameInput.trim()) return;
      onSave(nameInput.trim());
    } else {
      onSave();
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-icon">💾</span>
          <h3>Ungespeicherte Änderungen</h3>
        </div>

        <p className="modal-message">
          Das Turnier{' '}
          <strong>„{tournamentName || 'Neues Turnier'}"</strong> hat
          ungespeicherte Änderungen.
          <br />
          Möchtest du sie vor dem Fortfahren speichern?
        </p>

        {/* Name-Eingabe nur wenn noch kein Archiv-Eintrag */}
        {!hasSavedId && (
          <div className="modal-name-input">
            <label htmlFor="unsaved-name">Turnier-Name</label>
            <input
              id="unsaved-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!hasSavedId && !nameInput.trim()}
          >
            💾 Speichern &amp; Weiter
          </button>
          <button type="button" className="btn-secondary btn-danger-outline" onClick={onDiscard}>
            🗑️ Verwerfen &amp; Weiter
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            ✕ Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};
