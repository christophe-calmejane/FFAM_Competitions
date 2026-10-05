// DOM utility functions

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    id?: string;
    textContent?: string;
    innerHTML?: string;
    attributes?: Record<string, string>;
    children?: (HTMLElement | string)[];
    onClick?: (e: MouseEvent) => void;
    onChange?: (e: Event) => void;
    onInput?: (e: Event) => void;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options?.className) {
    element.className = options.className;
  }

  if (options?.id) {
    element.id = options.id;
  }

  if (options?.textContent) {
    element.textContent = options.textContent;
  }

  if (options?.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options?.children) {
    options.children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  if (options?.onClick) {
    element.addEventListener('click', options.onClick as EventListener);
  }

  if (options?.onChange) {
    element.addEventListener('change', options.onChange);
  }

  if (options?.onInput) {
    element.addEventListener('input', options.onInput);
  }

  return element;
}

/**
 * Set an element's text only when it differs: writing textContent always replaces
 * the text node, forcing a new layout and paint even for an identical value.
 */
export function setTextContent(element: Element, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function showElement(element: HTMLElement): void {
  element.classList.remove('hidden');
}

export function hideElement(element: HTMLElement): void {
  element.classList.add('hidden');
}

export function toggleElement(element: HTMLElement, show: boolean): void {
  if (show) {
    showElement(element);
  } else {
    hideElement(element);
  }
}
