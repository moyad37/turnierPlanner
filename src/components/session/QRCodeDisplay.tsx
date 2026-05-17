// ============================================
// QRCodeDisplay – QR-Code, Session-Code, Link
// ============================================

import { useState } from 'react';
import QRCode from 'react-qr-code';

interface QRCodeDisplayProps {
  sessionId: string;
  sessionCode: string;
}

export function QRCodeDisplay({ sessionId, sessionCode }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const joinUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;

  function copyToClipboard(text: string, type: 'link' | 'code') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="qr-display">
      <div className="qr-code-wrapper">
        <QRCode value={joinUrl} size={180} />
      </div>

      <div className="qr-session-code">
        <span className="qr-code-label">Session-Code</span>
        <span className="qr-code-value">{sessionCode}</span>
        <button
          type="button"
          className="qr-copy-btn"
          onClick={() => copyToClipboard(sessionCode, 'code')}
        >
          {copied === 'code' ? '✓ Kopiert' : '📋'}
        </button>
      </div>

      <div className="qr-link-row">
        <input
          className="qr-link-input"
          readOnly
          value={joinUrl}
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="qr-copy-btn"
          onClick={() => copyToClipboard(joinUrl, 'link')}
        >
          {copied === 'link' ? '✓ Kopiert' : '🔗 Kopieren'}
        </button>
      </div>

      <p className="qr-hint">
        Sub-Geräte scannen den QR-Code, öffnen den Link oder geben den Code manuell ein.
      </p>
    </div>
  );
}
