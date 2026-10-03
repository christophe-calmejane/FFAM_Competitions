import type {
  Competition,
  CompetitionSettings,
  Team,
  ManualPenalty,
} from '../types/index.js';

// ============ Flight Duration Penalty ============

export function calculateFlightDurationPenalty(
  flightDurationMs: number,
  targetDurationMs: number,
  penaltyIntervalSeconds: number,
  maxPenalty: number | null
): number {
  const deviationMs = Math.abs(flightDurationMs - targetDurationMs);
  const deviationSeconds = deviationMs / 1000;
  
  // Ceiling division: any fraction of interval counts as a full penalty point
  const penalty = Math.ceil(deviationSeconds / penaltyIntervalSeconds);
  
  if (maxPenalty !== null) {
    return Math.min(penalty, maxPenalty);
  }
  
  return penalty;
}

// ============ Early Takeoff Penalty ============

export function calculateEarlyTakeoffPenalty91min(
  safetyTimeRemainingMs: number
): number {
  if (safetyTimeRemainingMs <= 0) return 0;
  
  // 1 point per second remaining in safety period
  return Math.ceil(safetyTimeRemainingMs / 1000);
}

export function calculateEarlyTakeoffPenalty3h(
  safetyTimeRemainingMs: number
): number {
  if (safetyTimeRemainingMs <= 0) return 0;
  
  // Fixed 20 points for any early takeoff during safety period
  return 20;
}

// ============ Late Relay Penalty ============

export function calculateLateRelayPenalty(
  relayTimeMs: number,
  maxRelayTimeMs: number,
  penaltyIntervalSeconds: number
): number {
  if (relayTimeMs <= maxRelayTimeMs) return 0;
  
  const excessMs = relayTimeMs - maxRelayTimeMs;
  const excessSeconds = excessMs / 1000;
  
  // Ceiling division for penalty calculation
  return Math.ceil(excessSeconds / penaltyIntervalSeconds);
}

// ============ First Takeoff Penalty ============

export function calculateFirstTakeoffPenalty91min(
  takeoffDelayMs: number,
  maxDelayMs: number
): number {
  if (takeoffDelayMs <= maxDelayMs) return 0;
  
  // For 91min: no specific penalty in rules, but we track it as late relay
  const excessMs = takeoffDelayMs - maxDelayMs;
  return Math.ceil(excessMs / 1000 / 10); // 1 point per 10 seconds
}

export function calculateFirstTakeoffPenalty3h(
  takeoffDelayMs: number,
  maxDelayMs: number
): number {
  if (takeoffDelayMs <= maxDelayMs) return 0;
  
  // For 3h: treated as late relay
  const excessMs = takeoffDelayMs - maxDelayMs;
  return Math.ceil(excessMs / 1000 / 10); // 1 point per 10 seconds
}

// ============ Table Announcement (91min only) ============

export function calculateTablePoints(
  announced: boolean,
  success: boolean | null
): number {
  if (!announced) return 0;
  
  if (success === true) {
    return -5; // Bonus
  } else if (success === false) {
    return 3; // Penalty
  }
  
  return 0;
}

// ============ Manual Penalties Sum ============

export function sumManualPenalties(penalties: ManualPenalty[]): number {
  return penalties.reduce((sum, p) => sum + p.points, 0);
}

// ============ Takeoff Delay ============

/**
 * Time between the reference point and the takeoff: the competition start for
 * the first flight, the previous landing for every other flight.
 * Returns null when the previous landing is unknown.
 */
export function getTakeoffDelay(competition: Competition, flightIndex: number): number | null {
  const flight = competition.flights[flightIndex];
  if (flightIndex === 0) {
    return competition.startTimestamp === null ? null : flight.startTimestamp - competition.startTimestamp;
  }
  if (flight.previousFlightEndTimestamp === null) {
    return null;
  }
  return flight.startTimestamp - flight.previousFlightEndTimestamp;
}

function calculateTakeoffDelayPenalties(
  takeoffDelay: number,
  isFirstTakeoff: boolean,
  settings: CompetitionSettings
): { earlyTakeoffPenalty: number; lateRelayPenalty: number } {
  // There is no safety period before the first flight: the first pilot must take off
  // within the first takeoff window, so the first takeoff can never be early.
  if (isFirstTakeoff) {
    return {
      earlyTakeoffPenalty: 0,
      lateRelayPenalty: settings.competitionType === '91min'
        ? calculateFirstTakeoffPenalty91min(takeoffDelay, settings.firstTakeoffMaxTime)
        : calculateFirstTakeoffPenalty3h(takeoffDelay, settings.firstTakeoffMaxTime),
    };
  }

  const safetyRemaining = settings.safetyTime - takeoffDelay;
  return {
    earlyTakeoffPenalty: settings.competitionType === '91min'
      ? calculateEarlyTakeoffPenalty91min(safetyRemaining)
      : calculateEarlyTakeoffPenalty3h(safetyRemaining),
    lateRelayPenalty: calculateLateRelayPenalty(
      takeoffDelay,
      settings.maxRelayTime,
      settings.lateRelayPenaltyInterval
    ),
  };
}

// ============ End of Competition ============

/**
 * Whether the flight was still in progress when the competition ended.
 */
export function isFlightInterruptedByCompetitionEnd(competition: Competition, flightIndex: number): boolean {
  const flight = competition.flights[flightIndex];
  if (competition.endTimestamp === null || flight.endTimestamp === null) {
    return false;
  }
  if (flight.endedByCompetitionEnd !== undefined) {
    return flight.endedByCompetitionEnd;
  }
  // Recorded before the flag existed: the flight still in progress was closed
  // with the exact competition end timestamp
  return flightIndex === competition.flights.length - 1 && flight.endTimestamp === competition.endTimestamp;
}

/**
 * When the competition ends while nobody is flying, the takeoff that never happened
 * is measured from the last landing (or from the start if nobody flew) to the end.
 * Returns null when the competition is not over or a flight was in progress at the end.
 */
export function getMissedTakeoffDelay(competition: Competition): number | null {
  if (competition.endTimestamp === null || competition.startTimestamp === null) {
    return null;
  }

  const lastIndex = competition.flights.length - 1;
  if (lastIndex < 0) {
    return competition.endTimestamp - competition.startTimestamp;
  }

  const lastFlight = competition.flights[lastIndex];
  if (lastFlight.endTimestamp === null || isFlightInterruptedByCompetitionEnd(competition, lastIndex)) {
    return null;
  }
  return Math.max(0, competition.endTimestamp - lastFlight.endTimestamp);
}

/**
 * Late takeoff penalty for the takeoff that never happened before the end.
 */
export function calculateMissedTakeoffPenalty(
  competition: Competition,
  settings: CompetitionSettings
): number {
  const missedTakeoffDelay = getMissedTakeoffDelay(competition);
  if (missedTakeoffDelay === null) {
    return 0;
  }
  return calculateTakeoffDelayPenalties(missedTakeoffDelay, competition.flights.length === 0, settings).lateRelayPenalty;
}

// ============ Flight Score Breakdown ============

export interface FlightScoreBreakdown {
  flightDurationPenalty: number;
  earlyTakeoffPenalty: number;
  lateRelayPenalty: number; // Late relay, or late first takeoff for the first flight
  tablePoints: number;
  manualPenalties: number;
  total: number;
}

/**
 * Single source of truth for the points of one flight.
 */
export function getFlightScoreBreakdown(
  competition: Competition,
  flightIndex: number,
  settings: CompetitionSettings
): FlightScoreBreakdown {
  const flight = competition.flights[flightIndex];

  // Flight duration penalty
  // A flight cut by the end of the competition is never penalized for being short,
  // only for an overrun that had already started.
  let flightDurationPenalty = 0;
  if (flight.endTimestamp !== null) {
    const duration = flight.endTimestamp - flight.startTimestamp;
    const isInterrupted = isFlightInterruptedByCompetitionEnd(competition, flightIndex);
    if (!isInterrupted || duration > settings.targetFlightDuration) {
      flightDurationPenalty = calculateFlightDurationPenalty(
        duration,
        settings.targetFlightDuration,
        settings.flightDurationPenaltyInterval,
        settings.flightDurationMaxPenalty
      );
    }
  }

  // Early takeoff and late relay (or late first takeoff) penalties
  let earlyTakeoffPenalty = 0;
  let lateRelayPenalty = 0;
  const takeoffDelay = getTakeoffDelay(competition, flightIndex);
  if (takeoffDelay !== null) {
    ({ earlyTakeoffPenalty, lateRelayPenalty } = calculateTakeoffDelayPenalties(takeoffDelay, flightIndex === 0, settings));
  }

  // Table points (91min only)
  const tablePoints = settings.competitionType === '91min'
    ? calculateTablePoints(flight.tableAnnounced, flight.tableSuccess)
    : 0;

  // Manual penalties
  const manualPenalties = sumManualPenalties(flight.manualPenalties);

  return {
    flightDurationPenalty,
    earlyTakeoffPenalty,
    lateRelayPenalty,
    tablePoints,
    manualPenalties,
    total: flightDurationPenalty + earlyTakeoffPenalty + lateRelayPenalty + tablePoints + manualPenalties,
  };
}

// ============ Team Bonuses ============

export function calculateTeamBonuses(
  team: Team,
  settings: CompetitionSettings
): number {
  let bonus = 0;
  
  // Female pilot bonus
  const femalePilots = team.pilots.filter(p => p.isFemale).length;
  bonus += femalePilots * settings.femalePilotBonus;
  
  return bonus;
}

// ============ Team Penalties (competition-wide) ============

export function calculateTeamPenalties(
  team: Team,
  competition: Competition,
  settings: CompetitionSettings
): number {
  let penalty = 0;
  
  // No thermal plane penalty (3h only) - applies if no thermal pilot has flown
  if (settings.competitionType === '3h' && competition.endTimestamp !== null) {
    const pilotsWhoFlew = new Set(competition.flights.map(f => f.pilotId));
    const thermalPilotFlew = team.pilots.some(p => p.hasThermalPlane && pilotsWhoFlew.has(p.id));
    
    if (!thermalPilotFlew) {
      penalty += settings.noThermalPlanePenalty;
    }
  }
  
  // Pilot never flew penalty (3h only)
  if (settings.competitionType === '3h' && competition.endTimestamp !== null) {
    const pilotsWhoFlew = new Set(competition.flights.map(f => f.pilotId));
    const pilotsWhoNeverFlew = team.pilots.filter(p => !pilotsWhoFlew.has(p.id));
    penalty += pilotsWhoNeverFlew.length * settings.pilotNeverFlewPenalty;
  }
  
  return penalty;
}

// ============ Total Score ============

export function calculateTotalScore(
  team: Team,
  competition: Competition,
  settings: CompetitionSettings
): number {
  return getScoreBreakdown(team, competition, settings).total;
}

// ============ Score Breakdown ============

export interface ScoreBreakdown {
  flightDurationPenalties: number;
  earlyTakeoffPenalties: number;
  lateRelayPenalties: number;
  tablePoints: number;
  manualPenalties: number;
  femalePilotBonus: number;
  noThermalPenalty: number;
  pilotNeverFlewPenalty: number;
  total: number;
}

export function getScoreBreakdown(
  team: Team,
  competition: Competition,
  settings: CompetitionSettings
): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    flightDurationPenalties: 0,
    earlyTakeoffPenalties: 0,
    lateRelayPenalties: 0,
    tablePoints: 0,
    manualPenalties: 0,
    femalePilotBonus: 0,
    noThermalPenalty: 0,
    pilotNeverFlewPenalty: 0,
    total: 0,
  };

  competition.flights.forEach((_flight, index) => {
    const flightBreakdown = getFlightScoreBreakdown(competition, index, settings);
    breakdown.flightDurationPenalties += flightBreakdown.flightDurationPenalty;
    breakdown.earlyTakeoffPenalties += flightBreakdown.earlyTakeoffPenalty;
    breakdown.lateRelayPenalties += flightBreakdown.lateRelayPenalty;
    breakdown.tablePoints += flightBreakdown.tablePoints;
    breakdown.manualPenalties += flightBreakdown.manualPenalties;
  });

  // Nobody took off after the last landing before the end
  breakdown.lateRelayPenalties += calculateMissedTakeoffPenalty(competition, settings);

  // Team bonuses
  const femalePilots = team.pilots.filter(p => p.isFemale).length;
  breakdown.femalePilotBonus = femalePilots * settings.femalePilotBonus;

  // Team penalties (3h)
  if (settings.competitionType === '3h') {
    if (competition.endTimestamp !== null) {
      const pilotsWhoFlew = new Set(competition.flights.map(f => f.pilotId));
      
      // No thermal penalty - if no thermal pilot has flown
      const thermalPilotFlew = team.pilots.some(p => p.hasThermalPlane && pilotsWhoFlew.has(p.id));
      if (!thermalPilotFlew) {
        breakdown.noThermalPenalty = settings.noThermalPlanePenalty;
      }
      
      // Pilots who never flew
      const pilotsWhoNeverFlew = team.pilots.filter(p => !pilotsWhoFlew.has(p.id));
      breakdown.pilotNeverFlewPenalty = pilotsWhoNeverFlew.length * settings.pilotNeverFlewPenalty;
    }
  }

  breakdown.total = 
    breakdown.flightDurationPenalties +
    breakdown.earlyTakeoffPenalties +
    breakdown.lateRelayPenalties +
    breakdown.tablePoints +
    breakdown.manualPenalties +
    breakdown.femalePilotBonus +
    breakdown.noThermalPenalty +
    breakdown.pilotNeverFlewPenalty;

  return breakdown;
}
