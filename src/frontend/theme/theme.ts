import type { Theme } from '../../backend/types/index.js';

let currentTheme: Theme = 'light';

export function setTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a2e' : '#1a73e8');
  }
}

export function getTheme(): Theme {
  return currentTheme;
}

export function toggleTheme(): Theme {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

// Detect system preference
export function getSystemTheme(): Theme {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}
