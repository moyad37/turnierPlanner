// ============================================
// Validierungslogik für Turniereinstellungen
// ============================================

import type { Settings, ValidationResult } from '../types';

export function validateSettings(settings: Settings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    players,
    playersPerTeam,
    teamsPerRound,
    roundsCount,
    fieldsCount,
    allowByes,
  } = settings;

  // Grundlegende Validierungen
  if (players.length < 2) {
    errors.push('Mindestens 2 Spieler werden benötigt.');
  }

  if (playersPerTeam < 1) {
    errors.push('Mindestens 1 Spieler pro Team erforderlich.');
  }

  if (teamsPerRound < 2) {
    errors.push('Mindestens 2 Teams pro Runde erforderlich.');
  }

  if (teamsPerRound % 2 !== 0) {
    errors.push('Anzahl Teams pro Runde muss gerade sein (für Paarungen).');
  }

  if (roundsCount < 1) {
    errors.push('Mindestens 1 Runde erforderlich.');
  }

  if (fieldsCount < 1) {
    errors.push('Mindestens 1 Spielfeld erforderlich.');
  }

  // Berechne benötigte Spieler pro Runde
  const playersNeededPerRound = teamsPerRound * playersPerTeam;
  const matchesPerRound = teamsPerRound / 2;

  // Feldvalidierung
  if (fieldsCount > matchesPerRound) {
    warnings.push(
      `Mehr Felder (${fieldsCount}) als Spiele pro Runde (${matchesPerRound}). ` +
      `Nur ${matchesPerRound} Felder werden genutzt.`
    );
  }

  // Spieleranzahl-Validierung
  if (!allowByes) {
    // Alle Spieler nehmen teil — überschüssige werden als Auswechselspieler verteilt
    if (players.length < playersNeededPerRound) {
      errors.push(
        `Zu wenige Spieler: ${players.length} vorhanden, aber mindestens ${playersNeededPerRound} ` +
        `werden benötigt (${teamsPerRound} Teams × ${playersPerTeam} Spieler).`
      );
    } else if (players.length > playersNeededPerRound) {
      const extraPlayers = players.length - playersNeededPerRound;
      const teamsWithSub = extraPlayers % teamsPerRound === 0
        ? teamsPerRound
        : extraPlayers % teamsPerRound;
      warnings.push(
        `${extraPlayers} Spieler werden als Auswechselspieler (🔄) eingeteilt: ` +
        `${teamsWithSub} Teams bekommen einen zusätzlichen Auswechselspieler.`
      );
    }
  } else {
    if (players.length < playersNeededPerRound) {
      errors.push(
        `Zu wenige Spieler: ${players.length} vorhanden, aber ${playersNeededPerRound} ` +
        `werden pro Runde benötigt (${teamsPerRound} Teams × ${playersPerTeam} Spieler).`
      );
    }

    if (players.length > playersNeededPerRound) {
      const byesPerRound = players.length - playersNeededPerRound;
      warnings.push(
        `${byesPerRound} Spieler werden pro Runde pausieren (Bye).`
      );
    }
  }

  // Warnung bei sehr vielen Runden
  if (roundsCount > 50) {
    warnings.push('Viele Runden können die Performance beeinträchtigen.');
  }

  // Warnung bei doppelten Spielernamen
  const names = players.map(p => p.name.toLowerCase().trim());
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    warnings.push('Es gibt doppelte Spielernamen.');
  }

  // Warnung bei leeren Namen
  if (players.some(p => !p.name.trim())) {
    errors.push('Alle Spieler müssen einen Namen haben.');
  }

  // ============================================
  // Altersgruppen-Prüfung
  // ============================================
  if (settings.ageGroupSettings?.enabled) {
    const maxDiff = settings.ageGroupSettings.maxAgeDifference;
    const playersWithAge = players.filter(p => typeof p.age === 'number');
    const playersWithoutAge = players.filter(p => typeof p.age !== 'number');

    if (playersWithAge.length === 0) {
      warnings.push(
        'Altersgruppen-Prüfung ist aktiviert, aber kein Spieler hat ein Alter angegeben. ' +
        'Bitte trage die Alter der Spieler ein.'
      );
    } else {
      if (playersWithoutAge.length > 0) {
        warnings.push(
          `${playersWithoutAge.length} Spieler haben kein Alter angegeben. ` +
          'Die Altersgruppen-Prüfung gilt nur für Spieler mit Altersangabe.'
        );
      }

      // Altersgruppen bilden: Spieler werden nach Alters-Fenstern gruppiert
      const groupMap = new Map<number, typeof playersWithAge>();
      for (const player of playersWithAge) {
        const groupKey = Math.floor(player.age! / maxDiff);
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        groupMap.get(groupKey)!.push(player);
      }

      // Warnung: Zu wenige Spieler in einer Altersgruppe für ein vollständiges Team
      if (groupMap.size > 1) {
        for (const [groupKey, groupPlayers] of groupMap) {
          const ageStart = groupKey * maxDiff;
          const ageEnd = ageStart + maxDiff - 1;
          if (groupPlayers.length < playersPerTeam) {
            errors.push(
              `⚠️ Altersgruppen-Problem: Die Gruppe "${ageStart}–${ageEnd} Jahre" hat nur ` +
              `${groupPlayers.length} Spieler (benötigt: ${playersPerTeam} pro Team). ` +
              `Diese Spieler (${groupPlayers.map(p => p.name).join(', ')}) können kein ` +
              `eigenständiges Team bilden und würden zwangsläufig gegen ältere/jüngere Spieler ` +
              `antreten. Bitte passe die Teamgröße an oder entferne die Altersgruppen-Prüfung.`
            );
          }
        }
      }

      // Warnung: Alters-Differenz zu groß innerhalb eines Matches (alle Spieler auf Basis der Gesamtliste)
      const ages = playersWithAge.map(p => p.age!);
      const minAge = Math.min(...ages);
      const maxAge = Math.max(...ages);
      if (maxAge - minAge > maxDiff && groupMap.size > 1) {
        warnings.push(
          `Altersgruppen-Prüfung aktiv: Spieler-Altersspanne ${minAge}–${maxAge} Jahre ` +
          `(max. erlaubte Differenz: ${maxDiff} Jahre). Der Generator wird versuchen, ` +
          `altersgemischte Spiele zu vermeiden.`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getMatchesPerRound(teamsPerRound: number): number {
  return teamsPerRound / 2;
}

export function getPlayersNeededPerRound(
  teamsPerRound: number,
  playersPerTeam: number
): number {
  return teamsPerRound * playersPerTeam;
}

export function getByesPerRound(
  playerCount: number,
  teamsPerRound: number,
  playersPerTeam: number
): number {
  const needed = getPlayersNeededPerRound(teamsPerRound, playersPerTeam);
  return Math.max(0, playerCount - needed);
}
