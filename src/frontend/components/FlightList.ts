import { createElement } from '../utils/dom';
import type { Competition, CompetitionSettings, Pilot } from '../../backend/types/index.js';
import type { FlightEdit } from '../../backend/competition/competition';
import { formatTime } from '../../backend/timer/timer';
import { t, getLanguage, getPenaltyName } from '../i18n/translations';
import { createButton } from './Button';
import { showEditFlightModal } from './Modal';
import {
  getFlightScoreBreakdown,
  getTakeoffDelay,
  calculateTablePoints,
  sumManualPenalties,
} from '../../backend/scoring/rules';

export interface FlightListHandlers {
  onAddPenalty: (flightId: string, penaltyId: string) => void;
  onRemovePenalty: (flightId: string, penaltyIndex: number) => void;
  onTableAnnouncedChange: (flightId: string, announced: boolean) => void;
  onTableSuccessChange: (flightId: string, success: boolean | null) => void;
  onEditFlight?: (flightId: string, edit: FlightEdit) => void;
}

export interface FlightListItemProps extends FlightListHandlers {
  competition: Competition;
  flightIndex: number;
  pilot: Pilot;
  settings: CompetitionSettings;
}

export function createFlightListItem(props: FlightListItemProps): HTMLElement {
  const {
    competition,
    flightIndex,
    pilot,
    settings,
    onAddPenalty,
    onRemovePenalty,
    onTableAnnouncedChange,
    onTableSuccessChange,
    onEditFlight,
  } = props;

  const flight = competition.flights[flightIndex];
  const isComplete = flight.endTimestamp !== null;
  const duration = isComplete ? flight.endTimestamp! - flight.startTimestamp : 0;

  const item = createElement('div', {
    className: `flight-item ${isComplete ? 'flight-complete' : 'flight-in-progress'}`,
    attributes: { 'data-flight-id': flight.id },
  });

  // Header
  const header = createElement('div', { className: 'flight-header' });
  
  const flightNumber = createElement('span', {
    className: 'flight-number',
    textContent: `${t('flight')} #${flightIndex + 1}`,
  });
  
  const pilotName = createElement('span', {
    className: 'flight-pilot',
    textContent: pilot.name,
  });
  
  const durationEl = createElement('span', {
    className: 'flight-duration',
    textContent: isComplete ? formatTime(duration) : '...',
  });

  header.appendChild(flightNumber);
  header.appendChild(pilotName);
  header.appendChild(durationEl);

  // Add edit button for completed flights
  if (isComplete && onEditFlight) {
    const editBtn = createElement('button', {
      className: 'flight-edit-btn',
      textContent: '✏️',
      attributes: { title: t('editFlight') },
    });
    editBtn.addEventListener('click', () => {
      showEditFlightModal({
        competition,
        flightIndex,
        onSave: (edit) => onEditFlight(flight.id, edit),
      });
    });
    header.appendChild(editBtn);
  }

  item.appendChild(header);

  // Automatic penalties
  if (isComplete) {
    const autoPenalties = createElement('div', { className: 'flight-auto-penalties' });

    const isFirstFlight = flightIndex === 0;
    const breakdown = getFlightScoreBreakdown(competition, flightIndex, settings);

    // Flight duration penalty
    if (breakdown.flightDurationPenalty > 0) {
      const deviation = Math.abs(duration - settings.targetFlightDuration);
      const deviationSign = duration > settings.targetFlightDuration ? '+' : '-';
      
      autoPenalties.appendChild(createElement('div', {
        className: 'penalty-auto penalty-duration',
        textContent: `${t('flightDurationPenalty')}: ${deviationSign}${formatTime(deviation)} → +${breakdown.flightDurationPenalty} ${t('points')}`,
      }));
    }

    // Early takeoff penalty
    if (breakdown.earlyTakeoffPenalty > 0) {
      autoPenalties.appendChild(createElement('div', {
        className: 'penalty-auto penalty-early-takeoff',
        textContent: `${t('earlyTakeoffPenalty')}: +${breakdown.earlyTakeoffPenalty} ${t('points')}`,
      }));
    }

    // Late relay penalty (or late first takeoff)
    const takeoffDelay = getTakeoffDelay(competition, flightIndex);
    if (breakdown.lateRelayPenalty > 0 && takeoffDelay !== null) {
      const maxTime = isFirstFlight ? settings.firstTakeoffMaxTime : settings.maxRelayTime;
      const excessTime = takeoffDelay - maxTime;
      const label = isFirstFlight ? t('lateFirstTakeoffPenalty') : t('lateRelayPenalty');
      
      autoPenalties.appendChild(createElement('div', {
        className: 'penalty-auto penalty-late-relay',
        textContent: `${label}: +${formatTime(excessTime)} → +${breakdown.lateRelayPenalty} ${t('points')}`,
      }));
    }

    if (autoPenalties.children.length > 0) {
      item.appendChild(autoPenalties);
    }
  }

  // Table announcement section (91min only)
  if (settings.competitionType === '91min' && isComplete) {
    const tableSection = createElement('div', { className: 'flight-table-section' });
    
    const tableAnnouncedBtn = createButton({
      text: t('tableAnnounced'),
      variant: flight.tableAnnounced ? 'success' : 'secondary',
      size: 'small',
      onClick: () => onTableAnnouncedChange(flight.id, !flight.tableAnnounced),
    });
    tableSection.appendChild(tableAnnouncedBtn);

    if (flight.tableAnnounced) {
      const tableSuccessBtn = createButton({
        text: t('tableSuccess'),
        variant: flight.tableSuccess === true ? 'success' : 'secondary',
        size: 'small',
        onClick: () => onTableSuccessChange(flight.id, flight.tableSuccess === true ? null : true),
      });
      
      const tableFailedBtn = createButton({
        text: t('tableFailed'),
        variant: flight.tableSuccess === false ? 'danger' : 'secondary',
        size: 'small',
        onClick: () => onTableSuccessChange(flight.id, flight.tableSuccess === false ? null : false),
      });

      tableSection.appendChild(tableSuccessBtn);
      tableSection.appendChild(tableFailedBtn);

      // Show table points
      const tablePoints = calculateTablePoints(flight.tableAnnounced, flight.tableSuccess);
      if (tablePoints !== 0) {
        const tablePointsEl = createElement('span', {
          className: `table-points ${tablePoints < 0 ? 'bonus' : 'penalty'}`,
          textContent: `${tablePoints > 0 ? '+' : ''}${tablePoints} ${t('points')}`,
        });
        tableSection.appendChild(tablePointsEl);
      }
    }

    item.appendChild(tableSection);
  }

  // Manual penalties section
  if (isComplete) {
    const manualSection = createElement('div', { className: 'flight-manual-section' });
    
    const manualLabel = createElement('div', {
      className: 'manual-penalties-label',
      textContent: t('manualPenalties'),
    });
    manualSection.appendChild(manualLabel);

    // Penalty buttons
    const penaltyButtons = createElement('div', { className: 'penalty-buttons' });
    settings.manualPenalties.forEach(penalty => {
      const btn = createButton({
        text: `${getPenaltyName(penalty, getLanguage())} (+${penalty.points})`,
        variant: 'warning',
        size: 'small',
        onClick: () => onAddPenalty(flight.id, penalty.id),
      });
      penaltyButtons.appendChild(btn);
    });
    manualSection.appendChild(penaltyButtons);

    // Applied manual penalties
    if (flight.manualPenalties.length > 0) {
      const appliedPenalties = createElement('div', { className: 'applied-penalties' });
      
      flight.manualPenalties.forEach((penalty, index) => {
        const penaltyTag = createElement('div', {
          className: 'penalty-tag',
        });
        
        const penaltyText = createElement('span', {
          textContent: `${penalty.description} (+${penalty.points})`,
        });
        
        const removeBtn = createButton({
          text: '×',
          variant: 'danger',
          size: 'small',
          className: 'penalty-remove-btn',
          onClick: () => onRemovePenalty(flight.id, index),
        });

        penaltyTag.appendChild(penaltyText);
        penaltyTag.appendChild(removeBtn);
        appliedPenalties.appendChild(penaltyTag);
      });

      const totalManual = sumManualPenalties(flight.manualPenalties);
      const totalEl = createElement('div', {
        className: 'manual-total',
        textContent: `Total: +${totalManual} ${t('points')}`,
      });
      appliedPenalties.appendChild(totalEl);

      manualSection.appendChild(appliedPenalties);
    }

    item.appendChild(manualSection);
  }

  return item;
}

export function createFlightList(
  competition: Competition,
  pilots: Pilot[],
  settings: CompetitionSettings,
  handlers: FlightListHandlers
): HTMLElement {
  const list = createElement('div', { className: 'flight-list' });

  const pilotsMap = new Map(pilots.map(p => [p.id, p]));

  const flights = competition.flights;

  // Show flights in reverse order (newest first)
  [...flights].reverse().forEach((flight, reversedIndex) => {
    const flightIndex = flights.length - 1 - reversedIndex;
    const pilot = pilotsMap.get(flight.pilotId);
    
    if (!pilot) return;

    const item = createFlightListItem({
      competition,
      flightIndex,
      pilot,
      settings,
      ...handlers,
    });

    list.appendChild(item);
  });

  if (flights.length === 0) {
    const emptyMessage = createElement('div', {
      className: 'flight-list-empty',
      textContent: t('noFlightInProgress'),
    });
    list.appendChild(emptyMessage);
  }

  return list;
}
