import { describe, it, expect } from 'vitest';
import {
  calculateFlightDurationPenalty,
  calculateEarlyTakeoffPenalty91min,
  calculateEarlyTakeoffPenalty3h,
  calculateLateRelayPenalty,
  calculateTablePoints,
  sumManualPenalties,
  calculateTeamBonuses,
  calculateTotalScore,
  getFlightScoreBreakdown,
  getScoreBreakdown,
  getTakeoffDelay,
  getMissedTakeoffDelay,
  isFlightInterruptedByCompetitionEnd,
} from '../src/backend/scoring/rules';
import {
  DEFAULT_91MIN_SETTINGS,
  DEFAULT_3H_SETTINGS,
} from '../src/backend/types';
import type {
  Team,
  Competition,
  CompetitionSettings,
  Flight,
} from '../src/backend/types';

describe('Flight Duration Penalty', () => {
  it('should return 0 for exact target duration', () => {
    const penalty = calculateFlightDurationPenalty(
      4 * 60 * 1000, // 4 minutes
      4 * 60 * 1000, // target: 4 minutes
      10, // 10 second intervals
      null // no max
    );
    expect(penalty).toBe(0);
  });

  it('should calculate penalty for flight over target (91min rules)', () => {
    // 4 minutes 15 seconds = 15 seconds over
    // 15 / 10 = 1.5, ceil = 2 points
    const penalty = calculateFlightDurationPenalty(
      4 * 60 * 1000 + 15 * 1000,
      4 * 60 * 1000,
      10,
      null
    );
    expect(penalty).toBe(2);
  });

  it('should calculate penalty for flight under target (91min rules)', () => {
    // 3 minutes 30 seconds = 30 seconds under
    // 30 / 10 = 3 points
    const penalty = calculateFlightDurationPenalty(
      3 * 60 * 1000 + 30 * 1000,
      4 * 60 * 1000,
      10,
      null
    );
    expect(penalty).toBe(3);
  });

  it('should respect max penalty limit (3h rules)', () => {
    // 10 minutes + 5 minutes over = 300 seconds
    // 300 / 2 = 150 points, but max is 60
    const penalty = calculateFlightDurationPenalty(
      15 * 60 * 1000,
      10 * 60 * 1000,
      2,
      60
    );
    expect(penalty).toBe(60);
  });

  it('should use ceiling for fractional intervals', () => {
    // 1 second over = ceil(1/10) = 1 point
    const penalty = calculateFlightDurationPenalty(
      4 * 60 * 1000 + 1 * 1000,
      4 * 60 * 1000,
      10,
      null
    );
    expect(penalty).toBe(1);
  });
});

describe('Early Takeoff Penalty (91min)', () => {
  it('should return 0 when no safety time violation', () => {
    const penalty = calculateEarlyTakeoffPenalty91min(0);
    expect(penalty).toBe(0);
  });

  it('should return 0 for negative remaining time', () => {
    const penalty = calculateEarlyTakeoffPenalty91min(-5000);
    expect(penalty).toBe(0);
  });

  it('should calculate 1 point per second remaining', () => {
    // 5 seconds remaining = 5 points
    const penalty = calculateEarlyTakeoffPenalty91min(5000);
    expect(penalty).toBe(5);
  });

  it('should use ceiling for fractional seconds', () => {
    // 5.5 seconds = ceil(5.5) = 6 points
    const penalty = calculateEarlyTakeoffPenalty91min(5500);
    expect(penalty).toBe(6);
  });
});

describe('Early Takeoff Penalty (3h)', () => {
  it('should return 0 when no safety time violation', () => {
    const penalty = calculateEarlyTakeoffPenalty3h(0);
    expect(penalty).toBe(0);
  });

  it('should return fixed 20 points for any violation', () => {
    const penalty = calculateEarlyTakeoffPenalty3h(5000);
    expect(penalty).toBe(20);
  });

  it('should return fixed 20 points regardless of duration', () => {
    const penalty = calculateEarlyTakeoffPenalty3h(19000);
    expect(penalty).toBe(20);
  });
});

describe('Late Relay Penalty', () => {
  it('should return 0 when relay is within allowed time', () => {
    const penalty = calculateLateRelayPenalty(
      25 * 1000, // 25 seconds
      30 * 1000, // max 30 seconds
      5 // 5 second intervals
    );
    expect(penalty).toBe(0);
  });

  it('should return 0 when relay is exactly at max time', () => {
    const penalty = calculateLateRelayPenalty(
      30 * 1000,
      30 * 1000,
      5
    );
    expect(penalty).toBe(0);
  });

  it('should calculate penalty for late relay (91min rules)', () => {
    // 40 seconds - 30 max = 10 seconds late
    // 10 / 5 = 2 points
    const penalty = calculateLateRelayPenalty(
      40 * 1000,
      30 * 1000,
      5
    );
    expect(penalty).toBe(2);
  });

  it('should use ceiling for fractional intervals', () => {
    // 31 seconds - 30 max = 1 second late
    // 1 / 5 = 0.2, ceil = 1 point
    const penalty = calculateLateRelayPenalty(
      31 * 1000,
      30 * 1000,
      5
    );
    expect(penalty).toBe(1);
  });
});

describe('Table Points (91min)', () => {
  it('should return 0 when table not announced', () => {
    const points = calculateTablePoints(false, null);
    expect(points).toBe(0);
  });

  it('should return -5 bonus for successful table landing', () => {
    const points = calculateTablePoints(true, true);
    expect(points).toBe(-5);
  });

  it('should return +3 penalty for failed table landing', () => {
    const points = calculateTablePoints(true, false);
    expect(points).toBe(3);
  });

  it('should return 0 when announced but no result yet', () => {
    const points = calculateTablePoints(true, null);
    expect(points).toBe(0);
  });
});

describe('Manual Penalties Sum', () => {
  it('should return 0 for empty array', () => {
    const sum = sumManualPenalties([]);
    expect(sum).toBe(0);
  });

  it('should sum all penalty points', () => {
    const penalties = [
      { type: 'test1', points: 10, description: 'Test 1' },
      { type: 'test2', points: 25, description: 'Test 2' },
    ];
    const sum = sumManualPenalties(penalties);
    expect(sum).toBe(35);
  });
});

describe('Team Bonuses', () => {
  it('should calculate female pilot bonus', () => {
    const team: Team = {
      id: 'test',
      name: 'Test Team',
      pilots: [
        { id: '1', name: 'Pilot 1', isFemale: true, hasThermalPlane: false },
        { id: '2', name: 'Pilot 2', isFemale: false, hasThermalPlane: false },
        { id: '3', name: 'Pilot 3', isFemale: true, hasThermalPlane: false },
      ],
      competitionType: '91min',
      createdAt: Date.now(),
    };

    const settings: CompetitionSettings = {
      ...DEFAULT_91MIN_SETTINGS,
      id: '91min',
    };

    const bonus = calculateTeamBonuses(team, settings);
    expect(bonus).toBe(-20); // 2 female pilots * -10
  });

  it('should return 0 with no female pilots', () => {
    const team: Team = {
      id: 'test',
      name: 'Test Team',
      pilots: [
        { id: '1', name: 'Pilot 1', isFemale: false, hasThermalPlane: false },
        { id: '2', name: 'Pilot 2', isFemale: false, hasThermalPlane: false },
      ],
      competitionType: '91min',
      createdAt: Date.now(),
    };

    const settings: CompetitionSettings = {
      ...DEFAULT_91MIN_SETTINGS,
      id: '91min',
    };

    const bonus = calculateTeamBonuses(team, settings);
    expect(bonus).toBe(0);
  });
});

describe('Total Score Calculation', () => {
  it('should calculate complete score for 91min competition', () => {
    const startTime = Date.now();
    
    const team: Team = {
      id: 'team1',
      name: 'Test Team',
      pilots: [
        { id: 'p1', name: 'Pilot 1', isFemale: true, hasThermalPlane: false },
        { id: 'p2', name: 'Pilot 2', isFemale: false, hasThermalPlane: false },
      ],
      competitionType: '91min',
      createdAt: startTime,
    };

    const flights: Flight[] = [
      {
        id: 'f1',
        teamId: 'team1',
        pilotId: 'p1',
        flightNumber: 1,
        startTimestamp: startTime + 5000, // 5 sec after start (ok)
        endTimestamp: startTime + 5000 + 4 * 60 * 1000, // exactly 4 min
        duration: 4 * 60 * 1000,
        previousFlightEndTimestamp: null,
        safetyTimeViolation: false,
        flightDurationPenalty: 0,
        earlyTakeoffPenalty: 0,
        lateRelayPenalty: 0,
        manualPenalties: [],
        tableAnnounced: true,
        tableSuccess: true, // -5 points
      },
    ];

    const competition: Competition = {
      id: 'comp1',
      type: '91min',
      teamId: 'team1',
      startTimestamp: startTime,
      // Ended 20s after the landing: no late relay for the takeoff that did not happen
      endTimestamp: startTime + 5000 + 4 * 60 * 1000 + 20 * 1000,
      isActive: false,
      currentFlightId: null,
      safetyPeriodEndTimestamp: null,
      flights,
      createdAt: startTime,
    };

    const settings: CompetitionSettings = {
      ...DEFAULT_91MIN_SETTINGS,
      id: '91min',
    };

    const score = calculateTotalScore(team, competition, settings);
    
    // Flight duration: 0 (exact 4 min)
    // Table success: -5
    // Female pilot: -10
    // Total: -15
    expect(score).toBe(-15);
  });

  it('should calculate penalties for 3h competition with no thermal plane', () => {
    const startTime = Date.now();
    
    const team: Team = {
      id: 'team1',
      name: 'Test Team',
      pilots: [
        { id: 'p1', name: 'Pilot 1', isFemale: false, hasThermalPlane: false },
        { id: 'p2', name: 'Pilot 2', isFemale: false, hasThermalPlane: false },
        { id: 'p3', name: 'Pilot 3', isFemale: false, hasThermalPlane: false },
        { id: 'p4', name: 'Pilot 4', isFemale: false, hasThermalPlane: false },
      ],
      competitionType: '3h',
      createdAt: startTime,
    };

    const competition: Competition = {
      id: 'comp1',
      type: '3h',
      teamId: 'team1',
      startTimestamp: startTime,
      endTimestamp: startTime + 3 * 60 * 60 * 1000,
      isActive: false,
      currentFlightId: null,
      safetyPeriodEndTimestamp: null,
      flights: [], // No flights = all 4 pilots never flew = 4 * 100 = 400 points
      createdAt: startTime,
    };

    const settings: CompetitionSettings = {
      ...DEFAULT_3H_SETTINGS,
      id: '3h',
    };

    const score = calculateTotalScore(team, competition, settings);
    
    // No thermal plane: +50
    // 4 pilots never flew: +400
    // Nobody took off during the 3h: late first takeoff ceil((10800s - 10s) / 10s) = +1079
    // Total: 1529
    expect(score).toBe(1529);
  });
});

describe('3h default settings', () => {
  it('should use the official timing values', () => {
    expect(DEFAULT_3H_SETTINGS.safetyTime).toBe(30 * 1000);
    expect(DEFAULT_3H_SETTINGS.maxRelayTime).toBe(40 * 1000);
    expect(DEFAULT_3H_SETTINGS.firstTakeoffMaxTime).toBe(10 * 1000);
  });
});

// ============ Shared 3h fixtures ============

const COMPETITION_START = 1_000_000;
const TEN_MINUTES = 10 * 60 * 1000;
const THREE_HOURS = 3 * 60 * 60 * 1000;
const SETTINGS_3H: CompetitionSettings = { ...DEFAULT_3H_SETTINGS, id: '3h' };

function makeFlight(overrides: Partial<Flight>): Flight {
  return {
    id: 'f',
    teamId: 'team1',
    pilotId: 'p1',
    flightNumber: 1,
    startTimestamp: COMPETITION_START,
    endTimestamp: COMPETITION_START + TEN_MINUTES,
    duration: TEN_MINUTES,
    previousFlightEndTimestamp: null,
    safetyTimeViolation: false,
    flightDurationPenalty: 0,
    earlyTakeoffPenalty: 0,
    lateRelayPenalty: 0,
    manualPenalties: [],
    tableAnnounced: false,
    tableSuccess: null,
    ...overrides,
  };
}

/**
 * Build a chained list of flights from [takeoffDelayMs, durationMs | null] pairs
 * (null duration = still flying).
 */
function makeCompetition(
  flightTimes: [number, number | null][],
  endTimestamp: number | null = null
): Competition {
  const flights: Flight[] = [];
  let previousEnd: number | null = null;
  let reference = COMPETITION_START;
  flightTimes.forEach(([takeoffDelay, duration], index) => {
    const start = reference + takeoffDelay;
    const end = duration === null ? null : start + duration;
    flights.push(makeFlight({
      id: `f${index + 1}`,
      flightNumber: index + 1,
      startTimestamp: start,
      endTimestamp: end,
      duration: duration ?? 0,
      previousFlightEndTimestamp: previousEnd,
      safetyTimeViolation: index > 0 && takeoffDelay < SETTINGS_3H.safetyTime,
    }));
    previousEnd = end;
    reference = end ?? start;
  });

  return {
    id: 'comp1',
    type: '3h',
    teamId: 'team1',
    startTimestamp: COMPETITION_START,
    endTimestamp,
    isActive: endTimestamp === null,
    currentFlightId: null,
    safetyPeriodEndTimestamp: null,
    flights,
    createdAt: COMPETITION_START,
  };
}

describe('Flight Score Breakdown (3h)', () => {
  it('should never apply an early takeoff penalty to the first flight', () => {
    // Takeoff 1s after the start, flagged as safety violation by older app versions
    const competition = makeCompetition([[1000, TEN_MINUTES]]);
    competition.flights[0].safetyTimeViolation = true;

    const breakdown = getFlightScoreBreakdown(competition, 0, SETTINGS_3H);

    expect(breakdown.earlyTakeoffPenalty).toBe(0);
    expect(breakdown.lateRelayPenalty).toBe(0);
    expect(breakdown.total).toBe(0);
  });

  it('should penalize a late first takeoff per started 10 seconds after 10 seconds', () => {
    const competition = makeCompetition([[21 * 1000, TEN_MINUTES]]);

    expect(getTakeoffDelay(competition, 0)).toBe(21 * 1000);
    expect(getFlightScoreBreakdown(competition, 0, SETTINGS_3H).lateRelayPenalty).toBe(2);
  });

  it('should apply 20 points for a takeoff during the 30s neutralisation', () => {
    const competition = makeCompetition([[0, TEN_MINUTES], [29 * 1000, TEN_MINUTES]]);
    const breakdown = getFlightScoreBreakdown(competition, 1, SETTINGS_3H);
    expect(breakdown.earlyTakeoffPenalty).toBe(20);
    expect(breakdown.lateRelayPenalty).toBe(0);
  });

  it('should derive the early takeoff from timestamps, not from the recorded flag', () => {
    const competition = makeCompetition([[0, TEN_MINUTES], [31 * 1000, TEN_MINUTES]]);
    competition.flights[1].safetyTimeViolation = true; // Stale flag (e.g. takeoff time edited)
    expect(getFlightScoreBreakdown(competition, 1, SETTINGS_3H).earlyTakeoffPenalty).toBe(0);
  });

  it('should not penalize a relay between 30s and 40s', () => {
    const competition = makeCompetition([[0, TEN_MINUTES], [39 * 1000, TEN_MINUTES]]);
    expect(getFlightScoreBreakdown(competition, 1, SETTINGS_3H).total).toBe(0);
  });

  it('should apply 1 point per started 10 seconds after 40s', () => {
    const late41 = makeCompetition([[0, TEN_MINUTES], [41 * 1000, TEN_MINUTES]]);
    const late51 = makeCompetition([[0, TEN_MINUTES], [51 * 1000, TEN_MINUTES]]);
    expect(getFlightScoreBreakdown(late41, 1, SETTINGS_3H).lateRelayPenalty).toBe(1);
    expect(getFlightScoreBreakdown(late51, 1, SETTINGS_3H).lateRelayPenalty).toBe(2);
  });

  it('should keep total score consistent with the breakdown', () => {
    const team: Team = {
      id: 'team1',
      name: 'Test Team',
      pilots: [
        { id: 'p1', name: 'Pilot 1', isFemale: false, hasThermalPlane: true },
        { id: 'p2', name: 'Pilot 2', isFemale: false, hasThermalPlane: false },
        { id: 'p3', name: 'Pilot 3', isFemale: false, hasThermalPlane: false },
        { id: 'p4', name: 'Pilot 4', isFemale: false, hasThermalPlane: false },
      ],
      competitionType: '3h',
      createdAt: COMPETITION_START,
    };
    // 4:31 -> capped at 60, then a relay at 41s; the second flight is still flying at the end
    const competition = makeCompetition([[1000, (4 * 60 + 31) * 1000], [41 * 1000, null]]);
    competition.flights[0].manualPenalties = [{ type: 'landing_outside', points: 10, description: 'Landing Outside Zone' }];
    competition.flights[1].pilotId = 'p2';
    competition.flights[1].endTimestamp = COMPETITION_START + THREE_HOURS;
    competition.flights[1].endedByCompetitionEnd = true;
    competition.endTimestamp = COMPETITION_START + THREE_HOURS;
    competition.isActive = false;

    const breakdown = getScoreBreakdown(team, competition, SETTINGS_3H);

    expect(breakdown.flightDurationPenalties).toBe(60 + 60); // Second flight overran 10 min before the end
    expect(breakdown.earlyTakeoffPenalties).toBe(0);
    expect(breakdown.lateRelayPenalties).toBe(1);
    expect(breakdown.manualPenalties).toBe(10);
    expect(breakdown.noThermalPenalty).toBe(0);
    expect(breakdown.pilotNeverFlewPenalty).toBe(200); // p3 and p4 never flew
    expect(calculateTotalScore(team, competition, SETTINGS_3H)).toBe(breakdown.total);
    expect(breakdown.total).toBe(331);
  });
});

describe('End of competition (3h)', () => {
  const landedAt = (secondsBeforeEnd: number) => THREE_HOURS - secondsBeforeEnd * 1000 - TEN_MINUTES;

  it('should not penalize a flight cut short by the end of the competition', () => {
    // Took off on time, still flying for 4:50 when the 3h ended
    const competition = makeCompetition([[1000, landedAt(0) - 1000], [35 * 1000, null]]);
    const lastFlight = competition.flights[1];
    lastFlight.endTimestamp = lastFlight.startTimestamp + (4 * 60 + 50) * 1000;
    lastFlight.endedByCompetitionEnd = true;
    competition.endTimestamp = lastFlight.endTimestamp;

    expect(isFlightInterruptedByCompetitionEnd(competition, 1)).toBe(true);
    expect(getFlightScoreBreakdown(competition, 1, SETTINGS_3H).flightDurationPenalty).toBe(0);
    expect(getMissedTakeoffDelay(competition)).toBeNull();
  });

  it('should still apply the takeoff penalties of the interrupted flight', () => {
    const competition = makeCompetition([[1000, TEN_MINUTES], [45 * 1000, null]]);
    const lastFlight = competition.flights[1];
    lastFlight.endTimestamp = lastFlight.startTimestamp + 60 * 1000;
    lastFlight.endedByCompetitionEnd = true;
    competition.endTimestamp = lastFlight.endTimestamp;

    const breakdown = getFlightScoreBreakdown(competition, 1, SETTINGS_3H);
    expect(breakdown.flightDurationPenalty).toBe(0);
    expect(breakdown.lateRelayPenalty).toBe(1);
  });

  it('should penalize the overrun of a flight still flying at the end', () => {
    const competition = makeCompetition([[1000, null]]);
    const flight = competition.flights[0];
    flight.endTimestamp = flight.startTimestamp + TEN_MINUTES + 20 * 1000;
    flight.endedByCompetitionEnd = true;
    competition.endTimestamp = flight.endTimestamp;

    expect(getFlightScoreBreakdown(competition, 0, SETTINGS_3H).flightDurationPenalty).toBe(10);
  });

  it('should treat a legacy last flight ending exactly with the competition as interrupted', () => {
    const competition = makeCompetition([[1000, 5 * 60 * 1000]]);
    competition.endTimestamp = competition.flights[0].endTimestamp;

    expect(competition.flights[0].endedByCompetitionEnd).toBeUndefined();
    expect(isFlightInterruptedByCompetitionEnd(competition, 0)).toBe(true);
    expect(getFlightScoreBreakdown(competition, 0, SETTINGS_3H).flightDurationPenalty).toBe(0);
  });

  it('should penalize a duration normally when the last flight landed before the end', () => {
    const competition = makeCompetition([[1000, 9 * 60 * 1000]]);
    competition.endTimestamp = competition.flights[0].endTimestamp! + 20 * 1000;

    expect(isFlightInterruptedByCompetitionEnd(competition, 0)).toBe(false);
    expect(getFlightScoreBreakdown(competition, 0, SETTINGS_3H).flightDurationPenalty).toBe(30);
  });

  it('should penalize a missing takeoff when the last landing left time to take off', () => {
    const team: Team = {
      id: 'team1',
      name: 'Test Team',
      pilots: [{ id: 'p1', name: 'Pilot 1', isFemale: false, hasThermalPlane: true }],
      competitionType: '3h',
      createdAt: COMPETITION_START,
    };

    // Landed 50s before the end and nobody took off: relay of 50s -> 1 point
    const competition = makeCompetition([[0, TEN_MINUTES]]);
    competition.endTimestamp = competition.flights[0].endTimestamp! + 50 * 1000;
    expect(getMissedTakeoffDelay(competition)).toBe(50 * 1000);
    expect(getScoreBreakdown(team, competition, SETTINGS_3H).lateRelayPenalties).toBe(1);

    // Landed 40s before the end: still within the allowed relay time
    competition.endTimestamp = competition.flights[0].endTimestamp! + 40 * 1000;
    expect(getScoreBreakdown(team, competition, SETTINGS_3H).lateRelayPenalties).toBe(0);
  });

  it('should not count a missing takeoff while the competition is running', () => {
    const competition = makeCompetition([[0, TEN_MINUTES]]);
    expect(getMissedTakeoffDelay(competition)).toBeNull();
  });
});
