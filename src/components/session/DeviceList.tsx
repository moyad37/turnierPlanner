// ============================================
// DeviceList – Verbundene Geräte verwalten
// ============================================

import { useState } from 'react';
import type { DeviceInfo, SessionPermissions } from '../../types/session';
import { PermissionsEditor } from './PermissionsEditor';

interface DeviceListProps {
  devices: DeviceInfo[];
  adminDeviceId: string;
  defaultPermissions: SessionPermissions;
  fieldsCount: number;
  onUpdatePermissions: (deviceId: string, permissions: SessionPermissions | null) => void;
  onRevoke: (deviceId: string) => void;
  onRestore: (deviceId: string) => void;
}

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'gerade eben';
  if (diff < 3_600_000) return `vor ${Math.floor(diff / 60_000)} Min.`;
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function effectivePermissions(
  device: DeviceInfo,
  defaultPerms: SessionPermissions
): SessionPermissions {
  return device.permissions ?? defaultPerms;
}

export function DeviceList({
  devices,
  adminDeviceId,
  defaultPermissions,
  fieldsCount,
  onUpdatePermissions,
  onRevoke,
  onRestore,
}: DeviceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<Record<string, SessionPermissions>>({});

  function startEdit(device: DeviceInfo) {
    setEditingPerms((prev) => ({
      ...prev,
      [device.deviceId]: effectivePermissions(device, defaultPermissions),
    }));
    setExpandedId(device.deviceId);
  }

  function saveEdit(deviceId: string) {
    const perms = editingPerms[deviceId];
    if (perms) onUpdatePermissions(deviceId, perms);
    setExpandedId(null);
  }

  function resetToDefault(deviceId: string) {
    onUpdatePermissions(deviceId, null);
    setExpandedId(null);
  }

  const subDevices = devices.filter((d) => d.deviceId !== adminDeviceId);

  if (subDevices.length === 0) {
    return (
      <div className="device-list-empty">
        Noch keine Geräte verbunden. Teile den QR-Code oder Link.
      </div>
    );
  }

  return (
    <div className="device-list">
      {subDevices.map((device) => (
        <div
          key={device.deviceId}
          className={`device-item${device.status === 'revoked' ? ' revoked' : ''}`}
        >
          <div className="device-item-header">
            <div className="device-item-info">
              <span className={`device-status-dot${device.status === 'active' ? ' active' : ''}`} />
              <span className="device-name">{device.name}</span>
              <span className="device-lastseen">{formatLastSeen(device.lastSeen)}</span>
              {device.permissions !== null && (
                <span className="device-custom-badge" title="Individuelle Berechtigungen">⚙️</span>
              )}
            </div>
            <div className="device-item-actions">
              {device.status === 'active' ? (
                <>
                  <button
                    type="button"
                    className="device-btn edit"
                    onClick={() =>
                      expandedId === device.deviceId
                        ? setExpandedId(null)
                        : startEdit(device)
                    }
                    title="Berechtigungen bearbeiten"
                  >
                    {expandedId === device.deviceId ? '✕' : '✏️'}
                  </button>
                  <button
                    type="button"
                    className="device-btn revoke"
                    onClick={() => onRevoke(device.deviceId)}
                    title="Gerät sperren"
                  >
                    🚫
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="device-btn restore"
                  onClick={() => onRestore(device.deviceId)}
                  title="Gerät entsperren"
                >
                  ✅ Entsperren
                </button>
              )}
            </div>
          </div>

          {expandedId === device.deviceId && editingPerms[device.deviceId] && (
            <div className="device-permissions-panel">
              <PermissionsEditor
                permissions={editingPerms[device.deviceId]}
                onChange={(updated) =>
                  setEditingPerms((prev) => ({ ...prev, [device.deviceId]: updated }))
                }
                fieldsCount={fieldsCount}
                title="Berechtigungen für dieses Gerät"
              />
              <div className="device-permissions-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => saveEdit(device.deviceId)}
                >
                  Speichern
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => resetToDefault(device.deviceId)}
                  title="Individuelle Einstellungen löschen und Session-Standard verwenden"
                >
                  Auf Standard zurücksetzen
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
