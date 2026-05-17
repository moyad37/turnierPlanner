// ============================================
// Session-Types für Multi-Device Live-Session
// ============================================

export interface SessionPermissions {
  canViewLiveTable: boolean;
  canViewSchedule: boolean;
  canViewPlayerAssignments: boolean;
  /** null = alle Felder erlaubt */
  allowedFields: number[] | null;
}

export interface DeviceInfo {
  deviceId: string;
  name: string;
  joinedAt: string; // ISO timestamp
  lastSeen: string; // ISO timestamp
  /** null = Session-Default-Berechtigungen verwenden */
  permissions: SessionPermissions | null;
  status: 'active' | 'revoked';
}

export interface LiveResult {
  matchKey: string; // "r{roundIndex}_m{matchIndex}"
  roundIndex: number;
  matchIndex: number;
  scoreA: number;
  scoreB: number;
  scorersA: Record<string, number>;
  scorersB: Record<string, number>;
  deviceId: string;
  updatedAt: string; // ISO timestamp
}

export interface LiveSession {
  sessionId: string;
  adminUid: string;
  sessionCode: string; // 6 Zeichen, z.B. "AB1234"
  tournamentName: string;
  status: 'active' | 'closed';
  createdAt: string; // ISO timestamp
  defaultPermissions: SessionPermissions;
}
