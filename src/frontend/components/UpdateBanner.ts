import { registerSW } from 'virtual:pwa-register';
import { createElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { getCurrentRoute } from '../router/router';
import { createButton } from './Button';

// An installed app is often resumed rather than relaunched: when it comes back
// to the foreground, look for a new version at most this often
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let applyUpdate: (() => Promise<void>) | null = null;
let isUpdateWaiting = false;
let banner: HTMLElement | null = null;

/**
 * Registers the service worker. A new version is downloaded in the background,
 * then waits for the user to apply it from the banner.
 */
export function initAppUpdate(): void {
  let lastCheckTimestamp = Date.now();

  applyUpdate = registerSW({
    onNeedRefresh() {
      isUpdateWaiting = true;
      renderUpdateBanner();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      document.addEventListener('visibilitychange', () => {
        if (document.hidden || Date.now() - lastCheckTimestamp < UPDATE_CHECK_INTERVAL_MS) return;
        lastCheckTimestamp = Date.now();
        registration.update().catch(() => {
          // Offline: checked again on a later return to the foreground
        });
      });
    },
  });
}

/**
 * Shows the banner while a new version waits, except during a competition,
 * where reloading would get in the way of the timing.
 * Called after each page render, so it follows the route and the language.
 */
export function renderUpdateBanner(): void {
  banner?.remove();
  banner = null;

  const isVisible = isUpdateWaiting && getCurrentRoute().page !== 'competition-active';
  document.body.classList.toggle('update-banner-visible', isVisible);
  if (!isVisible) return;

  banner = createElement('div', {
    className: 'update-banner',
    attributes: { role: 'status' },
  });
  banner.appendChild(createElement('span', {
    className: 'update-banner-text',
    textContent: t('updateAvailable'),
  }));
  // Reloads the page once the new version has taken over
  banner.appendChild(createButton({
    text: t('updateNow'),
    variant: 'primary',
    size: 'small',
    onClick: () => applyUpdate?.(),
  }));
  document.body.appendChild(banner);
}
