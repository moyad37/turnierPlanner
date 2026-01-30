// ============================================
// Export-Funktionen (CSV, Excel, Print)
// ============================================

import type { Schedule, Player, PlayerStats } from '../types';

// Escape CSV-Werte
function escapeCSV(value: string | number | null): string {
  if (value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Finde Spielernamen nach ID
function getPlayerName(playerId: string, players: Player[]): string {
  return players.find(p => p.id === playerId)?.name || playerId;
}

// Exportiere Schedule als CSV
export function exportScheduleCSV(schedule: Schedule, players: Player[]): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Runde,Spiel,Feld,Team A,Team B,Ergebnis A,Ergebnis B');
  
  for (const round of schedule.rounds) {
    for (const match of round.matches) {
      const teamANames = match.teamA.playerIds
        .map(id => getPlayerName(id, players))
        .join(' / ');
      const teamBNames = match.teamB.playerIds
        .map(id => getPlayerName(id, players))
        .join(' / ');
      
      lines.push([
        round.index + 1,
        match.matchIndex + 1,
        match.fieldNumber,
        escapeCSV(teamANames),
        escapeCSV(teamBNames),
        match.scoreA ?? '',
        match.scoreB ?? '',
      ].join(','));
    }
    
    // Bye-Spieler als eigene Zeile
    if (round.byePlayerIds.length > 0) {
      const byeNames = round.byePlayerIds
        .map(id => getPlayerName(id, players))
        .join(' / ');
      lines.push([
        round.index + 1,
        'Pause',
        '-',
        escapeCSV(byeNames),
        '',
        '',
        '',
      ].join(','));
    }
  }
  
  return lines.join('\n');
}

// Exportiere Statistiken als CSV
export function exportStatsCSV(stats: PlayerStats[]): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Rang,Spieler,Spiele,Siege,Unentschieden,Niederlagen,Tore,Gegentore,Differenz,Punkte');
  
  for (const stat of stats) {
    lines.push([
      stat.rank,
      escapeCSV(stat.playerName),
      stat.gamesPlayed,
      stat.wins,
      stat.draws,
      stat.losses,
      stat.goalsFor,
      stat.goalsAgainst,
      stat.goalDifference,
      stat.points,
    ].join(','));
  }
  
  return lines.join('\n');
}

// Download-Helper
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Generiere Druckansicht HTML
export function generatePrintHTML(
  schedule: Schedule,
  players: Player[],
  stats: PlayerStats[]
): string {
  let html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Turnierplan</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
    h1 { font-size: 18px; margin-bottom: 20px; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #000; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .round-header { background-color: #e0e0e0; font-weight: bold; }
    .bye { font-style: italic; color: #666; }
    .score { text-align: center; }
    @media print {
      .no-print { display: none; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>Holländisches Turnier - Spielplan</h1>
  <p>Erstellt: ${new Date().toLocaleDateString('de-DE')} | Seed: ${schedule.seed}</p>
  
  <h2>Spielplan</h2>
  <table>
    <thead>
      <tr>
        <th>Runde</th>
        <th>Feld</th>
        <th>Team A</th>
        <th>Ergebnis</th>
        <th>Team B</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const round of schedule.rounds) {
    for (let i = 0; i < round.matches.length; i++) {
      const match = round.matches[i];
      const teamANames = match.teamA.playerIds
        .map(id => getPlayerName(id, players))
        .join(', ');
      const teamBNames = match.teamB.playerIds
        .map(id => getPlayerName(id, players))
        .join(', ');
      
      const scoreText = match.scoreA !== null && match.scoreB !== null
        ? `${match.scoreA} : ${match.scoreB}`
        : '- : -';
      
      html += `
      <tr>
        <td>${i === 0 ? `Runde ${round.index + 1}` : ''}</td>
        <td>Feld ${match.fieldNumber}</td>
        <td>${teamANames}</td>
        <td class="score">${scoreText}</td>
        <td>${teamBNames}</td>
      </tr>
`;
    }
    
    if (round.byePlayerIds.length > 0) {
      const byeNames = round.byePlayerIds
        .map(id => getPlayerName(id, players))
        .join(', ');
      html += `
      <tr class="bye">
        <td></td>
        <td colspan="4">Pause: ${byeNames}</td>
      </tr>
`;
    }
  }

  html += `
    </tbody>
  </table>
  
  <h2>Spieler-Statistiken</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Spieler</th>
        <th>Sp</th>
        <th>S</th>
        <th>U</th>
        <th>N</th>
        <th>Tore</th>
        <th>Gegen</th>
        <th>Diff</th>
        <th>Pkt</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const stat of stats) {
    html += `
      <tr>
        <td>${stat.rank}</td>
        <td>${stat.playerName}</td>
        <td>${stat.gamesPlayed}</td>
        <td>${stat.wins}</td>
        <td>${stat.draws}</td>
        <td>${stat.losses}</td>
        <td>${stat.goalsFor}</td>
        <td>${stat.goalsAgainst}</td>
        <td>${stat.goalDifference > 0 ? '+' : ''}${stat.goalDifference}</td>
        <td><strong>${stat.points}</strong></td>
      </tr>
`;
  }

  html += `
    </tbody>
  </table>
</body>
</html>
`;

  return html;
}

// Öffne Druckansicht
export function openPrintView(
  schedule: Schedule,
  players: Player[],
  stats: PlayerStats[]
): void {
  const html = generatePrintHTML(schedule, players, stats);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Kurz warten, dann Druckdialog öffnen
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
