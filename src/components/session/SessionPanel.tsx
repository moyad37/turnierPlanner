// ============================================
// SessionPanel – Admin: Session verwalten
// ============================================

import { useState, useEffect } from 'react';
import type { LiveSession, DeviceInfo, SessionPermissions } from '../../types/session';
import type { Schedule, Settings } from '../../types';
import { QRCodeDisplay } from './QRCodeDisplay';
import { DeviceList } from './DeviceList';
import { PermissionsEditor } from './PermissionsEditor';

interface SessionPanelProps {
  // Session-Zustand
  session: LiveSession | null;
  devices: DeviceInfo[];
  isStarting: boolean;
  startError: string | null;
  adminDeviceId: string;
  // Turnier-Daten
  settings: Settings;
  schedule: Schedule | null;
  tournamentName: string;
  // Callbacks
  onStartSession: (settings: Settings, schedule: Schedule | null, name: string) => Promise<string>;
  onStopSession: () => Promise<void>;
  onUpdateDefaultPermissions: (permissions: SessionPermissions) => Promise<void>;
  onUpdateDevicePermissions: (deviceId: string, permissions: SessionPermissions | null) => Promise<void>;
  onRevokeDevice: (deviceId: string) => Promise<void>;
  onRestoreDevice: (deviceId: string) => Promise<void>;
  onClose: () => void;
}

type PanelTab = 'qr' | 'devices' | 'defaults';

export function SessionPanel({
  session,
  devices,
  isStarting,
  startError,
  adminDeviceId,
  settings,
  schedule,
  tournamentName,
  onStartSession,
  onStopSession,
  onUpdateDefaultPermissions,
  onUpdateDevicePermissions,
  onRevokeDevice,
  onRestoreDevice,
  onClose,
}: SessionPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('qr');
  const [stopping, setStopping] = useState(false);
  // startErr zeigt lokale Fehler (z.B. Netzwerk), startError kommt vom Hook
  const [startErr, setStartErr] = useState<string | null>(startError);
  useEffect(() => { setStartErr(startError); }, [startError]);
  const [editingDefaults, setEditingDefaults] = useState<SessionPermissions | null>(null);

  async function handleStart() {
    setStartErr(null);
    try {
      await onStartSession(settings, schedule, tournamentName);
      setActiveTab('qr');
    } catch (err) {
      setStartErr(err instanceof Error ? err.message : 'Unbekannter Fehler');
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await onStopSession();
    } finally {
      setStopping(false);
    }
  }

  function startEditDefaults() {
    setEditingDefaults(session!.defaultPermissions);
    setActiveTab('defaults');
  }

  async function saveDefaults() {
    if (!editingDefaults) return;
    await onUpdateDefaultPermissions(editingDefaults);
    setEditingDefaults(null);
    setActiveTab('devices');
  }

  const activeDevicesCount = devices.filter(
    (d) => d.deviceId !== adminDeviceId && d.status === 'active'
  ).length;

  return (
    <div className="session-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="session-panel">
        {/* Header */}
        <div className="session-panel-header">
          <h2>📡 Live-Session</h2>
          <button type="button" className="session-close-btn" onClick={onClose}>✕</button>
        </div>

        {!session ? (
          /* Noch keine Session aktiv */
          <div className="session-start-view">
            <p>
              Starte eine Live-Session, damit andere Geräte per QR-Code oder
              Session-Code beitreten und Ergebnisse eintragen können.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? '⏳ Wird gestartet…' : '🚀 Session starten'}
            </button>
            {startErr && (
              <p className="session-start-error">
                ⚠️ Fehler: {startErr}
              </p>
            )}
          </div>
        ) : (
          /* Session aktiv */
          <>
            <div className="session-status-bar">
              <span className="session-live-badge">● LIVE</span>
              <span className="session-name">{session.tournamentName}</span>
              <span className="session-devices-count">
                {activeDevicesCount} Gerät{activeDevicesCount !== 1 ? 'e' : ''} verbunden
              </span>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleStop}
                disabled={stopping}
              >
                {stopping ? '⏳' : '⏹ Session beenden'}
              </button>
            </div>

            {/* Tab-Navigation */}
            <nav className="session-tabs">
              <button
                type="button"
                className={`session-tab${activeTab === 'qr' ? ' active' : ''}`}
                onClick={() => setActiveTab('qr')}
              >
                📷 Beitreten
              </button>
              <button
                type="button"
                className={`session-tab${activeTab === 'devices' ? ' active' : ''}`}
                onClick={() => setActiveTab('devices')}
              >
                📱 Geräte{activeDevicesCount > 0 ? ` (${activeDevicesCount})` : ''}
              </button>
              <button
                type="button"
                className={`session-tab${activeTab === 'defaults' ? ' active' : ''}`}
                onClick={startEditDefaults}
              >
                ⚙️ Standard-Rechte
              </button>
            </nav>

            <div className="session-tab-content">
              {activeTab === 'qr' && (
                <QRCodeDisplay
                  sessionId={session.sessionId}
                  sessionCode={session.sessionCode}
                />
              )}

              {activeTab === 'devices' && (
                <DeviceList
                  devices={devices}
                  adminDeviceId={adminDeviceId}
                  defaultPermissions={session.defaultPermissions}
                  fieldsCount={settings.fieldsCount}
                  onUpdatePermissions={onUpdateDevicePermissions}
                  onRevoke={onRevokeDevice}
                  onRestore={onRestoreDevice}
                />
              )}

              {activeTab === 'defaults' && editingDefaults && (
                <div className="session-defaults-panel">
                  <p className="session-defaults-hint">
                    Diese Berechtigungen gelten für alle neuen Geräte, die beitreten.
                  </p>
                  <PermissionsEditor
                    permissions={editingDefaults}
                    onChange={setEditingDefaults}
                    fieldsCount={settings.fieldsCount}
                    title="Standard-Berechtigungen"
                  />
                  <div className="session-defaults-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={saveDefaults}
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('devices')}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
