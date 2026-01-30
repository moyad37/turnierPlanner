// ============================================
// Export Buttons Komponente
// ============================================

import React from 'react';
import type { Schedule, Player, PlayerStats } from '../types';
import { 
  exportScheduleCSV, 
  exportStatsCSV, 
  downloadCSV, 
  openPrintView 
} from '../lib/export';

interface ExportButtonsProps {
  schedule: Schedule | null;
  players: Player[];
  stats: PlayerStats[];
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  schedule,
  players,
  stats,
}) => {
  if (!schedule) {
    return null;
  }

  const handleExportSchedule = () => {
    const csv = exportScheduleCSV(schedule, players);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `turnierplan_${date}.csv`);
  };

  const handleExportStats = () => {
    const csv = exportStatsCSV(stats);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `statistiken_${date}.csv`);
  };

  const handlePrint = () => {
    openPrintView(schedule, players, stats);
  };

  return (
    <div className="export-buttons">
      <button 
        type="button" 
        className="btn-export"
        onClick={handleExportSchedule}
        title="Spielplan als CSV exportieren"
      >
        📥 Spielplan CSV
      </button>
      
      <button 
        type="button" 
        className="btn-export"
        onClick={handleExportStats}
        title="Statistiken als CSV exportieren"
      >
        📊 Statistiken CSV
      </button>
      
      <button 
        type="button" 
        className="btn-export btn-print"
        onClick={handlePrint}
        title="Druckansicht öffnen"
      >
        🖨️ Drucken
      </button>
    </div>
  );
};
