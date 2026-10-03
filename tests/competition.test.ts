import { describe, it, expect } from 'vitest';
import { finishCompetition, applyFlightEdit } from '../src/backend/competition/competition';
import { getFlightScoreBreakdown, getTakeoffDelay } from '../src/backend/scoring/rules';
import { DEFAULT_3H_SETTINGS } from '../src/backend/types';
import type { Competition, CompetitionSettings, Flight } from '../src/backend/types';

const START = 1_000_000;
const TEN_MINUTES = 10 * 60 * 1000;
const SETTINGS: CompetitionSettings = { ...DEFAULT_3H_SETTINGS, id: '3h' };

function makeFlight(id: string, start: number, end: number | null, previousEnd: number | null): Flight {
  return {
    id,
    teamId: 'team1',
    pilotId: 'p1',
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
