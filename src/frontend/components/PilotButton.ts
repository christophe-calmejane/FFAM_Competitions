import { createElement } from '../utils/dom';
import type { Pilot } from '../../backend/types/index.js';

export interface PilotButtonProps {
  pilot: Pilot;
  isActive: boolean;
  isDisabled: boolean;
  isFlying: boolean;
  onClick: () => void;
}

export function createPilotButton(props: PilotButtonProps): HTMLElement {
  const { pilot, isActive, isDisabled, isFlying, onClick } = props;

  const button = createElement('button', {
    className: `pilot-button ${isActive ? 'pilot-active' : ''} ${isDisabled ? 'pilot-disabled' : ''} ${isFlying ? 'pilot-flying' : ''} ${pilot.isFemale ? 'pilot-female' : ''}`,
    onClick: () => {
      if (!isDisabled) onClick();
    },
  });

  const nameEl = createElement('span', {
    className: 'pilot-name',
    textContent: pilot.name,
  });

  const statusEl = createElement('span', {
    className: 'pilot-status',
    textContent: isFlying ? '✈️' : '',
  });

  if (pilot.isFemale) {
    const femaleIcon = createElement('span', {
      className: 'pilot-female-icon',
      textContent: '♀',
    });
    button.appendChild(femaleIcon);
  }

  button.appendChild(nameEl);
  button.appendChild(statusEl);

  if (isDisabled) {
    button.setAttribute('disabled', 'true');
  }

  return button;
}

export function createPilotButtonsGrid(
  pilots: Pilot[],
  activePilotId: string | null,
  flyingPilotId: string | null,
  onPilotClick: (pilotId: string) => void
): HTMLElement {
  const grid = createElement('div', {
    className: 'pilots-grid',
  });

  pilots.forEach(pilot => {
    const isFlying = pilot.id === flyingPilotId;
    const isActive = pilot.id === activePilotId;
    const isDisabled = flyingPilotId !== null && !isFlying;

    const button = createPilotButton({
      pilot,
      isActive,
      isDisabled,
      isFlying,
      onClick: () => onPilotClick(pilot.id),
    });

    grid.appendChild(button);
  });

  return grid;
}
