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

// ============ Flight Resuming ============

/**
 * Whether the last flight can be resumed after it was stopped by mistake:
 * the competition is running, the last flight has landed and nobody took off since.
 */
export function canResumeLastFlight(competition: Competition): boolean {
  const lastFlight = competition.flights[competition.flights.length - 1];
  return competition.isActive
    && competition.endTimestamp === null
    && lastFlight !== undefined
    && lastFlight.endTimestamp !== null;
}

/**
 * Resume the last flight after it was stopped by mistake: it continues as if it had
 * never landed, its timer still running from its takeoff.
 * Returns false when there is no flight to resume.
 */
export function resumeLastFlight(competition: Competition): boolean {
  if (!canResumeLastFlight(competition)) {
    return false;
  }

  const lastFlight = competition.flights[competition.flights.length - 1];
  lastFlight.endTimestamp = null;
  lastFlight.duration = 0;

  competition.currentFlightId = lastFlight.id;
  competition.safetyPeriodEndTimestamp = null; // No safety period while flying
  return true;
}

// ============ Flight Merging ============

/**
 * Whether a flight can be merged with the next one: both have landed and were flown
 * by the same pilot (typically a flight stopped by mistake, then restarted).
 */
export function canMergeWithNextFlight(competition: Competition, flightIndex: number): boolean {
  const flight = competition.flights[flightIndex];
  const nextFlight = competition.flights[flightIndex + 1];
  return flight !== undefined
    && nextFlight !== undefined
    && flight.endTimestamp !== null
    && nextFlight.endTimestamp !== null
    && flight.pilotId === nextFlight.pilotId;
}

/**
 * Merge a flight with the next one into a single flight, from the first takeoff to
 * the second landing: the time spent on the ground in between counts as flight time,
 * and the second takeoff disappears along with its penalties.
 * Manual penalties of both flights are kept. Other flights are never affected.
 * Returns false when the flights cannot be merged.
 */
export function mergeWithNextFlight(competition: Competition, flightId: string): boolean {
  const flightIndex = competition.flights.findIndex(f => f.id === flightId);
  if (flightIndex < 0 || !canMergeWithNextFlight(competition, flightIndex)) {
    return false;
  }

  const flight = competition.flights[flightIndex];
  const nextFlight = competition.flights[flightIndex + 1];

  flight.endTimestamp = nextFlight.endTimestamp!; // Checked by canMergeWithNextFlight
  flight.duration = flight.endTimestamp - flight.startTimestamp;
  flight.endedByCompetitionEnd = nextFlight.endedByCompetitionEnd;
  flight.manualPenalties = [...flight.manualPenalties, ...nextFlight.manualPenalties];

  // A flight has a single table announcement: the latest one wins
  if (nextFlight.tableAnnounced) {
    flight.tableAnnounced = true;
    flight.tableSuccess = nextFlight.tableSuccess;
  }

  competition.flights.splice(flightIndex + 1, 1);
  competition.flights.forEach((f, index) => {
    f.flightNumber = index + 1;
  });
  return true;
}
