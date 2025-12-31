import { createElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { createButton } from './Button';

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
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      onCancel?.();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

export function closeModal(): void {
  if (currentModal) {
    currentModal.classList.remove('modal-visible');
    setTimeout(() => {
      currentModal?.remove();
      currentModal = null;
    }, 200);
  }
}

export interface EditFlightModalOptions {
  title: string;
  currentDurationMs: number;
  onSave: (newDurationMs: number) => void;
  onCancel?: () => void;
}

export function showEditFlightModal(options: EditFlightModalOptions): void {
  closeModal();

  const {
    title,
    currentDurationMs,
    onSave,
    onCancel,
  } = options;

  // Convert to minutes and seconds
  const totalSeconds = Math.floor(currentDurationMs / 1000);
  const currentMinutes = Math.floor(totalSeconds / 60);
  const currentSeconds = totalSeconds % 60;

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
  
  // Duration label
  const durationLabel = createElement('label', {
    className: 'form-label',
    textContent: t('editFlightDuration'),
  });
  form.appendChild(durationLabel);

  // Duration inputs row
  const durationRow = createElement('div', { className: 'duration-inputs-row' });

  // Minutes input
  const minutesGroup = createElement('div', { className: 'input-group' });
  const minutesInput = createElement('input', {
    className: 'form-input duration-input',
    attributes: {
      type: 'number',
      min: '0',
      max: '999',
      value: String(currentMinutes),
      id: 'edit-flight-minutes',
    },
  }) as HTMLInputElement;
  const minutesLabel = createElement('span', {
    className: 'input-suffix',
    textContent: t('durationMinutes'),
  });
  minutesGroup.appendChild(minutesInput);
  minutesGroup.appendChild(minutesLabel);
  durationRow.appendChild(minutesGroup);

  // Separator
  const separator = createElement('span', {
    className: 'duration-separator',
    textContent: ':',
  });
  durationRow.appendChild(separator);

  // Seconds input
  const secondsGroup = createElement('div', { className: 'input-group' });
  const secondsInput = createElement('input', {
    className: 'form-input duration-input',
    attributes: {
      type: 'number',
      min: '0',
      max: '59',
      value: String(currentSeconds),
      id: 'edit-flight-seconds',
    },
  }) as HTMLInputElement;
  const secondsLabel = createElement('span', {
    className: 'input-suffix',
    textContent: t('durationSeconds'),
  });
  secondsGroup.appendChild(secondsInput);
  secondsGroup.appendChild(secondsLabel);
  durationRow.appendChild(secondsGroup);

  form.appendChild(durationRow);
  body.appendChild(form);
  modal.appendChild(body);

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
    onClick: () => {
      const minutes = parseInt(minutesInput.value, 10) || 0;
      const seconds = parseInt(secondsInput.value, 10) || 0;
      const newDurationMs = (minutes * 60 + seconds) * 1000;
      closeModal();
      onSave(newDurationMs);
    },
  });
  footer.appendChild(saveBtn);

  modal.appendChild(footer);
  backdrop.appendChild(modal);

  document.body.appendChild(backdrop);
  currentModal = backdrop;

  // Add animation class after append
  requestAnimationFrame(() => {
    backdrop.classList.add('modal-visible');
    minutesInput.focus();
    minutesInput.select();
  });

  // Handle escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      onCancel?.();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Handle enter key to save
  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const minutes = parseInt(minutesInput.value, 10) || 0;
      const seconds = parseInt(secondsInput.value, 10) || 0;
      const newDurationMs = (minutes * 60 + seconds) * 1000;
      closeModal();
      onSave(newDurationMs);
      document.removeEventListener('keydown', handleEnter);
    }
  };
  document.addEventListener('keydown', handleEnter);
}
