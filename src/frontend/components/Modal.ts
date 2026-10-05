import { createElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { createButton } from './Button';
import { formatSecondsPrecise } from '../../backend/timer/timer';
import { getTakeoffDelay, isFlightInterruptedByCompetitionEnd } from '../../backend/scoring/rules';
import type { FlightEdit } from '../../backend/competition/competition';
import type { Competition } from '../../backend/types/index.js';

export interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

let currentModal: HTMLElement | null = null;
let currentKeyHandler: ((e: KeyboardEvent) => void) | null = null;

function setModalKeyHandler(handler: (e: KeyboardEvent) => void): void {
  currentKeyHandler = handler;
  document.addEventListener('keydown', handler);
}

export function showConfirmModal(options: ModalOptions): void {
  // Remove any existing modal
  closeModal();

  const {
    title,
    message,
    confirmText = t('confirm'),
    cancelText = t('cancel'),
    variant = 'danger',
    onConfirm,
    onCancel,
  } = options;

  // Create backdrop
  const backdrop = createElement('div', { className: 'modal-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
      onCancel?.();
    }
  });

  // Create modal
  const modal = createElement('div', { className: `modal modal-${variant}` });

  // Header
  const header = createElement('div', { className: 'modal-header' });
  const titleEl = createElement('h3', {
    className: 'modal-title',
    textContent: title,
  });
  header.appendChild(titleEl);
  modal.appendChild(header);

  // Body
  const body = createElement('div', { className: 'modal-body' });
  const messageEl = createElement('p', {
    className: 'modal-message',
    textContent: message,
  });
  body.appendChild(messageEl);
  modal.appendChild(body);

  // Footer
  const footer = createElement('div', { className: 'modal-footer' });

  const cancelBtn = createButton({
    text: cancelText,
    variant: 'secondary',
    size: 'medium',
    onClick: () => {
      closeModal();
      onCancel?.();
    },
  });
  footer.appendChild(cancelBtn);

  const confirmBtn = createButton({
    text: confirmText,
    variant: variant === 'danger' ? 'danger' : 'primary',
    size: 'medium',
    onClick: () => {
      closeModal();
      onConfirm();
    },
  });
  footer.appendChild(confirmBtn);

  modal.appendChild(footer);
  backdrop.appendChild(modal);

  document.body.appendChild(backdrop);
  currentModal = backdrop;

  // Add animation class after append
  requestAnimationFrame(() => {
    backdrop.classList.add('modal-visible');
  });

  // Handle escape key
  setModalKeyHandler((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      onCancel?.();
    }
  });
}

export function closeModal(): void {
  if (currentKeyHandler) {
    document.removeEventListener('keydown', currentKeyHandler);
    currentKeyHandler = null;
  }
  if (currentModal) {
    // Remove this exact modal after the animation, even if another one opened meanwhile
    const closingModal = currentModal;
    currentModal = null;
    closingModal.classList.remove('modal-visible');
    setTimeout(() => closingModal.remove(), 200);
  }
}

export interface EditFlightModalOptions {
  competition: Competition;
  flightIndex: number;
  onSave: (edit: FlightEdit) => void;
  onCancel?: () => void;
}

export function showEditFlightModal(options: EditFlightModalOptions): void {
  closeModal();

  const { competition, flightIndex, onSave, onCancel } = options;

  const flight = competition.flights[flightIndex];
  const title = `${t('editFlight')} #${flightIndex + 1}`;
  const isFirstFlight = flightIndex === 0;
  const takeoffDelayMs = getTakeoffDelay(competition, flightIndex);
  const durationMs = flight.endTimestamp !== null ? flight.endTimestamp - flight.startTimestamp : 0;
  // Only the last flight of a finished competition can have been interrupted by the end
  const isLastFlightOfEndedCompetition = competition.endTimestamp !== null
    && flightIndex === competition.flights.length - 1;
  const endedByCompetitionEnd = isLastFlightOfEndedCompetition
    ? isFlightInterruptedByCompetitionEnd(competition, flightIndex)
    : null;

  // Convert to minutes and seconds
  const totalSeconds = Math.floor(durationMs / 1000);
  const initialMinutes = String(Math.floor(totalSeconds / 60));
  const initialSeconds = String(totalSeconds % 60);
  const initialTakeoffDelay = takeoffDelayMs !== null ? formatSecondsPrecise(takeoffDelayMs) : '';

  // Create backdrop
  const backdrop = createElement('div', { className: 'modal-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
      onCancel?.();
    }
  });

  // Create modal
  const modal = createElement('div', { className: 'modal modal-info modal-edit-flight' });

  // Header
  const header = createElement('div', { className: 'modal-header' });
  const titleEl = createElement('h3', {
    className: 'modal-title',
    textContent: title,
  });
  header.appendChild(titleEl);
  modal.appendChild(header);

  // Body with form
  const body = createElement('div', { className: 'modal-body' });
  
  const form = createElement('div', { className: 'edit-flight-form' });

  // Takeoff delay
  let takeoffInput: HTMLInputElement | null = null;
  if (takeoffDelayMs !== null) {
    const takeoffGroup = createElement('div', { className: 'edit-flight-field' });
    takeoffGroup.appendChild(createElement('label', {
      className: 'form-label',
      textContent: isFirstFlight ? t('editTakeoffDelayFirst') : t('editTakeoffDelay'),
      attributes: { for: 'edit-flight-takeoff' },
    }));

    const takeoffRow = createElement('div', { className: 'duration-inputs-row' });
    const takeoffInputGroup = createElement('div', { className: 'input-group' });
    takeoffInput = createElement('input', {
      className: 'form-input duration-input takeoff-input',
      attributes: {
        type: 'number',
        min: '0',
        step: '0.1',
        inputmode: 'decimal',
        value: initialTakeoffDelay,
        id: 'edit-flight-takeoff',
      },
    }) as HTMLInputElement;
    takeoffInputGroup.appendChild(takeoffInput);
    takeoffInputGroup.appendChild(createElement('span', {
      className: 'input-suffix',
      textContent: t('durationSeconds'),
    }));
    takeoffRow.appendChild(takeoffInputGroup);
    takeoffGroup.appendChild(takeoffRow);
    form.appendChild(takeoffGroup);
  }

  // Duration
  const durationGroup = createElement('div', { className: 'edit-flight-field' });
  durationGroup.appendChild(createElement('label', {
    className: 'form-label',
    textContent: t('editFlightDuration'),
    attributes: { for: 'edit-flight-minutes' },
  }));

  const durationRow = createElement('div', { className: 'duration-inputs-row' });

  // Minutes input
  const minutesGroup = createElement('div', { className: 'input-group' });
  const minutesInput = createElement('input', {
    className: 'form-input duration-input',
    attributes: {
      type: 'number',
      min: '0',
      max: '999',
      inputmode: 'numeric',
      value: initialMinutes,
      id: 'edit-flight-minutes',
    },
  }) as HTMLInputElement;
  minutesGroup.appendChild(minutesInput);
  minutesGroup.appendChild(createElement('span', {
    className: 'input-suffix',
    textContent: t('durationMinutes'),
  }));
  durationRow.appendChild(minutesGroup);

  // Separator
  durationRow.appendChild(createElement('span', {
    className: 'duration-separator',
    textContent: ':',
  }));

  // Seconds input
  const secondsGroup = createElement('div', { className: 'input-group' });
  const secondsInput = createElement('input', {
    className: 'form-input duration-input',
    attributes: {
      type: 'number',
      min: '0',
      max: '59',
      inputmode: 'numeric',
      value: initialSeconds,
      id: 'edit-flight-seconds',
    },
  }) as HTMLInputElement;
  secondsGroup.appendChild(secondsInput);
  secondsGroup.appendChild(createElement('span', {
    className: 'input-suffix',
    textContent: t('durationSeconds'),
  }));
  durationRow.appendChild(secondsGroup);

  durationGroup.appendChild(durationRow);
  form.appendChild(durationGroup);

  // Flight still in progress at the end of the competition
  let interruptedCheckbox: HTMLInputElement | null = null;
  if (endedByCompetitionEnd !== null) {
    const interruptedLabel = createElement('label', { className: 'checkbox-label edit-flight-interrupted' });
    interruptedCheckbox = createElement('input', {
      attributes: { type: 'checkbox' },
    }) as HTMLInputElement;
    interruptedCheckbox.checked = endedByCompetitionEnd;
    interruptedLabel.appendChild(interruptedCheckbox);
    interruptedLabel.appendChild(createElement('span', {
      textContent: t('flightInterruptedByEnd'),
    }));
    form.appendChild(interruptedLabel);
  }

  body.appendChild(form);
  modal.appendChild(body);

  // Only the fields actually changed are returned, so an untouched value
  // never loses its sub-second precision
  const save = () => {
    const edit: FlightEdit = {};

    if (takeoffInput && takeoffInput.value !== initialTakeoffDelay) {
      const takeoffSeconds = parseFloat(takeoffInput.value);
      if (Number.isFinite(takeoffSeconds) && takeoffSeconds >= 0) {
        edit.takeoffDelayMs = Math.round(takeoffSeconds * 10) * 100;
      }
    }

    if (minutesInput.value !== initialMinutes || secondsInput.value !== initialSeconds) {
      const minutes = parseInt(minutesInput.value, 10) || 0;
      const seconds = parseInt(secondsInput.value, 10) || 0;
      edit.durationMs = (minutes * 60 + seconds) * 1000;
    }

    if (interruptedCheckbox) {
      edit.endedByCompetitionEnd = interruptedCheckbox.checked;
    }

    closeModal();
    onSave(edit);
  };

  // Footer
  const footer = createElement('div', { className: 'modal-footer' });

  const cancelBtn = createButton({
    text: t('cancel'),
    variant: 'secondary',
    size: 'medium',
    onClick: () => {
      closeModal();
      onCancel?.();
    },
  });
  footer.appendChild(cancelBtn);

  const saveBtn = createButton({
    text: t('save'),
    variant: 'primary',
    size: 'medium',
    onClick: save,
  });
  footer.appendChild(saveBtn);

  modal.appendChild(footer);
  backdrop.appendChild(modal);

  document.body.appendChild(backdrop);
  currentModal = backdrop;

  // Focus right away, still within the tap that opened the modal:
  // iOS only opens the keyboard for a focus() made during a user gesture
  const firstInput = takeoffInput ?? minutesInput;
  firstInput.focus();
  firstInput.select();

  // Add animation class after append
  requestAnimationFrame(() => {
    backdrop.classList.add('modal-visible');
  });

  // Escape cancels, Enter saves
  setModalKeyHandler((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      onCancel?.();
    } else if (e.key === 'Enter') {
      save();
    }
  });
}
