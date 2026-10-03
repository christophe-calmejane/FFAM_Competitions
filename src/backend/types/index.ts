// Core types for the competition scoring system

export type CompetitionType = '91min' | '3h';
export type Language = 'en' | 'fr';
export type Theme = 'light' | 'dark';

export interface Pilot {
  id: string;
  name: string;
  isFemale: boolean;
  hasThermalPlane: boolean; // For 3h competition
}

export interface Team {
  id: string;
  name: string;
  pilots: Pilot[];
  competitionType: CompetitionType;
  createdAt: number;
}

export interface ManualPenalty {
  type: string;
  points: number;
  description: string;
}

export interface Flight {
  id: string;
  teamId: string;
  pilotId: string;
  flightNumber: number;
  startTimestamp: number; // Absolute timestamp when flight started
  endTimestamp: number | null; // Null if still in flight
  duration: number; // Computed duration in ms
  // True when the flight was still in progress when the competition ended.
  // Undefined for flights recorded before this field existed.
  endedByCompetitionEnd?: boolean;
  
  // Inter-flight timing
  previousFlightEndTimestamp: number | null; // When previous flight ended
  safetyTimeViolation: boolean; // As recorded at takeoff (scoring recomputes it from timestamps)
  
  // Penalties/bonuses for this flight (computed)
  flightDurationPenalty: number;
  earlyTakeoffPenalty: number;
  lateRelayPenalty: number;
  
  // Manual penalties/bonuses
  manualPenalties: ManualPenalty[];
  
  // For 91min: Table announcement
  tableAnnounced: boolean;
  tableSuccess: boolean | null; // null if not announced, true/false if announced
}

export interface Competition {
  id: string;
  type: CompetitionType;
  teamId: string;
  startTimestamp: number | null; // Absolute timestamp when competition started
  endTimestamp: number | null; // When competition ended
  isActive: boolean;
  currentFlightId: string | null;
  safetyPeriodEndTimestamp: number | null; // When current safety period ends
  flights: Flight[];
  createdAt: number;
}

export interface CompetitionSettings {
  id: string;
  competitionType: CompetitionType;
  
  // Duration settings (in ms)
  totalDuration: number;
  targetFlightDuration: number;
  safetyTime: number;
  maxRelayTime: number;
  firstTakeoffMaxTime: number;
  
  // Penalty values
  flightDurationPenaltyInterval: number; // seconds per penalty point
  flightDurationMaxPenalty: number | null; // null = no max
  earlyTakeoffPenaltyPerSecond: number;
  lateRelayPenaltyInterval: number; // seconds per penalty point
  lateRelayPenaltyStart: number; // when does penalty start (ms after landing)
  
  // Manual penalty definitions
  manualPenalties: {
    id: string;
    name: string;
    nameEn: string;
    nameFr: string;
    points: number;
  }[];
  
  // Team bonuses
  femalePilotBonus: number;
  noThermalPlanePenalty: number; // Only for 3h
  pilotNeverFlewPenalty: number; // Only for 3h
  
  // Min/max pilots
  minPilots: number;
  maxPilots: number;
}

export interface AppSettings {
  id: string;
  language: Language;
  theme: Theme;
  showIntermediateScores: boolean;
}

// Default settings for each competition type
export const DEFAULT_91MIN_SETTINGS: Omit<CompetitionSettings, 'id'> = {
  competitionType: '91min',
  totalDuration: 91 * 60 * 1000, // 91 minutes
  targetFlightDuration: 4 * 60 * 1000, // 4 minutes
  safetyTime: 10 * 1000, // 10 seconds
  maxRelayTime: 30 * 1000, // 30 seconds
  firstTakeoffMaxTime: 10 * 1000, // 10 seconds
  
  flightDurationPenaltyInterval: 10, // 1 point per 10 seconds
  flightDurationMaxPenalty: null,
  earlyTakeoffPenaltyPerSecond: 1, // 1 point per second
  lateRelayPenaltyInterval: 5, // 1 point per 5 seconds
  lateRelayPenaltyStart: 30 * 1000, // after 30 seconds
  
  manualPenalties: [
    { id: 'control_takeover', name: 'Control Takeover', nameEn: 'Control Takeover', nameFr: 'Reprise de commandes', points: 25 },
    { id: 'no_full_lap', name: 'No Full Lap', nameEn: 'No Full Lap', nameFr: 'Pas de tour complet', points: 25 },
    { id: 'false_start', name: 'False Start', nameEn: 'False Start', nameFr: 'Faux départ', points: 10 },
    { id: 'collision', name: 'Collision Penalty', nameEn: 'Collision Penalty', nameFr: 'Pénalité accrochage', points: 10 },
  ],
  
  femalePilotBonus: -10,
  noThermalPlanePenalty: 0,
  pilotNeverFlewPenalty: 0,
  
  minPilots: 2,
  maxPilots: 6,
};

export const DEFAULT_3H_SETTINGS: Omit<CompetitionSettings, 'id'> = {
  competitionType: '3h',
  totalDuration: 3 * 60 * 60 * 1000, // 3 hours
  targetFlightDuration: 10 * 60 * 1000, // 10 minutes
  safetyTime: 30 * 1000, // 30 seconds of neutralisation (takeoff before = early)
  maxRelayTime: 40 * 1000, // 30s neutralisation + 10s window (takeoff after = late)
  firstTakeoffMaxTime: 10 * 1000, // 10 seconds (no safety period before the first flight)
  
  flightDurationPenaltyInterval: 2, // 1 point per 2 seconds
  flightDurationMaxPenalty: 60, // max 60 points
  earlyTakeoffPenaltyPerSecond: 0, // fixed 20 points instead
  lateRelayPenaltyInterval: 10, // 1 point per 10 seconds
  lateRelayPenaltyStart: 40 * 1000, // after 40 seconds
  
  manualPenalties: [
    { id: 'control_takeover', name: 'Control Takeover', nameEn: 'Control Takeover', nameFr: 'Reprise de commandes', points: 10 },
    { id: 'landing_outside', name: 'Landing Outside Zone', nameEn: 'Landing Outside Zone', nameFr: 'Atterrissage hors zone', points: 10 },
  ],
  
  femalePilotBonus: -10,
  noThermalPlanePenalty: 50,
  pilotNeverFlewPenalty: 100,
  
  minPilots: 4,
  maxPilots: 4,
};

export const DEFAULT_APP_SETTINGS: Omit<AppSettings, 'id'> = {
  language: 'fr',
  theme: 'light',
  showIntermediateScores: false,
};
