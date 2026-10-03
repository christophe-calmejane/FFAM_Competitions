import type { Competition, CompetitionSettings } from '../types/index.js';
import { getTakeoffDelay } from '../scoring/rules.js';

// ============ End of Competition ============

/**
 * End the competition.
 * The end never goes past the official end (start + total duration), so a competition
 * closed late (e.g. app resumed after the device slept) still ends on time.
 * A flight still in progress is closed at the end and flagged as interrupted.
 */
export function finishCompetition(
  competition: Competition,
  settings: CompetitionSettings,
  now: number
): void {
  const officialEnd = (competition.startTimestamp ?? now) + settings.totalDuration;
  const endTimestamp = Math.min(now, officialEnd);

  const activeFlight = competition.flights.find(f => f.endTimestamp === null);
  if (activeFlight) {
    activeFlight.endTimestamp = Math.max(endTimestamp, activeFlight.startTimestamp);
    activeFlight.duration = activeFlight.endTimestamp - activeFlight.startTimestamp;
    activeFlight.endedByCompetitionEnd = true;
  }

  competition.endTimestamp = endTimestamp;
  competition.isActive = false;
  competition.currentFlightId = null;
}

// ============ Flight Editing ============

export interface FlightEdit {
  takeoffDelayMs?: number; // Time between the previous landing (or the start) and the takeoff
  durationMs?: number;
  endedByCompetitionEnd?: boolean;
}

/**
 * Apply a manual correction to a completed flight.
 * Takeoff delay and duration are independent: changing the takeoff delay moves the
 * whole flight (its duration is kept), changing the duration moves its landing.
 * Other flights are never affected.
 * Returns false when the flight cannot be edited.
 */
export function applyFlightEdit(
  competition: Competition,
  flightId: string,
  edit: FlightEdit
): boolean {
  const flightIndex = competition.flights.findIndex(f => f.id === flightId);
  const flight = competition.flights[flightIndex];
  if (!flight || flight.endTimestamp === null) {
    return false;
  }

  if (edit.takeoffDelayMs !== undefined) {
    const currentDelay = getTakeoffDelay(competition, flightIndex);
    if (currentDelay === null) {
      return false;
    }
    const shift = edit.takeoffDelayMs - currentDelay;
    flight.startTimestamp += shift;
    flight.endTimestamp += shift;
  }

  if (edit.durationMs !== undefined) {
    flight.endTimestamp = flight.startTimestamp + edit.durationMs;
  }

  if (edit.endedByCompetitionEnd !== undefined) {
    flight.endedByCompetitionEnd = edit.endedByCompetitionEnd;
  }

  flight.duration = flight.endTimestamp - flight.startTimestamp;
  return true;
}
