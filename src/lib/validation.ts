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
    if (players.length !== playersNeededPerRound) {
      errors.push(
        `Ohne Pausen (Byes): Exakt ${playersNeededPerRound} Spieler benötigt ` +
        `(${teamsPerRound} Teams × ${playersPerTeam} Spieler). ` +
        `Aktuell: ${players.length} Spieler.`
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
