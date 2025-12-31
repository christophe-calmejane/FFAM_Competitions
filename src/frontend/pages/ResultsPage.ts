import { createElement, clearElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import { showEditFlightModal } from '../components/Modal';
import {
  getTeam,
  getCompetition,
  getSettings,
  saveCompetition,
} from '../../backend/database/db';
import { formatTime, formatTimeLong } from '../../backend/timer/timer';
import { getScoreBreakdown, calculateTotalScore } from '../../backend/scoring/rules';
import type { CompetitionType, Competition } from '../../backend/types/index.js';

export async function renderResultsPage(
  container: HTMLElement,
  competitionType: CompetitionType,
  teamId: string,
  competitionId: string
): Promise<void> {
  clearElement(container);

  const team = await getTeam(teamId);
  const competition = await getCompetition(competitionId);
  const settings = await getSettings(competitionType);

  if (!team || !competition || !settings) {
    navigate({ page: 'competition', type: competitionType });
    return;
  }

  const page = createElement('div', { className: 'page page-results' });

  // Header
  const header = createElement('header', { className: 'page-header' });
  
  const backBtn = createButton({
    text: `← ${t('back')}`,
    variant: 'secondary',
    size: 'small',
    onClick: () => navigate({ page: 'competition', type: competitionType }),
  });
  header.appendChild(backBtn);

  const title = createElement('h1', {
    className: 'page-title',
    textContent: t('results'),
  });
  header.appendChild(title);

  page.appendChild(header);

  // Content
  const content = createElement('div', { className: 'results-content' });

  // Team info card
  const teamCard = createElement('div', { className: 'result-card team-info-card' });
  
  const teamName = createElement('h2', {
    className: 'result-team-name',
    textContent: team.name,
  });
  teamCard.appendChild(teamName);

  const pilotsList = createElement('div', { className: 'result-pilots' });
  team.pilots.forEach(pilot => {
    const pilotTag = createElement('span', {
      className: `pilot-tag ${pilot.isFemale ? 'pilot-female' : ''}`,
      textContent: `${pilot.name}${pilot.isFemale ? ' ♀' : ''}`,
    });
    pilotsList.appendChild(pilotTag);
  });
  teamCard.appendChild(pilotsList);

  // Competition duration
  if (competition.startTimestamp && competition.endTimestamp) {
    const duration = competition.endTimestamp - competition.startTimestamp;
    const durationInfo = createElement('p', {
      className: 'result-duration',
      textContent: `⏱️ ${t('flightDuration')}: ${formatTimeLong(duration)}`,
    });
    teamCard.appendChild(durationInfo);
  }

  content.appendChild(teamCard);

  // Score breakdown
  const breakdown = getScoreBreakdown(team, competition, settings);
  const totalScore = calculateTotalScore(team, competition, settings);

  // Final score (large display)
  const scoreCard = createElement('div', { className: 'result-card score-card' });
  
  const scoreTitle = createElement('h3', {
    className: 'score-title',
    textContent: t('finalScore'),
  });
  scoreCard.appendChild(scoreTitle);

  const scoreValue = createElement('div', {
    className: `score-value ${totalScore < 0 ? 'score-negative' : 'score-positive'}`,
    textContent: `${totalScore} ${t('points')}`,
  });
  scoreCard.appendChild(scoreValue);

  content.appendChild(scoreCard);

  // Score breakdown card
  const breakdownCard = createElement('div', { className: 'result-card breakdown-card' });
  
  const breakdownTitle = createElement('h3', {
    className: 'breakdown-title',
    textContent: t('scoreBreakdown'),
  });
  breakdownCard.appendChild(breakdownTitle);

  const breakdownList = createElement('div', { className: 'breakdown-list' });

  // Add breakdown items
  const breakdownItems = [
    { label: t('flightDurationPenalty'), value: breakdown.flightDurationPenalties, isBonus: false },
    { label: t('earlyTakeoffPenalty'), value: breakdown.earlyTakeoffPenalties, isBonus: false },
    { label: t('lateRelayPenalty'), value: breakdown.lateRelayPenalties, isBonus: false },
    { label: t('manualPenalties'), value: breakdown.manualPenalties, isBonus: false },
  ];

  // Add 91min specific
  if (competitionType === '91min') {
    breakdownItems.push({
      label: 'Table',
      value: breakdown.tablePoints,
      isBonus: breakdown.tablePoints < 0,
    });
  }

  // Add 3h specific
  if (competitionType === '3h') {
    if (breakdown.noThermalPenalty > 0) {
      breakdownItems.push({
        label: t('noThermalPlane'),
        value: breakdown.noThermalPenalty,
        isBonus: false,
      });
    }
    if (breakdown.pilotNeverFlewPenalty > 0) {
      breakdownItems.push({
        label: t('pilotNeverFlew'),
        value: breakdown.pilotNeverFlewPenalty,
        isBonus: false,
      });
    }
  }

  // Add female bonus
  if (breakdown.femalePilotBonus !== 0) {
    breakdownItems.push({
      label: t('femalePilotBonus'),
      value: breakdown.femalePilotBonus,
      isBonus: true,
    });
  }

  breakdownItems.forEach(item => {
    if (item.value === 0) return;
    
    const row = createElement('div', {
      className: `breakdown-row ${item.isBonus ? 'breakdown-bonus' : 'breakdown-penalty'}`,
    });
    
    const label = createElement('span', {
      className: 'breakdown-label',
      textContent: item.label,
    });
    
    const value = createElement('span', {
      className: 'breakdown-value',
      textContent: `${item.value > 0 ? '+' : ''}${item.value}`,
    });

    row.appendChild(label);
    row.appendChild(value);
    breakdownList.appendChild(row);
  });

  breakdownCard.appendChild(breakdownList);
  content.appendChild(breakdownCard);

  // Flights summary
  const flightsCard = createElement('div', { className: 'result-card flights-card' });
  
  const flightsTitle = createElement('h3', {
    className: 'flights-title',
    textContent: `${t('flights')} (${competition.flights.length})`,
  });
  flightsCard.appendChild(flightsTitle);

  const flightsSummary = createElement('div', { className: 'flights-summary' });

  // Helper function to handle flight edit
  const handleFlightEdit = async (flightId: string, newDurationMs: number): Promise<void> => {
    const flight = competition.flights.find(f => f.id === flightId);
    if (!flight || flight.endTimestamp === null) return;

    flight.endTimestamp = flight.startTimestamp + newDurationMs;
    flight.duration = newDurationMs;

    await saveCompetition(competition as Competition);
    renderResultsPage(container, competitionType, teamId, competitionId);
  };

  competition.flights.forEach((flight, index) => {
    const pilot = team.pilots.find(p => p.id === flight.pilotId);
    const duration = flight.endTimestamp ? flight.endTimestamp - flight.startTimestamp : 0;
    
    const flightRow = createElement('div', { className: 'flight-summary-row' });
    
    const flightInfo = createElement('span', {
      className: 'flight-info',
      textContent: `#${index + 1} ${pilot?.name ?? 'Unknown'}: ${formatTime(duration)}`,
    });
    
    const flightPenalties = flight.manualPenalties.length > 0
      ? ` (+${flight.manualPenalties.reduce((sum, p) => sum + p.points, 0)} manual)`
      : '';
    
    const penaltiesSpan = createElement('span', {
      className: 'flight-penalties',
      textContent: flightPenalties,
    });

    // Edit button
    const editBtn = createElement('button', {
      className: 'flight-edit-btn',
      textContent: '✏️',
      attributes: { title: t('editFlight') },
    });
    editBtn.addEventListener('click', () => {
      showEditFlightModal({
        title: `${t('editFlight')} #${index + 1}`,
        currentDurationMs: duration,
        onSave: (newDurationMs) => handleFlightEdit(flight.id, newDurationMs),
      });
    });

    flightRow.appendChild(flightInfo);
    flightRow.appendChild(penaltiesSpan);
    flightRow.appendChild(editBtn);
    flightsSummary.appendChild(flightRow);
  });

  flightsCard.appendChild(flightsSummary);
  content.appendChild(flightsCard);

  // Pilots who never flew (3h)
  if (competitionType === '3h') {
    const pilotsWhoFlew = new Set(competition.flights.map(f => f.pilotId));
    const pilotsWhoNeverFlew = team.pilots.filter(p => !pilotsWhoFlew.has(p.id));
    
    if (pilotsWhoNeverFlew.length > 0) {
      const neverFlewCard = createElement('div', { className: 'result-card warning-card' });
      
      const neverFlewTitle = createElement('h3', {
        textContent: `⚠️ ${t('pilotNeverFlew')}`,
      });
      neverFlewCard.appendChild(neverFlewTitle);
      
      const neverFlewList = createElement('div', { className: 'never-flew-list' });
      pilotsWhoNeverFlew.forEach(pilot => {
        const pilotTag = createElement('span', {
          className: 'pilot-tag warning',
          textContent: `${pilot.name} (+${settings.pilotNeverFlewPenalty} pts)`,
        });
        neverFlewList.appendChild(pilotTag);
      });
      neverFlewCard.appendChild(neverFlewList);
      
      content.appendChild(neverFlewCard);
    }
  }

  page.appendChild(content);
  container.appendChild(page);
}
