import type { Player, Schedule, PlayerStats, Settings } from '../types';

// PDF Export via Browser Print
// Keine externe Bibliothek nötig - nutzt CSS Print Styles

interface ExportData {
  players: Player[];
  schedule: Schedule | null;
  stats: PlayerStats[];
  settings: Settings;
  tournamentName?: string;
  date?: string;
}

// Generiere druckbare HTML-Seite
function generatePrintHTML(data: ExportData): string {
  const { players, schedule, stats, settings, tournamentName, date } = data;
  
  const title = tournamentName || 'Turnier';
  const dateStr = date || new Date().toLocaleDateString('de-DE');
  
  // Sortiere Stats nach Rang
  const sortedStats = [...stats].sort((a, b) => a.rank - b.rank);
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title} - Ergebnisse</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      padding: 20px;
      background: white;
      color: black;
    }
    
    h1 {
      font-size: 24px;
      text-align: center;
      margin-bottom: 5px;
    }
    
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 20px;
    }
    
    h2 {
      font-size: 16px;
      margin: 20px 0 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      padding: 6px 8px;
      border: 1px solid #ddd;
      text-align: left;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    
    .rank-1 { background-color: #fef3c7; }
    .rank-2 { background-color: #f3f4f6; }
    .rank-3 { background-color: #fde68a; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    
    .match-row {
      margin-bottom: 4px;
      padding: 4px 8px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    
    .round-title {
      font-weight: 600;
      margin: 15px 0 8px;
      padding: 4px 8px;
      background: #e5e7eb;
    }
    
    .score {
      font-weight: bold;
      font-size: 14px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      padding: 10px;
      background: #f5f5f5;
      border-radius: 6px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
    }
    
    .stat-label {
      font-size: 11px;
      color: #666;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #888;
      text-align: center;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>⚽ ${title}</h1>
  <p class="subtitle">${dateStr} • ${players.length} Spieler • ${settings.playersPerTeam}v${settings.playersPerTeam}</p>
  
  <!-- Übersichts-Statistiken -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${players.length}</div>
      <div class="stat-label">Spieler</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${schedule?.rounds.length || 0}</div>
      <div class="stat-label">Runden</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${schedule?.rounds.reduce((sum, r) => sum + r.matches.length, 0) || 0}</div>
      <div class="stat-label">Spiele</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.reduce((sum, s) => sum + s.goalsScored, 0)}</div>
      <div class="stat-label">Tore</div>
    </div>
  </div>
  
  <!-- Tabelle -->
  <h2>🏆 Endstand</h2>
  <table>
    <thead>
      <tr>
        <th class="text-center">#</th>
        <th>Spieler</th>
        <th class="text-center">Sp</th>
        <th class="text-center">S</th>
        <th class="text-center">U</th>
        <th class="text-center">N</th>
        <th class="text-center">Tore</th>
        <th class="text-center">+/-</th>
        <th class="text-center font-bold">Pkt</th>
      </tr>
    </thead>
    <tbody>
      ${sortedStats.map(s => `
        <tr class="${s.rank <= 3 ? `rank-${s.rank}` : ''}">
          <td class="text-center font-bold">${s.rank}</td>
          <td>${s.playerName}</td>
          <td class="text-center">${s.gamesPlayed}</td>
          <td class="text-center">${s.wins}</td>
          <td class="text-center">${s.draws}</td>
          <td class="text-center">${s.losses}</td>
          <td class="text-center">${s.goalsScored}</td>
          <td class="text-center">${s.goalDifference > 0 ? '+' : ''}${s.goalDifference}</td>
          <td class="text-center font-bold">${s.points}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <!-- Spielplan mit Ergebnissen -->
  ${schedule ? `
    <h2>📋 Spielplan & Ergebnisse</h2>
    ${schedule.rounds.map((round, ri) => `
      <div class="round-title">Runde ${ri + 1}</div>
      ${round.matches.map(match => {
        const teamANames = match.teamA.playerIds
          .map(id => players.find(p => p.id === id)?.name || '?')
          .join(' & ');
        const teamBNames = match.teamB.playerIds
          .map(id => players.find(p => p.id === id)?.name || '?')
          .join(' & ');
        const hasScore = match.scoreA !== null && match.scoreB !== null;
        
        return `
          <div class="match-row">
            <span>${teamANames}</span>
            <span class="score" style="margin: 0 10px;">
              ${hasScore ? `${match.scoreA} : ${match.scoreB}` : '- : -'}
            </span>
            <span>${teamBNames}</span>
          </div>
        `;
      }).join('')}
    `).join('')}
  ` : ''}
  
  <div class="footer">
    Erstellt mit Holländisches Turnier App • ${new Date().toLocaleString('de-DE')}
  </div>
</body>
</html>
  `;
}

// Export als PDF via Print Dialog
export function exportToPDF(data: ExportData): void {
  const html = generatePrintHTML(data);
  
  // Neues Fenster öffnen
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup-Blocker aktiv! Bitte erlaube Popups für diese Seite.');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Warte auf Laden, dann drucken
  printWindow.onload = () => {
    printWindow.print();
  };
}

// Export nur Tabelle als PDF
export function exportStandingsToPDF(
  stats: PlayerStats[], 
  tournamentName?: string
): void {
  const sortedStats = [...stats].sort((a, b) => a.rank - b.rank);
  const dateStr = new Date().toLocaleDateString('de-DE');
  
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Tabelle - ${tournamentName || 'Turnier'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 30px;
    }
    h1 { text-align: center; margin-bottom: 20px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .text-center { text-align: center; }
    .rank-1 { background: #fef3c7; }
    .rank-2 { background: #f3f4f6; }
    .rank-3 { background: #fde68a; }
    .font-bold { font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>🏆 ${tournamentName || 'Turnier'} - Tabelle</h1>
  <p class="subtitle">${dateStr}</p>
  <table>
    <thead>
      <tr>
        <th class="text-center">#</th>
        <th>Spieler</th>
        <th class="text-center">Sp</th>
        <th class="text-center">S</th>
        <th class="text-center">U</th>
        <th class="text-center">N</th>
        <th class="text-center">Tore</th>
        <th class="text-center">+/-</th>
        <th class="text-center font-bold">Punkte</th>
      </tr>
    </thead>
    <tbody>
      ${sortedStats.map(s => `
        <tr class="${s.rank <= 3 ? `rank-${s.rank}` : ''}">
          <td class="text-center font-bold">${s.rank}</td>
          <td>${s.playerName}</td>
          <td class="text-center">${s.gamesPlayed}</td>
          <td class="text-center">${s.wins}</td>
          <td class="text-center">${s.draws}</td>
          <td class="text-center">${s.losses}</td>
          <td class="text-center">${s.goalsScored}</td>
          <td class="text-center">${s.goalDifference > 0 ? '+' : ''}${s.goalDifference}</td>
          <td class="text-center font-bold">${s.points}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup-Blocker aktiv! Bitte erlaube Popups für diese Seite.');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}

// Export Spielplan als PDF
export function exportScheduleToPDF(
  schedule: Schedule,
  players: Player[],
  tournamentName?: string
): void {
  const dateStr = new Date().toLocaleDateString('de-DE');
  
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Spielplan - ${tournamentName || 'Turnier'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 30px;
      font-size: 12px;
    }
    h1 { text-align: center; margin-bottom: 20px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
    .round { margin-bottom: 20px; }
    .round-title { 
      font-weight: bold; 
      background: #e5e7eb; 
      padding: 6px 12px; 
      margin-bottom: 8px;
      border-radius: 4px;
    }
    .match {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: #f9f9f9;
      margin-bottom: 4px;
      border-radius: 4px;
    }
    .team { flex: 1; }
    .score { 
      font-weight: bold; 
      font-size: 16px;
      margin: 0 15px;
      min-width: 60px;
      text-align: center;
    }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>📋 ${tournamentName || 'Turnier'} - Spielplan</h1>
  <p class="subtitle">${dateStr}</p>
  
  ${schedule.rounds.map((round, ri) => `
    <div class="round">
      <div class="round-title">Runde ${ri + 1}</div>
      ${round.matches.map(match => {
        const teamANames = match.teamA.playerIds
          .map(id => players.find(p => p.id === id)?.name || '?')
          .join(' & ');
        const teamBNames = match.teamB.playerIds
          .map(id => players.find(p => p.id === id)?.name || '?')
          .join(' & ');
        const hasScore = match.scoreA !== null && match.scoreB !== null;
        
        return `
          <div class="match">
            <div class="team">${teamANames}</div>
            <div class="score">${hasScore ? `${match.scoreA} : ${match.scoreB}` : '__ : __'}</div>
            <div class="team" style="text-align: right;">${teamBNames}</div>
          </div>
        `;
      }).join('')}
    </div>
  `).join('')}
</body>
</html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup-Blocker aktiv! Bitte erlaube Popups für diese Seite.');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
