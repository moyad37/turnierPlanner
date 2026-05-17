// ============================================
// JoinSessionView – Session per Code beitreten
// ============================================

import { useState } from 'react';
import { findSessionByCode } from '../../lib/liveSession';

interface JoinSessionViewProps {
  /** Wird aufgerufen wenn eine Session-ID gefunden wurde */
  onJoin: (sessionId: string) => void;
}

export function JoinSessionView({ onJoin }: JoinSessionViewProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Bitte einen 6-stelligen Code eingeben.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await findSessionByCode(trimmed);
      if (!result) {
        setError('Keine aktive Session mit diesem Code gefunden.');
        return;
      }
      onJoin(result.sessionId);
    } catch {
      setError('Verbindung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="join-session-view">
      <div className="join-session-card">
        <h2>🏆 Turnier beitreten</h2>
        <p>Gib den 6-stelligen Session-Code ein, den du vom Veranstalter erhalten hast.</p>

        <div className="join-code-input-row">
          <input
            className="join-code-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="AB1234"
            maxLength={6}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={loading || code.trim().length === 0}
          >
            {loading ? '⏳ Suche…' : 'Beitreten'}
          </button>
        </div>

        {error && <p className="join-error">{error}</p>}

        <p className="join-hint">
          Du kannst auch direkt den Link öffnen, den dir der Veranstalter geteilt hat.
        </p>
      </div>
    </div>
  );
}
