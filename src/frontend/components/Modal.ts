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
