import { createElement, clearElement } from '../utils/dom';
import { t, getLanguage, setLanguage } from '../i18n/translations';
import { getTheme, setTheme } from '../theme/theme';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import { getAppSettings, saveAppSettings } from '../../backend/database/db';
import type { Language, Theme } from '../../backend/types/index.js';

export async function renderHomePage(container: HTMLElement): Promise<void> {
  clearElement(container);
  
  const appSettings = await getAppSettings();
  setLanguage(appSettings.language);
  setTheme(appSettings.theme);

  const page = createElement('div', { className: 'page page-home' });

  // Header with settings
  const header = createElement('header', { className: 'home-header' });
  
  const title = createElement('h1', {
    className: 'app-title',
    textContent: t('appTitle'),
  });
  header.appendChild(title);

  // Settings row
  const settingsRow = createElement('div', { className: 'settings-row' });

  // Language toggle
  const langContainer = createElement('div', { className: 'setting-item' });
  const langLabel = createElement('span', {
    className: 'setting-label',
    textContent: t('language'),
  });
  const langButtons = createElement('div', { className: 'lang-buttons' });
  
  const frBtn = createButton({
    text: '🇫🇷 FR',
    variant: getLanguage() === 'fr' ? 'primary' : 'secondary',
    size: 'small',
    onClick: async () => {
      await updateLanguage('fr');
      renderHomePage(container);
    },
  });
  
  const enBtn = createButton({
    text: '🇬🇧 EN',
    variant: getLanguage() === 'en' ? 'primary' : 'secondary',
    size: 'small',
    onClick: async () => {
      await updateLanguage('en');
      renderHomePage(container);
    },
  });

  langButtons.appendChild(frBtn);
  langButtons.appendChild(enBtn);
  langContainer.appendChild(langLabel);
  langContainer.appendChild(langButtons);
  settingsRow.appendChild(langContainer);

  // Theme toggle
  const themeContainer = createElement('div', { className: 'setting-item' });
  const themeLabel = createElement('span', {
    className: 'setting-label',
    textContent: t('theme'),
  });
  const themeButtons = createElement('div', { className: 'theme-buttons' });
  
  const lightBtn = createButton({
    text: `☀️ ${t('themeLight')}`,
    variant: getTheme() === 'light' ? 'primary' : 'secondary',
    size: 'small',
    onClick: async () => {
      await updateTheme('light');
      renderHomePage(container);
    },
  });
  
  const darkBtn = createButton({
    text: `🌙 ${t('themeDark')}`,
    variant: getTheme() === 'dark' ? 'primary' : 'secondary',
    size: 'small',
    onClick: async () => {
      await updateTheme('dark');
      renderHomePage(container);
    },
  });

  themeButtons.appendChild(lightBtn);
  themeButtons.appendChild(darkBtn);
  themeContainer.appendChild(themeLabel);
  themeContainer.appendChild(themeButtons);
  settingsRow.appendChild(themeContainer);

  header.appendChild(settingsRow);
  page.appendChild(header);

  // Welcome message
  const welcome = createElement('div', { className: 'welcome-section' });
  
  const welcomeTitle = createElement('h2', {
    className: 'welcome-title',
    textContent: t('welcome'),
  });
  welcome.appendChild(welcomeTitle);

  const welcomeText = createElement('p', {
    className: 'welcome-text',
    textContent: t('selectCompetition'),
  });
  welcome.appendChild(welcomeText);

  page.appendChild(welcome);

  // Competition selection
  const competitionSection = createElement('div', { className: 'competition-selection' });

  // 91 minutes card
  const card91 = createCompetitionCard(
    '91min',
    t('competition91min'),
    '91 min',
    t('competition91minDesc'),
    () => navigate({ page: 'competition', type: '91min' })
  );
  competitionSection.appendChild(card91);

  // 3 hours card
  const card3h = createCompetitionCard(
    '3h',
    t('competition3h'),
    '3h',
    t('competition3hDesc'),
    () => navigate({ page: 'competition', type: '3h' })
  );
  competitionSection.appendChild(card3h);

  page.appendChild(competitionSection);
  container.appendChild(page);
}

function createCompetitionCard(
  type: string,
  title: string,
  duration: string,
  description: string,
  onClick: () => void
): HTMLElement {
  const card = createElement('div', {
    className: `competition-card competition-${type}`,
    onClick,
  });

  const durationBadge = createElement('div', {
    className: 'competition-duration',
    textContent: duration,
  });

  const titleEl = createElement('h3', {
    className: 'competition-title',
    textContent: title,
  });

  const descEl = createElement('p', {
    className: 'competition-description',
    textContent: description,
  });

  const arrow = createElement('span', {
    className: 'competition-arrow',
    textContent: '→',
  });

  card.appendChild(durationBadge);
  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(arrow);

  return card;
}

async function updateLanguage(lang: Language): Promise<void> {
  setLanguage(lang);
  const settings = await getAppSettings();
  settings.language = lang;
  await saveAppSettings(settings);
}

async function updateTheme(theme: Theme): Promise<void> {
  setTheme(theme);
  const settings = await getAppSettings();
  settings.theme = theme;
  await saveAppSettings(settings);
}
