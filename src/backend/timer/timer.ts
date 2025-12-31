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
 * Create an animation frame based timer that recomputes from timestamps
 * Returns a cleanup function
 */
export function createTimerDisplay(
  getState: () => TimerState,
  onUpdate: (elapsed: number, remaining: number, totalDuration: number) => void,
  totalDuration: number
): () => void {
  let animationId: number | null = null;
  
  function update() {
    const state = getState();
    const elapsed = getElapsedTime(state);
    const remaining = getRemainingTime(state, totalDuration);
    
    onUpdate(elapsed, remaining, totalDuration);
    
    if (state.isRunning) {
      animationId = requestAnimationFrame(update);
    }
  }
  
  animationId = requestAnimationFrame(update);
  
  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}
