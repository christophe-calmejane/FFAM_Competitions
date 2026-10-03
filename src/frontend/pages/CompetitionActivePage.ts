import { createElement, clearElement } from '../utils/dom';
import { t, getLanguage, getPenaltyName } from '../i18n/translations';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import { createTimerDisplay, updateTimerDisplay } from '../components/TimerDisplay';
import { createPilotButtonsGrid } from '../components/PilotButton';
import { createFlightList } from '../components/FlightList';
import { showConfirmModal } from '../components/Modal';
import {
  getTeam,
  getCompetition,
  saveCompetition,
  getSettings,
  generateId,
} from '../../backend/database/db';
import {
  getElapsedTime,
  getRemainingTime,
  formatTime,
  isInSafetyPeriod,
  getSafetyTimeRemaining,
  roundUpToSecond,
} from '../../backend/timer/timer';
import { calculateTotalScore } from '../../backend/scoring/rules';
import { applyFlightEdit, finishCompetition } from '../../backend/competition/competition';
import type { FlightEdit } from '../../backend/competition/competition';
import type { CompetitionType, Team, Competition, Flight, CompetitionSettings, ManualPenalty } from '../../backend/types/index.js';

let currentTeam: Team | null = null;
let currentCompetition: Competition | null = null;
let currentSettings: CompetitionSettings | null = null;
let animationFrameId: number | null = null;
let intervalId: number | null = null;
let showScores = false;
let batterySaverMode = false;

export async function renderCompetitionActivePage(
  container: HTMLElement,
  competitionType: CompetitionType,
  teamId: string,
  competitionId: string
): Promise<void> {
  // Cleanup previous animation frame or interval
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  clearElement(container);

  currentTeam = await getTeam(teamId) ?? null;
  currentCompetition = await getCompetition(competitionId) ?? null;
  currentSettings = await getSettings(competitionType);

  if (!currentTeam || !currentCompetition || !currentSettings) {
    navigate({ page: 'competition', type: competitionType });
    return;
  }

  // Check if competition has ended
  if (!currentCompetition.isActive) {
    navigate({
      page: 'results',
      type: competitionType,
      teamId,
      competitionId,
    });
    return;
  }

  const page = createElement('div', { className: `page page-active-competition${batterySaverMode ? ' battery-saver' : ''}` });

  // Competition timer bar (sticky)
  const timerBar = createElement('div', { className: 'competition-timer-bar' });
  
  const backBtn = createButton({
    text: '←',
    variant: 'secondary',
    size: 'small',
    onClick: () => navigate({ page: 'competition', type: competitionType }),
  });
  timerBar.appendChild(backBtn);

  const teamNameEl = createElement('span', {
    className: 'timer-bar-team',
    textContent: currentTeam.name,
  });
  timerBar.appendChild(teamNameEl);

  // Battery saver toggle
  const batterySaverBtn = createButton({
    text: batterySaverMode ? '🔋' : '⚡',
    variant: batterySaverMode ? 'primary' : 'secondary',
    size: 'small',
    onClick: () => {
      batterySaverMode = !batterySaverMode;
      // Re-render will happen through navigation or we update button state
      batterySaverBtn.textContent = batterySaverMode ? '🔋' : '⚡';
      batterySaverBtn.className = batterySaverMode 
        ? 'btn btn-primary btn-small' 
        : 'btn btn-secondary btn-small';
      batterySaverBtn.title = t('batterySaver') + (batterySaverMode ? ' ✓' : '');
      // Toggle battery-saver class on page
      page.classList.toggle('battery-saver', batterySaverMode);
      // Restart animation loop with new mode
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      startAnimationLoop(container, competitionType);
    },
  });
  batterySaverBtn.title = t('batterySaver') + (batterySaverMode ? ' ✓' : '');
  timerBar.appendChild(batterySaverBtn);

  // Main competition timer
  const competitionTimerContainer = createElement('div', {
    className: 'competition-timer-container',
    id: 'competition-timer',
  });
  
  const initialElapsed = getElapsedTime({
    startTimestamp: currentCompetition.startTimestamp,
    endTimestamp: null,
    isRunning: true,
  });
  const initialRemaining = getRemainingTime(
    { startTimestamp: currentCompetition.startTimestamp, endTimestamp: null, isRunning: true },
    currentSettings.totalDuration
  );
  
  const timerDisplay = createTimerDisplay({
    elapsed: initialElapsed,
    remaining: initialRemaining,
    totalDuration: currentSettings.totalDuration,
    isRunning: true,
    size: 'small',
    variant: 'competition',
  });
  competitionTimerContainer.appendChild(timerDisplay);
  timerBar.appendChild(competitionTimerContainer);

  const endBtn = createButton({
    text: '🏁',
    variant: 'danger',
    size: 'small',
    onClick: () => {
      showConfirmModal({
        title: t('confirmEndCompetitionTitle'),
        message: t('confirmEndCompetition'),
        confirmText: t('endCompetition'),
        cancelText: t('cancel'),
        variant: 'danger',
        onConfirm: async () => {
          await endCompetition(container, competitionType);
        },
      });
    },
  });
  timerBar.appendChild(endBtn);

  page.appendChild(timerBar);

  // Main content
  const content = createElement('div', { className: 'active-competition-content' });

  // Current flight section
  const flightSection = createElement('div', { className: 'current-flight-section' });
  
  // Flight timer (large, centered)
  const flightTimerContainer = createElement('div', {
    className: 'flight-timer-container',
    id: 'flight-timer',
  });
  
  const currentFlight = getCurrentFlight();
  if (currentFlight) {
    const flightElapsed = getElapsedTime({
      startTimestamp: currentFlight.startTimestamp,
      endTimestamp: null,
      isRunning: true,
    });
    
    const flightTimerDisplay = createTimerDisplay({
      elapsed: flightElapsed,
      remaining: Math.max(0, currentSettings.targetFlightDuration - flightElapsed),
      totalDuration: currentSettings.targetFlightDuration,
      isRunning: true,
      size: 'large',
      variant: 'flight',
      label: `${t('currentFlight')} - ${getPilotName(currentFlight.pilotId)}`,
    });
    flightTimerContainer.appendChild(flightTimerDisplay);
  } else {
    // Show safety timer and relay timer when no flight in progress
    const takeoffWindow = getNextTakeoffWindow(currentCompetition, currentSettings);
    const now = Date.now();
    const inSafetyPeriod = isInSafetyPeriod(takeoffWindow.referenceTimestamp, takeoffWindow.safetyTime, now);
    
    // Calculate relay time (time since last flight ended, or since competition start)
    const timeSinceReference = now - takeoffWindow.referenceTimestamp;
    const relayTimeExceeded = timeSinceReference > takeoffWindow.maxTime;
    
    if (inSafetyPeriod) {
      const safetyRemaining = getSafetyTimeRemaining(takeoffWindow.referenceTimestamp, takeoffWindow.safetyTime, now);
      
      const safetyDisplay = createElement('div', { className: 'safety-timer' });
      safetyDisplay.innerHTML = `
        <div class="safety-label">⚠️ ${t('safetyPeriodActive')}</div>
        <div class="safety-time" id="safety-time">${formatTime(roundUpToSecond(safetyRemaining))}</div>
      `;
      flightTimerContainer.appendChild(safetyDisplay);
    } else {
      // Show relay timer (time since safety period ended)
      const relayDisplay = createElement('div', { 
        className: `relay-timer ${relayTimeExceeded ? 'relay-penalty' : 'relay-ok'}`,
        id: 'relay-timer-container',
      });
      
      relayDisplay.innerHTML = `
        <div class="relay-label">${relayTimeExceeded ? '⚠️' : '✈️'} ${t('waitingForTakeoff')}</div>
        <div class="relay-time" id="relay-time">${formatTime(timeSinceReference)}</div>
        <div class="relay-max">${t(takeoffWindow.isFirstTakeoff ? 'firstTakeoffMaxTime' : 'maxRelayTime')}: ${formatTime(takeoffWindow.maxTime)}</div>
      `;
      flightTimerContainer.appendChild(relayDisplay);
    }
  }
  
  flightSection.appendChild(flightTimerContainer);

  // Target duration info
  const targetInfo = createElement('div', {
    className: 'target-info',
    textContent: `${t('targetDuration')}: ${formatTime(currentSettings.targetFlightDuration)}`,
  });
  flightSection.appendChild(targetInfo);

  content.appendChild(flightSection);

  // Pilot buttons
  const pilotsSection = createElement('div', { className: 'pilots-section', id: 'pilots-grid' });
  const flyingPilotId = currentFlight?.pilotId ?? null;
  
  const pilotsGrid = createPilotButtonsGrid(
    currentTeam.pilots,
    flyingPilotId,
    flyingPilotId,
    (pilotId) => handlePilotClick(container, competitionType, pilotId)
  );
  pilotsSection.appendChild(pilotsGrid);
  content.appendChild(pilotsSection);

  // Score section (toggleable)
  const scoreSection = createElement('div', { className: 'score-section' });
  
  const scoreToggle = createButton({
    text: showScores ? t('hideScores') : t('showScores'),
    variant: 'secondary',
    size: 'small',
    onClick: () => {
      showScores = !showScores;
      renderCompetitionActivePage(container, competitionType, teamId, competitionId);
    },
  });
  scoreSection.appendChild(scoreToggle);

  if (showScores && currentTeam && currentCompetition && currentSettings) {
    const totalScore = calculateTotalScore(currentTeam, currentCompetition, currentSettings);
    const scoreDisplay = createElement('div', {
      className: `score-display ${totalScore < 0 ? 'score-negative' : 'score-positive'}`,
      textContent: `${t('totalScore')}: ${totalScore} ${t('points')}`,
    });
    scoreSection.appendChild(scoreDisplay);
  }

  content.appendChild(scoreSection);

  // Flights list
  const flightsSection = createElement('div', { className: 'flights-section', id: 'flights-list' });
  
  const flightsTitle = createElement('h3', {
    className: 'section-title',
    textContent: `${t('flights')} (${currentCompetition.flights.length})`,
  });
  flightsSection.appendChild(flightsTitle);

  const flightList = createFlightList(
    currentCompetition,
    currentTeam.pilots,
    currentSettings,
    {
      onAddPenalty: (flightId, penaltyId) => handleAddPenalty(container, competitionType, flightId, penaltyId),
      onRemovePenalty: (flightId, penaltyIndex) => handleRemovePenalty(container, competitionType, flightId, penaltyIndex),
      onTableAnnouncedChange: (flightId, announced) => handleTableAnnouncedChange(container, competitionType, flightId, announced),
      onTableSuccessChange: (flightId, success) => handleTableSuccessChange(container, competitionType, flightId, success),
      onEditFlight: (flightId, edit) => handleEditFlight(container, competitionType, flightId, edit),
    }
  );
  flightsSection.appendChild(flightList);

  content.appendChild(flightsSection);

  page.appendChild(content);
  container.appendChild(page);

  // Start animation loop
  startAnimationLoop(container, competitionType);
}

function getCurrentFlight(): Flight | null {
  if (!currentCompetition) return null;
  
  const activeFlight = currentCompetition.flights.find(f => f.endTimestamp === null);
  return activeFlight ?? null;
}

function getLastCompletedFlight(): Flight | null {
  if (!currentCompetition) return null;
  
  const completedFlights = currentCompetition.flights.filter(f => f.endTimestamp !== null);
  return completedFlights[completedFlights.length - 1] ?? null;
}

interface TakeoffWindow {
  isFirstTakeoff: boolean;
  referenceTimestamp: number; // Last landing, or competition start for the first takeoff
  safetyTime: number; // Takeoff before reference + safetyTime is early
  maxTime: number; // Takeoff after reference + maxTime is late
}

/**
 * The first takeoff has no safety period: the first pilot must take off
 * within firstTakeoffMaxTime after the competition start.
 * Every other takeoff is measured from the previous landing.
 */
function getNextTakeoffWindow(competition: Competition, settings: CompetitionSettings): TakeoffWindow {
  const lastFlight = getLastCompletedFlight();
  if (lastFlight?.endTimestamp != null) {
    return {
      isFirstTakeoff: false,
      referenceTimestamp: lastFlight.endTimestamp,
      safetyTime: settings.safetyTime,
      maxTime: settings.maxRelayTime,
    };
  }
  return {
    isFirstTakeoff: true,
    referenceTimestamp: competition.startTimestamp ?? Date.now(),
    safetyTime: 0,
    maxTime: settings.firstTakeoffMaxTime,
  };
}

function getPilotName(pilotId: string): string {
  const pilot = currentTeam?.pilots.find(p => p.id === pilotId);
  return pilot?.name ?? '';
}

async function handlePilotClick(
  container: HTMLElement,
  competitionType: CompetitionType,
  pilotId: string
): Promise<void> {
  if (!currentCompetition || !currentTeam || !currentSettings) return;

  const currentFlight = getCurrentFlight();
  const now = Date.now();

  if (currentFlight) {
    // End current flight if clicking on flying pilot
    if (currentFlight.pilotId === pilotId) {
      currentFlight.endTimestamp = now;
      currentFlight.duration = now - currentFlight.startTimestamp;
      
      // Calculate automatic penalties
      currentCompetition.currentFlightId = null;
      currentCompetition.safetyPeriodEndTimestamp = now + currentSettings.safetyTime;
      
      await saveCompetition(currentCompetition);
      renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
    }
    // Cannot start new flight while another is in progress
    return;
  }

  // Start new flight
  const lastFlight = getLastCompletedFlight();
  const takeoffWindow = getNextTakeoffWindow(currentCompetition, currentSettings);
  const inSafetyPeriod = isInSafetyPeriod(takeoffWindow.referenceTimestamp, takeoffWindow.safetyTime, now);

  const newFlight: Flight = {
    id: generateId(),
    teamId: currentTeam.id,
    pilotId,
    flightNumber: currentCompetition.flights.length + 1,
    startTimestamp: now,
    endTimestamp: null,
    duration: 0,
    previousFlightEndTimestamp: lastFlight?.endTimestamp ?? null,
    safetyTimeViolation: inSafetyPeriod,
    flightDurationPenalty: 0,
    earlyTakeoffPenalty: 0,
    lateRelayPenalty: 0,
    manualPenalties: [],
    tableAnnounced: false,
    tableSuccess: null,
  };

  currentCompetition.flights.push(newFlight);
  currentCompetition.currentFlightId = newFlight.id;

  await saveCompetition(currentCompetition);
  renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
}

async function handleAddPenalty(
  container: HTMLElement,
  competitionType: CompetitionType,
  flightId: string,
  penaltyId: string
): Promise<void> {
  if (!currentCompetition || !currentSettings || !currentTeam) return;

  const flight = currentCompetition.flights.find(f => f.id === flightId);
  if (!flight) return;

  const penaltyDef = currentSettings.manualPenalties.find(p => p.id === penaltyId);
  if (!penaltyDef) return;

  const penalty: ManualPenalty = {
    type: penaltyId,
    points: penaltyDef.points,
    description: getPenaltyName(penaltyDef, getLanguage()),
  };

  flight.manualPenalties.push(penalty);

  await saveCompetition(currentCompetition);
  renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
}

async function handleRemovePenalty(
  container: HTMLElement,
  competitionType: CompetitionType,
  flightId: string,
  penaltyIndex: number
): Promise<void> {
  if (!currentCompetition || !currentTeam) return;

  const flight = currentCompetition.flights.find(f => f.id === flightId);
  if (!flight) return;

  flight.manualPenalties.splice(penaltyIndex, 1);

  await saveCompetition(currentCompetition);
  renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
}

async function handleTableAnnouncedChange(
  container: HTMLElement,
  competitionType: CompetitionType,
  flightId: string,
  announced: boolean
): Promise<void> {
  if (!currentCompetition || !currentTeam) return;

  const flight = currentCompetition.flights.find(f => f.id === flightId);
  if (!flight) return;

  flight.tableAnnounced = announced;
  if (!announced) {
    flight.tableSuccess = null;
  }

  await saveCompetition(currentCompetition);
  renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
}

async function handleTableSuccessChange(
  container: HTMLElement,
  competitionType: CompetitionType,
  flightId: string,
  success: boolean | null
): Promise<void> {
  if (!currentCompetition || !currentTeam) return;

  const flight = currentCompetition.flights.find(f => f.id === flightId);
  if (!flight) return;

  flight.tableSuccess = success;

  await saveCompetition(currentCompetition);
  renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
}

async function handleEditFlight(
  container: HTMLElement,
  competitionType: CompetitionType,
  flightId: string,
  edit: FlightEdit
): Promise<void> {
  if (!currentCompetition || !currentTeam) return;

  if (!applyFlightEdit(currentCompetition, flightId, edit)) return;

  await saveCompetition(currentCompetition);
  renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
}

async function endCompetition(
  _container: HTMLElement,
  competitionType: CompetitionType
): Promise<void> {
  if (!currentCompetition || !currentTeam || !currentSettings) return;

  // Closes the flight in progress (flagged as interrupted by the end)
  finishCompetition(currentCompetition, currentSettings, Date.now());

  await saveCompetition(currentCompetition);

  navigate({
    page: 'results',
    type: competitionType,
    teamId: currentTeam.id,
    competitionId: currentCompetition.id,
  });
}

function startAnimationLoop(container: HTMLElement, competitionType: CompetitionType): void {
  function update() {
    if (!currentCompetition || !currentSettings) return;

    const now = Date.now();

    // Update competition timer
    const competitionTimerContainer = document.getElementById('competition-timer');
    if (competitionTimerContainer) {
      const timerDisplay = competitionTimerContainer.querySelector('.timer-display');
      if (timerDisplay) {
        const elapsed = now - (currentCompetition.startTimestamp ?? now);
        const remaining = Math.max(0, currentSettings.totalDuration - elapsed);
        
        updateTimerDisplay(timerDisplay as HTMLElement, elapsed, remaining, true, batterySaverMode);

        // Auto-end competition when time is up
        if (remaining === 0 && currentCompetition.isActive) {
          endCompetition(container, competitionType);
          return;
        }
      }
    }

    // Update flight timer
    const currentFlight = getCurrentFlight();
    if (currentFlight) {
      const flightTimerContainer = document.getElementById('flight-timer');
      if (flightTimerContainer) {
        const timerDisplay = flightTimerContainer.querySelector('.timer-display');
        if (timerDisplay) {
          const elapsed = now - currentFlight.startTimestamp;
          const remaining = Math.max(0, currentSettings.targetFlightDuration - elapsed);
          
          updateTimerDisplay(timerDisplay as HTMLElement, elapsed, remaining, true, batterySaverMode);
        }
      }
    } else {
      // Update safety timer
      const takeoffWindow = getNextTakeoffWindow(currentCompetition, currentSettings);
      const safetyTimeEl = document.getElementById('safety-time');
      if (safetyTimeEl) {
        const safetyRemaining = getSafetyTimeRemaining(takeoffWindow.referenceTimestamp, takeoffWindow.safetyTime, now);
        
        safetyTimeEl.textContent = formatTime(roundUpToSecond(safetyRemaining));
        
        // Re-render when safety period ends to show relay timer
        if (safetyRemaining === 0 && currentTeam) {
          renderCompetitionActivePage(container, competitionType, currentTeam.id, currentCompetition.id);
          return;
        }
      }
      
      // Update relay timer (when safety period is over)
      const relayTimeEl = document.getElementById('relay-time');
      const relayContainer = document.getElementById('relay-timer-container');
      if (relayTimeEl && relayContainer) {
        const timeSinceReference = now - takeoffWindow.referenceTimestamp;
        const relayTimeExceeded = timeSinceReference > takeoffWindow.maxTime;
        
        relayTimeEl.textContent = formatTime(timeSinceReference);
        
        // Update color based on whether penalty applies
        if (relayTimeExceeded) {
          relayContainer.classList.remove('relay-ok');
          relayContainer.classList.add('relay-penalty');
        } else {
          relayContainer.classList.remove('relay-penalty');
          relayContainer.classList.add('relay-ok');
        }
      }
    }
  }

  // Initial update
  update();
  
  // Start the loop based on mode
  if (batterySaverMode) {
    // Battery saver: update every 750ms (avoids second skips while saving battery)
    intervalId = window.setInterval(update, 750);
  } else {
    // Normal mode: smooth animations with requestAnimationFrame
    function loop() {
      update();
      animationFrameId = requestAnimationFrame(loop);
    }
    animationFrameId = requestAnimationFrame(loop);
  }
}
