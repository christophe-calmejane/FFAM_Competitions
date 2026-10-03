import { createElement, clearElement } from '../utils/dom';
import { t, getLanguage, getPenaltyName } from '../i18n/translations';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import { showEditFlightModal } from '../components/Modal';
import {
  getTeam,
  getCompetition,
  getSettings,
  saveCompetition,
} from '../../backend/database/db';
import { formatTimeLong, formatTimePrecise, formatSecondsPrecise } from '../../backend/timer/timer';
import {
  getScoreBreakdown,
  calculateTotalScore,
  getFlightScoreBreakdown,
  getTakeoffDelay,
  isFlightInterruptedByCompetitionEnd,
  getMissedTakeoffDelay,
  calculateMissedTakeoffPenalty,
} from '../../backend/scoring/rules';
import type { FlightScoreBreakdown } from '../../backend/scoring/rules';
import { applyFlightEdit } from '../../backend/competition/competition';
import type { FlightEdit } from '../../backend/competition/competition';
import type { CompetitionType, CompetitionSettings, Flight } from '../../backend/types/index.js';

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

  const flightsTable = createElement('div', {
    className: 'flights-table',
    attributes: { role: 'table' },
  });

  flightsTable.appendChild(createFlightsTableRow('flights-table-head', [
    '#',
    t('columnPilot'),
    t('columnTakeoffDelay'),
    t('columnFlightTime'),
    t('columnPenalties'),
    '',
  ], 'columnheader'));

  // Helper function to handle flight edit
  const handleFlightEdit = async (flightId: string, edit: FlightEdit): Promise<void> => {
    if (!applyFlightEdit(competition, flightId, edit)) return;

    await saveCompetition(competition);
    renderResultsPage(container, competitionType, teamId, competitionId);
  };

  let totalTakeoffDelayMs = 0;
  let totalFlightTimeMs = 0;
  let totalFlightPoints = 0;

  competition.flights.forEach((flight, index) => {
    const pilot = team.pilots.find(p => p.id === flight.pilotId);
    const isFirstFlight = index === 0;
    const duration = flight.endTimestamp ? flight.endTimestamp - flight.startTimestamp : 0;
    const takeoffDelay = getTakeoffDelay(competition, index);
    const flightBreakdown = getFlightScoreBreakdown(competition, index, settings);

    totalTakeoffDelayMs += takeoffDelay ?? 0;
    totalFlightTimeMs += duration;
    totalFlightPoints += flightBreakdown.total;

    const flightEntry = createElement('div', { className: 'flights-table-entry' });

    // Edit button
    const editBtn = createElement('button', {
      className: 'flight-edit-btn',
      textContent: '✏️',
      attributes: { title: t('editFlight') },
    });
    editBtn.addEventListener('click', () => {
      showEditFlightModal({
        competition,
        flightIndex: index,
        onSave: (edit) => handleFlightEdit(flight.id, edit),
      });
    });

    const row = createFlightsTableRow('', [
      String(index + 1),
      pilot?.name ?? '?',
      takeoffDelay !== null ? formatSecondsPrecise(takeoffDelay) : '-',
      formatTimePrecise(duration),
      formatPoints(flightBreakdown.total),
      editBtn,
    ], 'cell');
    row.children[4].classList.add(getPointsClassName(flightBreakdown.total));
    flightEntry.appendChild(row);

    // Itemized penalties for this flight
    const detailChips = getFlightPenaltyItems(flight, flightBreakdown, isFirstFlight, settings)
      .map(item => createPenaltyChip(`${item.label} ${formatPoints(item.points)}`, item.points));
    if (isFlightInterruptedByCompetitionEnd(competition, index)) {
      detailChips.push(createPenaltyChip(t('flightInterruptedShort'), 0));
    }
    if (detailChips.length > 0) {
      const details = createElement('div', { className: 'flight-penalty-details' });
      detailChips.forEach(chip => details.appendChild(chip));
      flightEntry.appendChild(details);
    }

    flightsTable.appendChild(flightEntry);
  });

  // Nobody took off between the last landing and the end
  const missedTakeoffDelay = getMissedTakeoffDelay(competition);
  if (missedTakeoffDelay !== null) {
    const missedTakeoffPenalty = calculateMissedTakeoffPenalty(competition, settings);
    totalTakeoffDelayMs += missedTakeoffDelay;
    totalFlightPoints += missedTakeoffPenalty;

    const missedEntry = createElement('div', { className: 'flights-table-entry flights-table-missed' });
    const missedRow = createFlightsTableRow('', [
      '–',
      t('missedTakeoff'),
      formatSecondsPrecise(missedTakeoffDelay),
      '',
      formatPoints(missedTakeoffPenalty),
      '',
    ], 'cell');
    missedRow.children[4].classList.add(getPointsClassName(missedTakeoffPenalty));
    missedEntry.appendChild(missedRow);

    if (missedTakeoffPenalty !== 0) {
      const lateLabel = competition.flights.length === 0 ? t('penaltyLateFirstTakeoffShort') : t('penaltyLateRelayShort');
      const details = createElement('div', { className: 'flight-penalty-details' });
      details.appendChild(createPenaltyChip(`${lateLabel} ${formatPoints(missedTakeoffPenalty)}`, missedTakeoffPenalty));
      missedEntry.appendChild(details);
    }

    flightsTable.appendChild(missedEntry);
  }

  // Totals (same as the bottom line of the official sheet)
  const totalRow = createFlightsTableRow('flights-table-total', [
    '',
    t('flightsTotal'),
    formatSecondsPrecise(totalTakeoffDelayMs),
    formatTimeLong(totalFlightTimeMs),
    formatPoints(totalFlightPoints),
    '',
  ], 'cell');
  totalRow.children[4].classList.add(getPointsClassName(totalFlightPoints));
  flightsTable.appendChild(totalRow);

  flightsCard.appendChild(flightsTable);
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

// ============ Flights table helpers ============

const FLIGHTS_TABLE_COLUMN_CLASSES = [
  'col-index',
  'col-pilot',
  'col-number',
  'col-number',
  'col-number col-points',
  'col-action',
];

function createFlightsTableRow(
  className: string,
  cells: (string | HTMLElement)[],
  cellRole: 'columnheader' | 'cell'
): HTMLElement {
  const row = createElement('div', {
    className: `flights-table-row ${className}`.trim(),
    attributes: { role: 'row' },
  });

  cells.forEach((cell, index) => {
    const cellEl = createElement('span', {
      className: FLIGHTS_TABLE_COLUMN_CLASSES[index],
      attributes: { role: cellRole },
    });
    if (typeof cell === 'string') {
      cellEl.textContent = cell;
    } else {
      cellEl.appendChild(cell);
    }
    row.appendChild(cellEl);
  });

  return row;
}

interface FlightPenaltyItem {
  label: string;
  points: number;
}

function getFlightPenaltyItems(
  flight: Flight,
  breakdown: FlightScoreBreakdown,
  isFirstFlight: boolean,
  settings: CompetitionSettings
): FlightPenaltyItem[] {
  const items: FlightPenaltyItem[] = [
    { label: t('penaltyDurationShort'), points: breakdown.flightDurationPenalty },
    { label: t('penaltyEarlyTakeoffShort'), points: breakdown.earlyTakeoffPenalty },
    {
      label: isFirstFlight ? t('penaltyLateFirstTakeoffShort') : t('penaltyLateRelayShort'),
      points: breakdown.lateRelayPenalty,
    },
    { label: 'Table', points: breakdown.tablePoints },
  ];

  flight.manualPenalties.forEach(penalty => {
    const definition = settings.manualPenalties.find(p => p.id === penalty.type);
    items.push({
      label: definition ? getPenaltyName(definition, getLanguage()) : penalty.description,
      points: penalty.points,
    });
  });

  return items.filter(item => item.points !== 0);
}

function createPenaltyChip(text: string, points: number): HTMLElement {
  return createElement('span', {
    className: `flight-penalty-chip ${getPointsClassName(points)}`,
    textContent: text,
  });
}

function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

function getPointsClassName(points: number): string {
  if (points > 0) return 'points-penalty';
  if (points < 0) return 'points-bonus';
  return 'points-none';
}
