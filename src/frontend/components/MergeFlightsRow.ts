import { createElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { showConfirmModal } from './Modal';
import { formatTime } from '../../backend/timer/timer';
import { getFlightScoreBreakdown } from '../../backend/scoring/rules';
import { mergeWithNextFlight } from '../../backend/competition/competition';
import type { Competition, CompetitionSettings } from '../../backend/types/index.js';

export interface MergeFlightsRowProps {
  competition: Competition;
  settings: CompetitionSettings;
  flightIndex: number; // First of the two flights to merge
  pilotName: string;
  onMerge: (flightId: string) => void;
}

/**
 * Row with a button merging a flight with the next one (same pilot).
 * The confirmation shows the merged flight and how its points change.
 */
export function createMergeFlightsRow(props: MergeFlightsRowProps): HTMLElement {
  const { competition, settings, flightIndex, pilotName, onMerge } = props;

  const flight = competition.flights[flightIndex];
  const numbers = { first: flightIndex + 1, second: flightIndex + 2 };

  const row = createElement('div', { className: 'flight-merge-row' });
  const button = createElement('button', {
    className: 'flight-merge-btn',
    textContent: `⇅ ${t('mergeFlights', numbers)}`,
  });

  button.addEventListener('click', () => {
    // Preview on a copy: only these two flights are affected by the merge
    const merged = structuredClone(competition);
    mergeWithNextFlight(merged, flight.id);
    const mergedFlight = merged.flights[flightIndex];

    const pointsBefore = getFlightScoreBreakdown(competition, flightIndex, settings).total
      + getFlightScoreBreakdown(competition, flightIndex + 1, settings).total;
    const pointsAfter = getFlightScoreBreakdown(merged, flightIndex, settings).total;

    const description = t('confirmMergeFlights', {
      ...numbers,
      pilot: pilotName,
      duration: formatTime(mergedFlight.endTimestamp! - mergedFlight.startTimestamp),
    });
    const points = t('mergeFlightsPoints', {
      before: formatPoints(pointsBefore),
      after: formatPoints(pointsAfter),
    });

    showConfirmModal({
      title: t('confirmMergeFlightsTitle'),
      message: `${description}\n\n${points}`,
      confirmText: t('merge'),
      variant: 'warning',
      onConfirm: () => onMerge(flight.id),
    });
  });

  row.appendChild(button);
  return row;
}

function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}
