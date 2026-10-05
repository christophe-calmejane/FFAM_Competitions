import { describe, it, expect } from 'vitest';
import {
  finishCompetition,
  applyFlightEdit,
  canResumeLastFlight,
  resumeLastFlight,
  canMergeWithNextFlight,
  mergeWithNextFlight,
} from '../src/backend/competition/competition';
import {
  getFlightScoreBreakdown,
  getTakeoffDelay,
  isFlightInterruptedByCompetitionEnd,
} from '../src/backend/scoring/rules';
import { DEFAULT_3H_SETTINGS } from '../src/backend/types';
import type { Competition, CompetitionSettings, Flight } from '../src/backend/types';

const START = 1_000_000;
const TEN_MINUTES = 10 * 60 * 1000;
const SETTINGS: CompetitionSettings = { ...DEFAULT_3H_SETTINGS, id: '3h' };

function makeFlight(
  id: string,
  start: number,
  end: number | null,
  previousEnd: number | null,
  pilotId = 'p1'
): Flight {
  return {
    id,
    teamId: 'team1',
    pilotId,
    flightNumber: 1,
    startTimestamp: start,
    endTimestamp: end,
    duration: end === null ? 0 : end - start,
    previousFlightEndTimestamp: previousEnd,
    safetyTimeViolation: false,
    flightDurationPenalty: 0,
    earlyTakeoffPenalty: 0,
    lateRelayPenalty: 0,
    manualPenalties: [],
    tableAnnounced: false,
    tableSuccess: null,
  };
}

function makeCompetition(flights: Flight[]): Competition {
  return {
    id: 'comp1',
    type: '3h',
    teamId: 'team1',
    startTimestamp: START,
    endTimestamp: null,
    isActive: true,
    currentFlightId: null,
    safetyPeriodEndTimestamp: null,
    flights,
    createdAt: START,
  };
}

describe('finishCompetition', () => {
  it('should close the flight in progress and flag it as interrupted', () => {
    const competition = makeCompetition([makeFlight('f1', START + 1000, null, null)]);
    const now = START + 5 * 60 * 1000;

    finishCompetition(competition, SETTINGS, now);

    expect(competition.endTimestamp).toBe(now);
    expect(competition.isActive).toBe(false);
    expect(competition.flights[0].endTimestamp).toBe(now);
    expect(competition.flights[0].endedByCompetitionEnd).toBe(true);
  });

  it('should never end after the official end (e.g. app resumed late)', () => {
    const competition = makeCompetition([makeFlight('f1', START + 1000, null, null)]);
    const officialEnd = START + SETTINGS.totalDuration;

    finishCompetition(competition, SETTINGS, officialEnd + 90 * 1000);

    expect(competition.endTimestamp).toBe(officialEnd);
    expect(competition.flights[0].endTimestamp).toBe(officialEnd);
  });

  it('should not flag landed flights', () => {
    const competition = makeCompetition([makeFlight('f1', START + 1000, START + 1000 + TEN_MINUTES, null)]);

    finishCompetition(competition, SETTINGS, START + TEN_MINUTES + 30 * 1000);

    expect(competition.flights[0].endedByCompetitionEnd).toBeUndefined();
  });
});

describe('applyFlightEdit', () => {
  function makeTwoFlights(): Competition {
    const end1 = START + 1000 + TEN_MINUTES;
    return makeCompetition([
      makeFlight('f1', START + 1000, end1, null),
      makeFlight('f2', end1 + 29 * 1000, end1 + 29 * 1000 + TEN_MINUTES, end1),
    ]);
  }

  it('should move the flight when the takeoff delay changes, keeping its duration', () => {
    const competition = makeTwoFlights();

    expect(applyFlightEdit(competition, 'f2', { takeoffDelayMs: 41 * 1000 })).toBe(true);

    const flight = competition.flights[1];
    expect(getTakeoffDelay(competition, 1)).toBe(41 * 1000);
    expect(flight.endTimestamp! - flight.startTimestamp).toBe(TEN_MINUTES);
    expect(flight.duration).toBe(TEN_MINUTES);
  });

  it('should rescore the takeoff after an edit', () => {
    const competition = makeTwoFlights();
    expect(getFlightScoreBreakdown(competition, 1, SETTINGS).earlyTakeoffPenalty).toBe(20);

    applyFlightEdit(competition, 'f2', { takeoffDelayMs: 31 * 1000 });

    expect(getFlightScoreBreakdown(competition, 1, SETTINGS).earlyTakeoffPenalty).toBe(0);
  });

  it('should edit the first takeoff relative to the competition start', () => {
    const competition = makeTwoFlights();

    applyFlightEdit(competition, 'f1', { takeoffDelayMs: 12 * 1000 });

    expect(getTakeoffDelay(competition, 0)).toBe(12 * 1000);
  });

  it('should not affect the other flights', () => {
    const competition = makeTwoFlights();
    const secondFlightBefore = { ...competition.flights[1] };

    applyFlightEdit(competition, 'f1', { takeoffDelayMs: 5000, durationMs: 9 * 60 * 1000 });

    expect(competition.flights[1]).toEqual(secondFlightBefore);
    expect(getTakeoffDelay(competition, 1)).toBe(29 * 1000);
  });

  it('should apply the duration after the takeoff shift', () => {
    const competition = makeTwoFlights();

    applyFlightEdit(competition, 'f2', { takeoffDelayMs: 35 * 1000, durationMs: 601 * 1000 });

    const flight = competition.flights[1];
    expect(getTakeoffDelay(competition, 1)).toBe(35 * 1000);
    expect(flight.endTimestamp! - flight.startTimestamp).toBe(601 * 1000);
  });

  it('should store the interrupted flag', () => {
    const competition = makeTwoFlights();

    applyFlightEdit(competition, 'f2', { endedByCompetitionEnd: true });

    expect(competition.flights[1].endedByCompetitionEnd).toBe(true);
  });

  it('should refuse to edit a flight in progress or an unknown flight', () => {
    const competition = makeCompetition([makeFlight('f1', START + 1000, null, null)]);

    expect(applyFlightEdit(competition, 'f1', { durationMs: TEN_MINUTES })).toBe(false);
    expect(applyFlightEdit(competition, 'unknown', { durationMs: TEN_MINUTES })).toBe(false);
  });
});

describe('resumeLastFlight', () => {
  it('should resume the last landed flight, its timer still running from its takeoff', () => {
    const takeoff = START + 1000;
    const competition = makeCompetition([makeFlight('f1', takeoff, takeoff + 3 * 60 * 1000, null)]);

    expect(canResumeLastFlight(competition)).toBe(true);
    expect(resumeLastFlight(competition)).toBe(true);

    const flight = competition.flights[0];
    expect(flight.startTimestamp).toBe(takeoff);
    expect(flight.endTimestamp).toBeNull();
    expect(flight.duration).toBe(0);
    expect(competition.currentFlightId).toBe('f1');
  });

  it('should score the resumed flight from its original takeoff once it lands', () => {
    const takeoff = START + 1000;
    const competition = makeCompetition([makeFlight('f1', takeoff, takeoff + 3 * 60 * 1000, null)]);

    resumeLastFlight(competition);
    competition.flights[0].endTimestamp = takeoff + TEN_MINUTES;

    expect(getFlightScoreBreakdown(competition, 0, SETTINGS).flightDurationPenalty).toBe(0);
  });

  it('should refuse when nobody flew, a flight is in progress or the competition is over', () => {
    expect(resumeLastFlight(makeCompetition([]))).toBe(false);

    const flying = makeCompetition([makeFlight('f1', START + 1000, null, null)]);
    expect(canResumeLastFlight(flying)).toBe(false);
    expect(resumeLastFlight(flying)).toBe(false);

    const ended = makeCompetition([makeFlight('f1', START + 1000, START + 1000 + TEN_MINUTES, null)]);
    finishCompetition(ended, SETTINGS, START + TEN_MINUTES + 20 * 1000);
    expect(resumeLastFlight(ended)).toBe(false);
    expect(ended.flights[0].endTimestamp).toBe(START + 1000 + TEN_MINUTES);
  });
});

describe('mergeWithNextFlight', () => {
  // Flight stopped by mistake after 4 minutes, restarted 5 seconds later (early takeoff),
  // landing 10 minutes after the first takeoff, followed by another pilot
  const TAKEOFF = START + 1000;
  const MISTAKE = TAKEOFF + 4 * 60 * 1000;
  const RESTART = MISTAKE + 5000;
  const LANDING = TAKEOFF + TEN_MINUTES;
  const NEXT_TAKEOFF = LANDING + 35 * 1000;

  function makeStoppedByMistake(): Competition {
    return makeCompetition([
      makeFlight('f1', TAKEOFF, MISTAKE, null),
      makeFlight('f2', RESTART, LANDING, MISTAKE),
      makeFlight('f3', NEXT_TAKEOFF, NEXT_TAKEOFF + TEN_MINUTES, LANDING, 'p2'),
    ]);
  }

  it('should make a single flight from the first takeoff to the second landing', () => {
    const competition = makeStoppedByMistake();

    expect(mergeWithNextFlight(competition, 'f1')).toBe(true);

    expect(competition.flights.map(f => f.id)).toEqual(['f1', 'f3']);
    const flight = competition.flights[0];
    expect(flight.startTimestamp).toBe(TAKEOFF);
    expect(flight.endTimestamp).toBe(LANDING);
    expect(flight.duration).toBe(TEN_MINUTES);
  });

  it('should drop the penalties of the short flight and of the early takeoff', () => {
    const competition = makeStoppedByMistake();
    expect(getFlightScoreBreakdown(competition, 0, SETTINGS).flightDurationPenalty).toBe(60);
    expect(getFlightScoreBreakdown(competition, 1, SETTINGS).earlyTakeoffPenalty).toBe(20);

    mergeWithNextFlight(competition, 'f1');

    expect(getFlightScoreBreakdown(competition, 0, SETTINGS).total).toBe(0);
  });

  it('should not affect the following flights, only renumber them', () => {
    const competition = makeStoppedByMistake();
    const delayBefore = getTakeoffDelay(competition, 2);

    mergeWithNextFlight(competition, 'f1');

    expect(getTakeoffDelay(competition, 1)).toBe(delayBefore);
    expect(competition.flights.map(f => f.flightNumber)).toEqual([1, 2]);
  });

  it('should keep the manual penalties of both flights and the latest table announcement', () => {
    const competition = makeStoppedByMistake();
    const [first, second] = competition.flights;
    first.manualPenalties = [{ type: 'control_takeover', points: 10, description: 'A' }];
    first.tableAnnounced = true;
    first.tableSuccess = false;
    second.manualPenalties = [{ type: 'landing_outside', points: 10, description: 'B' }];
    second.tableAnnounced = true;
    second.tableSuccess = true;

    mergeWithNextFlight(competition, 'f1');

    const flight = competition.flights[0];
    expect(flight.manualPenalties.map(p => p.description)).toEqual(['A', 'B']);
    expect(flight.tableAnnounced).toBe(true);
    expect(flight.tableSuccess).toBe(true);
  });

  it('should keep the table announcement of the first flight when the second has none', () => {
    const competition = makeStoppedByMistake();
    competition.flights[0].tableAnnounced = true;
    competition.flights[0].tableSuccess = true;

    mergeWithNextFlight(competition, 'f1');

    expect(competition.flights[0].tableAnnounced).toBe(true);
    expect(competition.flights[0].tableSuccess).toBe(true);
  });

  it('should keep the second flight interrupted by the end of the competition', () => {
    const competition = makeCompetition([
      makeFlight('f1', TAKEOFF, MISTAKE, null),
      makeFlight('f2', RESTART, null, MISTAKE),
    ]);
    finishCompetition(competition, SETTINGS, RESTART + 60 * 1000);

    mergeWithNextFlight(competition, 'f1');

    expect(competition.flights).toHaveLength(1);
    expect(isFlightInterruptedByCompetitionEnd(competition, 0)).toBe(true);
  });

  it('should only merge two landed consecutive flights of the same pilot', () => {
    const competition = makeStoppedByMistake();
    expect(canMergeWithNextFlight(competition, 0)).toBe(true);
    expect(canMergeWithNextFlight(competition, 1)).toBe(false); // Different pilots
    expect(canMergeWithNextFlight(competition, 2)).toBe(false); // No next flight
    expect(mergeWithNextFlight(competition, 'f2')).toBe(false);
    expect(mergeWithNextFlight(competition, 'f3')).toBe(false);
    expect(mergeWithNextFlight(competition, 'unknown')).toBe(false);
    expect(competition.flights).toHaveLength(3);

    const flying = makeCompetition([
      makeFlight('f1', TAKEOFF, MISTAKE, null),
      makeFlight('f2', RESTART, null, MISTAKE),
    ]);
    expect(canMergeWithNextFlight(flying, 0)).toBe(false);
    expect(mergeWithNextFlight(flying, 'f1')).toBe(false);
  });
});
