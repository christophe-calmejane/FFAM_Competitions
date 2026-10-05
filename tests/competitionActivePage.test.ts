// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_3H_SETTINGS } from '../src/backend/types';
import type { Competition, CompetitionSettings, Team } from '../src/backend/types';

const START = 1_700_000_000_000;
const SETTINGS: CompetitionSettings = { ...DEFAULT_3H_SETTINGS, id: '3h' };
const TEAM = {
  id: 'team1',
  name: 'Team',
  competitionType: '3h',
  pilots: [
    { id: 'p1', name: 'Pilot 1', isFemale: false },
    { id: 'p2', name: 'Pilot 2', isFemale: false },
  ],
} as unknown as Team;

let competition: Competition;

vi.mock('../src/backend/database/db', () => ({
  getTeam: async () => TEAM,
  getCompetition: async () => competition,
  getSettings: async () => SETTINGS,
  saveCompetition: async () => {},
  generateId: () => Math.random().toString(36).slice(2),
}));

const { renderCompetitionActivePage } = await import('../src/frontend/pages/CompetitionActivePage');

// Lets the (mocked) async database calls and re-renders complete
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

let container: HTMLElement;
let hidden = false;

function flightTimeText(): string {
  return container.querySelector('#flight-timer .timer-elapsed .timer-value')?.textContent ?? '';
}

async function clickPilot(selector: string): Promise<void> {
  (container.querySelector(selector) as HTMLElement).click();
  await settle();
}

async function fly(durationMs: number): Promise<void> {
  await clickPilot('.pilot-button:not(.pilot-disabled)');
  await vi.advanceTimersByTimeAsync(durationMs);
  await clickPilot('.pilot-flying');
  // The end of the safety period re-renders the page from inside the refresh loop
  await vi.advanceTimersByTimeAsync(SETTINGS.safetyTime + 1000);
  await settle();
}

// Runs the next `count` refreshes, returning the flight time shown after each one
async function recordFlightTime(count: number): Promise<string[]> {
  const shown: string[] = [];
  for (let i = 0; i < count; i++) {
    await vi.advanceTimersToNextTimerAsync();
    shown.push(flightTimeText());
  }
  return shown;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  competition = {
    id: 'c1',
    teamId: 'team1',
    competitionType: '3h',
    startTimestamp: START,
    endTimestamp: null,
    isActive: true,
    flights: [],
    currentFlightId: null,
    safetyPeriodEndTimestamp: null,
  } as unknown as Competition;
  container = document.createElement('div');
  document.body.appendChild(container);
  await renderCompetitionActivePage(container, '3h', 'team1', 'c1');
});

afterEach(() => {
  container.remove();
  vi.useRealTimers();
});

describe('CompetitionActivePage refresh loop', () => {
  it('keeps a single pending refresh across flights and re-renders', async () => {
    expect(vi.getTimerCount()).toBe(1);

    for (let i = 0; i < 5; i++) {
      await fly(10 * 60 * 1000);
      expect(vi.getTimerCount()).toBe(1);
    }
  });

  it('stops refreshing once another page replaced it', async () => {
    await fly(10 * 60 * 1000);
    container.replaceChildren(document.createElement('div'));

    await vi.advanceTimersByTimeAsync(5000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses while hidden and refreshes right away when visible again', async () => {
    await clickPilot('.pilot-button');

    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);

    vi.setSystemTime(Date.now() + 65_000);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(flightTimeText()).toBe('01:05');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('refreshes once per second, and every tenth of a second only near the target', async () => {
    await clickPilot('.pilot-button');

    // Far from the target: whole seconds, one refresh per second
    expect(await recordFlightTime(3)).toEqual(['00:01', '00:02', '00:03']);
    expect(Date.now() - START).toBeLessThan(3100);

    // From 30 seconds before the target: tenths of a second
    await vi.advanceTimersByTimeAsync(SETTINGS.targetFlightDuration - 30_000 - (Date.now() - START) - 500);
    expect(flightTimeText()).toBe('09:29');
    expect(await recordFlightTime(3)).toEqual(['09:30.0', '09:30.1', '09:30.2']);
  });
});
