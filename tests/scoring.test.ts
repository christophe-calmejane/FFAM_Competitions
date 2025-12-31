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
      endTimestamp: startTime + 91 * 60 * 1000,
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
    // Total: 450
    expect(score).toBe(450);
  });
});
