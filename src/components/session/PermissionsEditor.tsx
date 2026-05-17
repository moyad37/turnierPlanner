// ============================================
// PermissionsEditor – Berechtigungen konfigurieren
// ============================================

import type { SessionPermissions } from '../../types/session';

interface PermissionsEditorProps {
  permissions: SessionPermissions;
  onChange: (updated: SessionPermissions) => void;
  fieldsCount: number;
  title?: string;
}

export function PermissionsEditor({
  permissions,
  onChange,
  fieldsCount,
  title = 'Berechtigungen',
}: PermissionsEditorProps) {
  const allFields = Array.from({ length: fieldsCount }, (_, i) => i + 1);

  function toggle(key: keyof Omit<SessionPermissions, 'allowedFields'>) {
    onChange({ ...permissions, [key]: !permissions[key] });
  }

  function toggleField(fieldNumber: number) {
    const current = permissions.allowedFields;
    if (current === null) {
      // Alle → nur dieses Feld entfernen
      const next = allFields.filter((f) => f !== fieldNumber);
      onChange({ ...permissions, allowedFields: next.length === allFields.length ? null : next });
    } else if (current.includes(fieldNumber)) {
      const next = current.filter((f) => f !== fieldNumber);
      onChange({ ...permissions, allowedFields: next.length === 0 ? [fieldNumber] : next });
    } else {
      const next = [...current, fieldNumber].sort((a, b) => a - b);
      onChange({
        ...permissions,
        allowedFields: next.length === allFields.length ? null : next,
      });
    }
  }

  function setAllFields(all: boolean) {
    onChange({ ...permissions, allowedFields: all ? null : [] });
  }

  const isFieldAllowed = (f: number) =>
    permissions.allowedFields === null || permissions.allowedFields.includes(f);

  return (
    <div className="permissions-editor">
      <h4 className="permissions-title">{title}</h4>

      <div className="permissions-checkboxes">
        <label className="perm-checkbox">
          <input
            type="checkbox"
            checked={permissions.canViewLiveTable}
            onChange={() => toggle('canViewLiveTable')}
          />
          Live-Tabelle sehen
        </label>
        <label className="perm-checkbox">
          <input
            type="checkbox"
            checked={permissions.canViewSchedule}
            onChange={() => toggle('canViewSchedule')}
          />
          Spielplan sehen
        </label>
        <label className="perm-checkbox">
          <input
            type="checkbox"
            checked={permissions.canViewPlayerAssignments}
            onChange={() => toggle('canViewPlayerAssignments')}
          />
          Spieleraufteilung sehen
        </label>
      </div>

      <div className="permissions-fields">
        <div className="permissions-fields-header">
          <span>Erlaubte Felder</span>
          <label className="perm-checkbox">
            <input
              type="checkbox"
              checked={permissions.allowedFields === null}
              onChange={(e) => setAllFields(e.target.checked)}
            />
            Alle
          </label>
        </div>
        <div className="field-toggles">
          {allFields.map((f) => (
            <button
              key={f}
              type="button"
              className={`field-toggle-btn${isFieldAllowed(f) ? ' active' : ''}`}
              onClick={() => toggleField(f)}
            >
              Feld {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
