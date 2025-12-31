import { createElement } from '../utils/dom';
import { formatTimeLong, formatTimePrecise } from '../../backend/timer/timer';

export interface TimerDisplayProps {
  elapsed: number;
  remaining: number;
  totalDuration: number;
  isRunning: boolean;
  showRemaining?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'competition' | 'flight' | 'safety';
  label?: string;
}

export function createTimerDisplay(props: TimerDisplayProps): HTMLElement {
  const {
    elapsed,
    remaining,
    isRunning,
    showRemaining = true,
    size = 'medium',
    variant = 'competition',
    label,
  } = props;

  const container = createElement('div', {
    className: `timer-display timer-${size} timer-${variant} ${isRunning ? 'timer-running' : ''}`,
  });

  if (label) {
    const labelEl = createElement('div', {
      className: 'timer-label',
      textContent: label,
    });
    container.appendChild(labelEl);
  }

  const timeContainer = createElement('div', {
    className: 'timer-values',
  });

  // Elapsed time
  const elapsedEl = createElement('div', {
    className: 'timer-elapsed',
  });
  const elapsedLabelEl = createElement('span', {
    className: 'timer-value-label',
    textContent: '▶',
  });
  const elapsedValueEl = createElement('span', {
    className: 'timer-value',
    textContent: size === 'large' ? formatTimePrecise(elapsed) : formatTimeLong(elapsed),
  });
  elapsedEl.appendChild(elapsedLabelEl);
  elapsedEl.appendChild(elapsedValueEl);
  timeContainer.appendChild(elapsedEl);

  // Remaining time
  if (showRemaining) {
    const remainingEl = createElement('div', {
      className: `timer-remaining ${remaining < 60000 ? 'timer-warning' : ''}`,
    });
    const remainingLabelEl = createElement('span', {
      className: 'timer-value-label',
      textContent: '◀',
    });
    const remainingValueEl = createElement('span', {
      className: 'timer-value',
      textContent: formatTimeLong(remaining),
    });
    remainingEl.appendChild(remainingLabelEl);
    remainingEl.appendChild(remainingValueEl);
    timeContainer.appendChild(remainingEl);
  }

  container.appendChild(timeContainer);

  return container;
}

export function updateTimerDisplay(
  container: HTMLElement,
  elapsed: number,
  remaining: number,
  isRunning: boolean,
  batterySaverMode: boolean = false
): void {
  const elapsedValueEl = container.querySelector('.timer-elapsed .timer-value');
  const elapsedEl = container.querySelector('.timer-elapsed');
  const remainingValueEl = container.querySelector('.timer-remaining .timer-value');
  const remainingEl = container.querySelector('.timer-remaining');

  if (elapsedValueEl) {
    const isLarge = container.classList.contains('timer-large');
    // In battery saver mode, always use formatTimeLong (no decimals)
    elapsedValueEl.textContent = (isLarge && !batterySaverMode) ? formatTimePrecise(elapsed) : formatTimeLong(elapsed);
  }

  // Show exceeded state (orange) when time is exceeded
  if (elapsedEl) {
    elapsedEl.classList.toggle('timer-exceeded', remaining === 0 && isRunning);
  }

  if (remainingValueEl) {
    remainingValueEl.textContent = formatTimeLong(remaining);
  }

  if (remainingEl) {
    remainingEl.classList.toggle('timer-warning', remaining < 60000 && remaining > 0);
    remainingEl.classList.toggle('timer-critical', remaining < 10000 && remaining > 0);
    remainingEl.classList.toggle('timer-exceeded', remaining === 0 && isRunning);
  }

  container.classList.toggle('timer-running', isRunning);
}
