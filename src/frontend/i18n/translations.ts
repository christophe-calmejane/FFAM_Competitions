import type { Language } from '../../backend/types/index.js';

export interface Translations {
  // App
  appTitle: string;
  welcome: string;
  selectCompetition: string;
  competition91min: string;
  competition91minDesc: string;
  competition3h: string;
  competition3hDesc: string;
  language: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  settings: string;
  back: string;
  save: string;
  cancel: string;
  delete: string;
  confirm: string;
  
  // Team
  teamName: string;
  createTeam: string;
  editTeam: string;
  pilots: string;
  addPilot: string;
  removePilot: string;
  pilotName: string;
  isFemale: string;
  modelName: string;
  hasThermalPlane: string;
  minPilotsRequired: string;
  maxPilotsAllowed: string;
  
  // Competition
  startCompetition: string;
  endCompetition: string;
  competitionEnded: string;
  timeElapsed: string;
  timeRemaining: string;
  totalScore: string;
  showScores: string;
  hideScores: string;
  
  // Flight
  flight: string;
  flights: string;
  startFlight: string;
  endFlight: string;
  currentFlight: string;
  noFlightInProgress: string;
  waitingForTakeoff: string;
  flightDuration: string;
  targetDuration: string;
  safetyPeriod: string;
  safetyPeriodActive: string;
  earlyTakeoff: string;
  
  // Penalties and bonuses
  penalties: string;
  bonuses: string;
  flightDurationPenalty: string;
  earlyTakeoffPenalty: string;
  lateRelayPenalty: string;
  lateFirstTakeoffPenalty: string;
  manualPenalties: string;
  
  // Short penalty labels (per-flight details)
  penaltyDurationShort: string;
  penaltyEarlyTakeoffShort: string;
  penaltyLateRelayShort: string;
  penaltyLateFirstTakeoffShort: string;
  
  // 91min specific
  tableAnnounced: string;
  tableSuccess: string;
  tableFailed: string;
  controlTakeover: string;
  noFullLap: string;
  falseStart: string;
  collisionPenalty: string;
  
  // 3h specific
  landingOutsideZone: string;
  noThermalPlane: string;
  pilotNeverFlew: string;
  
  // Female bonus
  femalePilotBonus: string;
  
  // UI
  batterySaver: string;
  editFlight: string;
  editFlightDuration: string;
  editTakeoffDelay: string;
  editTakeoffDelayFirst: string;
  flightInterruptedByEnd: string;
  flightInterruptedShort: string;
  missedTakeoff: string;
  durationMinutes: string;
  durationSeconds: string;
  resumeFlight: string;
  resume: string;
  confirmResumeFlightTitle: string;
  confirmResumeFlight: string;
  mergeFlights: string;
  merge: string;
  confirmMergeFlightsTitle: string;
  confirmMergeFlights: string;
  mergeFlightsPoints: string;
  
  // Results
  results: string;
  scoreBreakdown: string;
  finalScore: string;
  columnPilot: string;
  columnTakeoffDelay: string;
  columnFlightTime: string;
  columnPenalties: string;
  flightsTotal: string;
  
  // Settings page
  competitionSettings: string;
  totalDuration: string;
  flightDurationSetting: string;
  safetyTime: string;
  maxRelayTime: string;
  firstTakeoffMaxTime: string;
  penaltyInterval: string;
  maxPenaltyPoints: string;
  resetToDefaults: string;
  
  // Units
  minutes: string;
  seconds: string;
  points: string;
  
  // Errors
  errorTeamNameRequired: string;
  errorPilotNameRequired: string;
  errorMinPilots: string;
  errorMaxPilots: string;
  
  // Confirmations
  confirmEndCompetition: string;
  confirmEndCompetitionTitle: string;
  confirmDeleteTeam: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // App
    appTitle: 'FFAM Competitions',
    welcome: 'Welcome to FFAM Competitions',
    selectCompetition: 'Select a competition',
    competition91min: '91 Minutes of Essonne',
    competition91minDesc: '2-6 pilots • 4 min flights',
    competition3h: '3 Hours of Essonne',
    competition3hDesc: '4 pilots • 10 min flights',
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    settings: 'Settings',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    
    // Team
    teamName: 'Team Name',
    createTeam: 'Create Team',
    editTeam: 'Edit Team',
    pilots: 'Pilots',
    addPilot: 'Add Pilot',
    removePilot: 'Remove',
    pilotName: 'Pilot Name',
    isFemale: 'Female Pilot',
    modelName: 'Model Name',
    hasThermalPlane: 'Thermal Plane',
    minPilotsRequired: 'Minimum pilots required',
    maxPilotsAllowed: 'Maximum pilots allowed',
    
    // Competition
    startCompetition: 'Start Competition',
    endCompetition: 'End Competition',
    competitionEnded: 'Competition Ended',
    timeElapsed: 'Elapsed',
    timeRemaining: 'Remaining',
    totalScore: 'Total Score',
    showScores: 'Show Scores',
    hideScores: 'Hide Scores',
    
    // Flight
    flight: 'Flight',
    flights: 'Flights',
    startFlight: 'Start Flight',
    endFlight: 'End Flight',
    currentFlight: 'Current Flight',
    noFlightInProgress: 'No flight in progress',
    waitingForTakeoff: 'Waiting for takeoff',
    flightDuration: 'Flight Duration',
    targetDuration: 'Target',
    safetyPeriod: 'Safety Period',
    safetyPeriodActive: 'Safety Period Active',
    earlyTakeoff: 'Early Takeoff',
    
    // Penalties and bonuses
    penalties: 'Penalties',
    bonuses: 'Bonuses',
    flightDurationPenalty: 'Duration Penalty',
    earlyTakeoffPenalty: 'Early Takeoff Penalty',
    lateRelayPenalty: 'Late Relay Penalty',
    lateFirstTakeoffPenalty: 'Late First Takeoff Penalty',
    manualPenalties: 'Manual Penalties',
    
    // Short penalty labels (per-flight details)
    penaltyDurationShort: 'Duration',
    penaltyEarlyTakeoffShort: 'Early takeoff',
    penaltyLateRelayShort: 'Late relay',
    penaltyLateFirstTakeoffShort: 'Late first takeoff',
    
    // 91min specific
    tableAnnounced: 'Table Announced',
    tableSuccess: 'Table Success',
    tableFailed: 'Table Failed',
    controlTakeover: 'Control Takeover',
    noFullLap: 'No Full Lap',
    falseStart: 'False Start',
    collisionPenalty: 'Collision Penalty',
    
    // 3h specific
    landingOutsideZone: 'Landing Outside Zone',
    noThermalPlane: 'No Thermal Plane',
    pilotNeverFlew: 'Pilot Never Flew',
    
    // Female bonus
    femalePilotBonus: 'Female Pilot Bonus',
    
    // UI
    batterySaver: 'Battery Saver',
    editFlight: 'Edit Flight',
    editFlightDuration: 'Flight Duration',
    editTakeoffDelay: 'Takeoff time after the previous landing',
    editTakeoffDelayFirst: 'Takeoff time after the competition start',
    flightInterruptedByEnd: 'Flight still in progress at the end of the competition (no penalty for a short flight)',
    flightInterruptedShort: 'Interrupted by the end',
    missedTakeoff: 'No takeoff before the end',
    durationMinutes: 'Minutes',
    durationSeconds: 'Seconds',
    resumeFlight: 'Resume flight',
    resume: 'Resume',
    confirmResumeFlightTitle: 'Resume flight #{number}?',
    confirmResumeFlight: 'Was flight #{number} ({pilot}) stopped by mistake? It continues as if it had never been stopped: its timer keeps running from its takeoff.',
    mergeFlights: 'Merge #{first} and #{second}',
    merge: 'Merge',
    confirmMergeFlightsTitle: 'Merge flights',
    confirmMergeFlights: 'Flights #{first} and #{second} ({pilot}) become a single {duration} flight, from the takeoff of #{first} to the landing of #{second}: the time on the ground in between counts as flight time.',
    mergeFlightsPoints: 'Points for these flights: {before} → {after}',
    
    // Results
    results: 'Results',
    scoreBreakdown: 'Score Breakdown',
    finalScore: 'Final Score',
    columnPilot: 'Pilot',
    columnTakeoffDelay: 'Takeoff (s)',
    columnFlightTime: 'Flight',
    columnPenalties: 'Pen.',
    flightsTotal: 'Flights total',
    
    // Settings page
    competitionSettings: 'Competition Settings',
    totalDuration: 'Total Duration',
    flightDurationSetting: 'Flight Duration',
    safetyTime: 'Safety Time',
    maxRelayTime: 'Max Relay Time',
    firstTakeoffMaxTime: 'First Takeoff Max Time',
    penaltyInterval: 'Penalty Interval',
    maxPenaltyPoints: 'Max Penalty Points',
    resetToDefaults: 'Reset to Defaults',
    
    // Units
    minutes: 'min',
    seconds: 'sec',
    points: 'pts',
    
    // Errors
    errorTeamNameRequired: 'Team name is required',
    errorPilotNameRequired: 'Pilot name is required',
    errorMinPilots: 'Minimum {min} pilots required',
    errorMaxPilots: 'Maximum {max} pilots allowed',
    
    // Confirmations
    confirmEndCompetition: 'Are you sure you want to end the competition? This action cannot be undone.',
    confirmEndCompetitionTitle: 'End Competition',
    confirmDeleteTeam: 'Are you sure you want to delete this team?',
  },
  
  fr: {
    // App
    appTitle: 'Compétitions FFAM',
    welcome: 'Bienvenue aux Compétitions FFAM',
    selectCompetition: 'Sélectionnez une compétition',
    competition91min: 'Les 91 Minutes de l\'Essonne',
    competition91minDesc: '2-6 pilotes • 4 min de vol',
    competition3h: 'Les 3 Heures de l\'Essonne',
    competition3hDesc: '4 pilotes • 10 min de vol',
    language: 'Langue',
    theme: 'Thème',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    settings: 'Paramètres',
    back: 'Retour',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    
    // Team
    teamName: 'Nom de l\'équipe',
    createTeam: 'Créer une équipe',
    editTeam: 'Modifier l\'équipe',
    pilots: 'Pilotes',
    addPilot: 'Ajouter un pilote',
    removePilot: 'Retirer',
    pilotName: 'Nom du pilote',
    isFemale: 'Pilote féminin',
    modelName: 'Nom du modèle',
    hasThermalPlane: 'Avion thermique',
    minPilotsRequired: 'Minimum de pilotes requis',
    maxPilotsAllowed: 'Maximum de pilotes autorisés',
    
    // Competition
    startCompetition: 'Démarrer la compétition',
    endCompetition: 'Terminer la compétition',
    competitionEnded: 'Compétition terminée',
    timeElapsed: 'Écoulé',
    timeRemaining: 'Restant',
    totalScore: 'Score total',
    showScores: 'Afficher les scores',
    hideScores: 'Masquer les scores',
    
    // Flight
    flight: 'Vol',
    flights: 'Vols',
    startFlight: 'Démarrer le vol',
    endFlight: 'Terminer le vol',
    currentFlight: 'Vol en cours',
    noFlightInProgress: 'Aucun vol en cours',
    waitingForTakeoff: 'En attente de décollage',
    flightDuration: 'Durée du vol',
    targetDuration: 'Cible',
    safetyPeriod: 'Période de sécurité',
    safetyPeriodActive: 'Période de sécurité active',
    earlyTakeoff: 'Décollage anticipé',
    
    // Penalties and bonuses
    penalties: 'Pénalités',
    bonuses: 'Bonus',
    flightDurationPenalty: 'Pénalité de durée',
    earlyTakeoffPenalty: 'Pénalité décollage anticipé',
    lateRelayPenalty: 'Pénalité relais tardif',
    lateFirstTakeoffPenalty: 'Pénalité premier décollage tardif',
    manualPenalties: 'Pénalités manuelles',
    
    // Short penalty labels (per-flight details)
    penaltyDurationShort: 'Durée',
    penaltyEarlyTakeoffShort: 'Décollage anticipé',
    penaltyLateRelayShort: 'Relais tardif',
    penaltyLateFirstTakeoffShort: 'Premier décollage tardif',
    
    // 91min specific
    tableAnnounced: 'Table annoncée',
    tableSuccess: 'Table réussie',
    tableFailed: 'Table ratée',
    controlTakeover: 'Reprise de commandes',
    noFullLap: 'Pas de tour complet',
    falseStart: 'Faux départ',
    collisionPenalty: 'Pénalité accrochage',
    
    // 3h specific
    landingOutsideZone: 'Atterrissage hors zone',
    noThermalPlane: 'Pas d\'avion thermique',
    pilotNeverFlew: 'Pilote n\'ayant jamais volé',
    
    // Female bonus
    femalePilotBonus: 'Bonus pilote féminin',
    
    // UI
    batterySaver: 'Éco batterie',
    editFlight: 'Modifier le vol',
    editFlightDuration: 'Durée du vol',
    editTakeoffDelay: 'Temps de décollage après le posé précédent',
    editTakeoffDelayFirst: "Temps de décollage après le départ de l'épreuve",
    flightInterruptedByEnd: "Vol en cours à la fin de l'épreuve (pas de pénalité pour un vol trop court)",
    flightInterruptedShort: 'Interrompu par la fin',
    missedTakeoff: 'Pas de décollage avant la fin',
    durationMinutes: 'Minutes',
    durationSeconds: 'Secondes',
    resumeFlight: 'Reprendre le vol',
    resume: 'Reprendre',
    confirmResumeFlightTitle: 'Reprendre le vol #{number} ?',
    confirmResumeFlight: "Le vol #{number} ({pilot}) a été arrêté par erreur ? Il continue comme s'il n'avait jamais été arrêté : son chrono repart depuis son décollage.",
    mergeFlights: 'Fusionner #{first} et #{second}',
    merge: 'Fusionner',
    confirmMergeFlightsTitle: 'Fusionner les vols',
    confirmMergeFlights: 'Les vols #{first} et #{second} ({pilot}) deviennent un seul vol de {duration}, du décollage du #{first} au posé du #{second} : le temps au sol entre les deux compte comme du vol.',
    mergeFlightsPoints: 'Points de ces vols : {before} → {after}',
    
    // Results
    results: 'Résultats',
    scoreBreakdown: 'Détail du score',
    finalScore: 'Score final',
    columnPilot: 'Pilote',
    columnTakeoffDelay: 'Décol. (s)',
    columnFlightTime: 'Vol',
    columnPenalties: 'Pén.',
    flightsTotal: 'Total vols',
    
    // Settings page
    competitionSettings: 'Paramètres de compétition',
    totalDuration: 'Durée totale',
    flightDurationSetting: 'Durée de vol',
    safetyTime: 'Temps de sécurité',
    maxRelayTime: 'Temps de relais max',
    firstTakeoffMaxTime: 'Temps max premier décollage',
    penaltyInterval: 'Intervalle de pénalité',
    maxPenaltyPoints: 'Points de pénalité max',
    resetToDefaults: 'Réinitialiser par défaut',
    
    // Units
    minutes: 'min',
    seconds: 'sec',
    points: 'pts',
    
    // Errors
    errorTeamNameRequired: 'Le nom de l\'équipe est requis',
    errorPilotNameRequired: 'Le nom du pilote est requis',
    errorMinPilots: 'Minimum {min} pilotes requis',
    errorMaxPilots: 'Maximum {max} pilotes autorisés',
    
    // Confirmations
    confirmEndCompetition: 'Êtes-vous sûr de vouloir terminer la compétition ? Cette action est irréversible.',
    confirmEndCompetitionTitle: 'Terminer la compétition',
    confirmDeleteTeam: 'Êtes-vous sûr de vouloir supprimer cette équipe ?',
  },
};

let currentLanguage: Language = 'fr';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  document.documentElement.lang = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: keyof Translations, params?: Record<string, string | number>): string {
  let text = translations[currentLanguage][key] || translations['en'][key] || key;
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, String(v));
    });
  }
  
  return text;
}

export function getPenaltyName(
  penalty: { nameEn: string; nameFr: string },
  lang: Language = currentLanguage
): string {
  return lang === 'fr' ? penalty.nameFr : penalty.nameEn;
}
