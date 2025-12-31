import { createElement } from '../utils/dom';

export interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  icon?: string;
}

export function createButton(props: ButtonProps): HTMLButtonElement {
  const {
    text,
    onClick,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    className = '',
    icon,
  } = props;

  const button = createElement('button', {
    className: `btn btn-${variant} btn-${size} ${className}`.trim(),
    onClick: () => {
      if (!disabled) onClick();
    },
  });

  if (icon) {
    button.innerHTML = `<span class="btn-icon">${icon}</span><span class="btn-text">${text}</span>`;
  } else {
    button.textContent = text;
  }

  if (disabled) {
    button.disabled = true;
    button.classList.add('btn-disabled');
  }

  return button;
}

export function createIconButton(props: Omit<ButtonProps, 'text'> & { icon: string; ariaLabel: string }): HTMLButtonElement {
  const button = createElement('button', {
    className: `btn-icon-only btn-${props.variant || 'primary'} ${props.className || ''}`.trim(),
    onClick: props.onClick,
    attributes: {
      'aria-label': props.ariaLabel,
    },
  });

  button.innerHTML = props.icon;

  if (props.disabled) {
    button.disabled = true;
    button.classList.add('btn-disabled');
  }

  return button;
}
