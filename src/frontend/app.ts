import { initRouter, onRouteChange, getCurrentRoute } from './router/router';
import type { Route } from './router/router';
import { setLanguage } from './i18n/translations';
import { setTheme } from './theme/theme';
import { getAppSettings } from '../backend/database/db';

// Import pages
import { renderHomePage } from './pages/HomePage';
import { renderCompetitionPage } from './pages/CompetitionPage';
import { renderTeamSetupPage } from './pages/TeamSetupPage';
import { renderCompetitionActivePage } from './pages/CompetitionActivePage';
import { renderResultsPage } from './pages/ResultsPage';
import { renderSettingsPage } from './pages/SettingsPage';

let appContainer: HTMLElement | null = null;

export async function initApp(): Promise<void> {
  // Get app container
  appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  // Load app settings
  const settings = await getAppSettings();
  setLanguage(settings.language);
  setTheme(settings.theme);

  // Initialize router
  initRouter();

  // Listen for route changes
  onRouteChange(handleRouteChange);

  // Render initial route
  handleRouteChange(getCurrentRoute());

  // Register PWA service worker (handled by vite-plugin-pwa automatically)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/FFAM_Competitions/sw.js').catch(() => {
        // Service worker registration failed, app still works
      });
    });
  }
}

async function handleRouteChange(route: Route): Promise<void> {
  if (!appContainer) return;

  switch (route.page) {
    case 'home':
      await renderHomePage(appContainer);
      break;
    
    case 'competition':
      await renderCompetitionPage(appContainer, route.type);
      break;
    
    case 'team-setup':
      await renderTeamSetupPage(appContainer, route.type, route.teamId);
      break;
    
    case 'competition-active':
      await renderCompetitionActivePage(appContainer, route.type, route.teamId, route.competitionId);
      break;
    
    case 'results':
      await renderResultsPage(appContainer, route.type, route.teamId, route.competitionId);
      break;
    
    case 'settings':
      await renderSettingsPage(appContainer, route.type);
      break;
    
    default:
      await renderHomePage(appContainer);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
