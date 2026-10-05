// Timer utilities using absolute timestamps
// Critical: Never rely on setInterval for elapsed time - always compute from timestamps

export interface TimerState {
  startTimestamp: number | null;
  endTimestamp: number | null;
  isRunning: boolean;
}

/**
 * Get current elapsed time in milliseconds
 * Uses absolute timestamps to survive app suspension
 */
export function getElapsedTime(state: TimerState): number {
  if (state.startTimestamp === null) return 0;
  
  const endTime = state.endTimestamp ?? Date.now();
  return Math.max(0, endTime - state.startTimestamp);
}

/**
 * Get remaining time in milliseconds for a countdown
 */
export function getRemainingTime(state: TimerState, totalDuration: number): number {
  const elapsed = getElapsedTime(state);
  return Math.max(0, totalDuration - elapsed);
}

/**
 * Check if timer has exceeded a duration
 */
export function hasExceededDuration(state: TimerState, duration: number): boolean {
  return getElapsedTime(state) > duration;
}

/**
 * Check if we're in safety period
 */
export function isInSafetyPeriod(
  lastFlightEndTimestamp: number | null,
  safetyDuration: number,
  currentTime: number = Date.now()
): boolean {
  if (lastFlightEndTimestamp === null) return false;
  
  const safetyEndTime = lastFlightEndTimestamp + safetyDuration;
  return currentTime < safetyEndTime;
}

/**
 * Get safety period remaining time
 */
export function getSafetyTimeRemaining(
  lastFlightEndTimestamp: number | null,
  safetyDuration: number,
  currentTime: number = Date.now()
): number {
  if (lastFlightEndTimestamp === null) return 0;
  
  const safetyEndTime = lastFlightEndTimestamp + safetyDuration;
  return Math.max(0, safetyEndTime - currentTime);
}

/**
 * Round a remaining time up to the next whole second, so a countdown reads
 * "1 second left" from 1.00s down to 0.01s, and only shows 0 once time is up.
 */
export function roundUpToSecond(ms: number): number {
  return Math.ceil(ms / 1000) * 1000;
}

/**
 * Format milliseconds to MM:SS
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds to HH:MM:SS
 */
export function formatTimeLong(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds with deciseconds for precise display
 */
export function formatTimePrecise(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const deciseconds = Math.floor((ms % 1000) / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
}

/**
 * Format milliseconds as seconds with deciseconds (e.g. 41.3)
 */
export function formatSecondsPrecise(ms: number): string {
  const deciseconds = Math.floor(ms / 100);
  return `${Math.floor(deciseconds / 10)}.${deciseconds % 10}`;
}

/**
 * Tenths of a second only matter close to the target flight duration, where they
 * decide the duration penalty. Elsewhere whole seconds are enough, and refreshing
 * the display once per second instead of ten times saves battery.
 */
export const PRECISE_DISPLAY_WINDOW_MS = 30 * 1000;

export function isNearTargetDuration(elapsed: number, targetDuration: number): boolean {
  return Math.abs(targetDuration - elapsed) <= PRECISE_DISPLAY_WINDOW_MS;
}

/**
 * Delay until a counter started at `origin` reaches its next multiple of `stepMs`,
 * i.e. until its displayed value changes. Always in ]0, stepMs].
 * Lets the display wake up only when something visible changes.
 */
export function getDelayUntilNextStep(origin: number, stepMs: number, now: number = Date.now()): number {
  const elapsedInStep = (((now - origin) % stepMs) + stepMs) % stepMs;
  return stepMs - elapsedInStep;
}
