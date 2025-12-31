import type {
  Competition,
  CompetitionSettings,
  Flight,
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

// ============ Flight Total Score ============

export function calculateFlightScore(
  flight: Flight,
  settings: CompetitionSettings,
  isFirstFlight: boolean,
  competitionStartTimestamp: number
): number {
  let score = 0;
  
  // Flight duration penalty
  if (flight.endTimestamp !== null) {
    const duration = flight.endTimestamp - flight.startTimestamp;
    score += calculateFlightDurationPenalty(
      duration,
      settings.targetFlightDuration,
      settings.flightDurationPenaltyInterval,
      settings.flightDurationMaxPenalty
    );
  }
  
  // Early takeoff penalty
  if (flight.safetyTimeViolation) {
    const safetyStart = flight.previousFlightEndTimestamp ?? competitionStartTimestamp;
    const safetyRemaining = (safetyStart + settings.safetyTime) - flight.startTimestamp;
    
    if (settings.competitionType === '91min') {
      score += calculateEarlyTakeoffPenalty91min(safetyRemaining);
    } else {
      score += calculateEarlyTakeoffPenalty3h(safetyRemaining);
    }
  }
  
  // Late relay penalty
  if (flight.previousFlightEndTimestamp !== null && !isFirstFlight) {
    const relayTime = flight.startTimestamp - flight.previousFlightEndTimestamp;
    if (relayTime > settings.maxRelayTime) {
      score += calculateLateRelayPenalty(
        relayTime,
        settings.maxRelayTime,
        settings.lateRelayPenaltyInterval
      );
    }
  }
  
  // First takeoff penalty
  if (isFirstFlight) {
    const takeoffDelay = flight.startTimestamp - competitionStartTimestamp;
    if (settings.competitionType === '91min') {
      score += calculateFirstTakeoffPenalty91min(takeoffDelay, settings.firstTakeoffMaxTime);
    } else {
      score += calculateFirstTakeoffPenalty3h(takeoffDelay, settings.firstTakeoffMaxTime);
    }
  }
  
  // Table points (91min only)
  if (settings.competitionType === '91min') {
    score += calculateTablePoints(flight.tableAnnounced, flight.tableSuccess);
  }
  
  // Manual penalties
  score += sumManualPenalties(flight.manualPenalties);
  
  return score;
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
  let totalScore = 0;
  
  // Sum all flight scores
  competition.flights.forEach((flight, index) => {
    totalScore += calculateFlightScore(
      flight,
      settings,
      index === 0,
      competition.startTimestamp ?? 0
    );
  });
  
  // Add team bonuses (negative points)
  totalScore += calculateTeamBonuses(team, settings);
  
  // Add team penalties
  totalScore += calculateTeamPenalties(team, competition, settings);
  
  return totalScore;
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

  competition.flights.forEach((flight, index) => {
    const isFirstFlight = index === 0;
    const startTs = competition.startTimestamp ?? 0;

    // Flight duration penalty
    if (flight.endTimestamp !== null) {
      const duration = flight.endTimestamp - flight.startTimestamp;
      breakdown.flightDurationPenalties += calculateFlightDurationPenalty(
        duration,
        settings.targetFlightDuration,
        settings.flightDurationPenaltyInterval,
        settings.flightDurationMaxPenalty
      );
    }

    // Early takeoff penalty
    if (flight.safetyTimeViolation) {
      const safetyStart = flight.previousFlightEndTimestamp ?? startTs;
      const safetyRemaining = (safetyStart + settings.safetyTime) - flight.startTimestamp;

      if (settings.competitionType === '91min') {
        breakdown.earlyTakeoffPenalties += calculateEarlyTakeoffPenalty91min(safetyRemaining);
      } else {
        breakdown.earlyTakeoffPenalties += calculateEarlyTakeoffPenalty3h(safetyRemaining);
      }
    }

    // Late relay penalty
    if (flight.previousFlightEndTimestamp !== null && !isFirstFlight) {
      const relayTime = flight.startTimestamp - flight.previousFlightEndTimestamp;
      if (relayTime > settings.maxRelayTime) {
        breakdown.lateRelayPenalties += calculateLateRelayPenalty(
          relayTime,
          settings.maxRelayTime,
          settings.lateRelayPenaltyInterval
        );
      }
    }

    // First takeoff late penalty
    if (isFirstFlight) {
      const takeoffDelay = flight.startTimestamp - startTs;
      if (settings.competitionType === '91min') {
        breakdown.lateRelayPenalties += calculateFirstTakeoffPenalty91min(takeoffDelay, settings.firstTakeoffMaxTime);
      } else {
        breakdown.lateRelayPenalties += calculateFirstTakeoffPenalty3h(takeoffDelay, settings.firstTakeoffMaxTime);
      }
    }

    // Table points
    if (settings.competitionType === '91min') {
      breakdown.tablePoints += calculateTablePoints(flight.tableAnnounced, flight.tableSuccess);
    }

    // Manual penalties
    breakdown.manualPenalties += sumManualPenalties(flight.manualPenalties);
  });

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
