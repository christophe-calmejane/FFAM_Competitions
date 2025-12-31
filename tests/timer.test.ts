import { describe, it, expect } from 'vitest';
import {
  getElapsedTime,
  getRemainingTime,
  hasExceededDuration,
  isInSafetyPeriod,
  getSafetyTimeRemaining,
  formatTime,
  formatTimeLong,
  formatTimePrecise,
} from '../src/backend/timer/timer';
import type { TimerState } from '../src/backend/timer/timer';

describe('getElapsedTime', () => {
  it('should return 0 when not started', () => {
    const state: TimerState = {
      startTimestamp: null,
      endTimestamp: null,
      isRunning: false,
    };
    expect(getElapsedTime(state)).toBe(0);
  });

  it('should calculate elapsed time for completed timer', () => {
    const start = 1000;
    const end = 5000;
    const state: TimerState = {
      startTimestamp: start,
      endTimestamp: end,
      isRunning: false,
    };
    expect(getElapsedTime(state)).toBe(4000);
  });

  it('should calculate elapsed time for running timer', () => {
    const now = Date.now();
    const start = now - 5000; // Started 5 seconds ago
    const state: TimerState = {
      startTimestamp: start,
      endTimestamp: null,
      isRunning: true,
    };
    const elapsed = getElapsedTime(state);
    // Should be approximately 5000ms (allowing for test execution time)
    expect(elapsed).toBeGreaterThanOrEqual(5000);
    expect(elapsed).toBeLessThan(6000);
  });

  it('should never return negative values', () => {
    const state: TimerState = {
      startTimestamp: Date.now() + 10000, // Future start (edge case)
      endTimestamp: null,
      isRunning: true,
    };
    expect(getElapsedTime(state)).toBe(0);
  });
});

describe('getRemainingTime', () => {
  it('should return full duration when not started', () => {
    const state: TimerState = {
      startTimestamp: null,
      endTimestamp: null,
      isRunning: false,
    };
    expect(getRemainingTime(state, 60000)).toBe(60000);
  });

  it('should calculate remaining time correctly', () => {
    const state: TimerState = {
      startTimestamp: 1000,
      endTimestamp: 31000, // 30 seconds elapsed
      isRunning: false,
    };
    expect(getRemainingTime(state, 60000)).toBe(30000);
  });

  it('should never return negative values', () => {
    const state: TimerState = {
      startTimestamp: 1000,
      endTimestamp: 100000, // Way over duration
      isRunning: false,
    };
    expect(getRemainingTime(state, 60000)).toBe(0);
  });
});

describe('hasExceededDuration', () => {
  it('should return false when not started', () => {
    const state: TimerState = {
      startTimestamp: null,
      endTimestamp: null,
      isRunning: false,
    };
    expect(hasExceededDuration(state, 60000)).toBe(false);
  });

  it('should return true when exceeded', () => {
    const state: TimerState = {
      startTimestamp: 1000,
      endTimestamp: 70000, // 69 seconds elapsed
      isRunning: false,
    };
    expect(hasExceededDuration(state, 60000)).toBe(true);
  });

  it('should return false when exactly at duration', () => {
    const state: TimerState = {
      startTimestamp: 1000,
      endTimestamp: 61000, // exactly 60 seconds
      isRunning: false,
    };
    expect(hasExceededDuration(state, 60000)).toBe(false);
  });
});

describe('isInSafetyPeriod', () => {
  it('should return false when no previous flight', () => {
    expect(isInSafetyPeriod(null, 10000)).toBe(false);
  });

  it('should return true during safety period', () => {
    const now = Date.now();
    const lastFlightEnd = now - 5000; // Ended 5 seconds ago
    expect(isInSafetyPeriod(lastFlightEnd, 10000, now)).toBe(true);
  });

  it('should return false after safety period', () => {
    const now = Date.now();
    const lastFlightEnd = now - 15000; // Ended 15 seconds ago
    expect(isInSafetyPeriod(lastFlightEnd, 10000, now)).toBe(false);
  });

  it('should return false at exact end of safety period', () => {
    const now = Date.now();
    const lastFlightEnd = now - 10000; // Ended exactly 10 seconds ago
    expect(isInSafetyPeriod(lastFlightEnd, 10000, now)).toBe(false);
  });
});

describe('getSafetyTimeRemaining', () => {
  it('should return 0 when no previous flight', () => {
    expect(getSafetyTimeRemaining(null, 10000)).toBe(0);
  });

  it('should calculate remaining safety time', () => {
    const now = Date.now();
    const lastFlightEnd = now - 3000; // Ended 3 seconds ago
    const remaining = getSafetyTimeRemaining(lastFlightEnd, 10000, now);
    expect(remaining).toBe(7000);
  });

  it('should return 0 after safety period', () => {
    const now = Date.now();
    const lastFlightEnd = now - 15000; // Ended 15 seconds ago
    expect(getSafetyTimeRemaining(lastFlightEnd, 10000, now)).toBe(0);
  });
});

describe('formatTime', () => {
  it('should format seconds correctly', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5000)).toBe('00:05');
    expect(formatTime(30000)).toBe('00:30');
  });

  it('should format minutes correctly', () => {
    expect(formatTime(60000)).toBe('01:00');
    expect(formatTime(90000)).toBe('01:30');
    expect(formatTime(4 * 60 * 1000)).toBe('04:00');
  });

  it('should format large values correctly', () => {
    expect(formatTime(91 * 60 * 1000)).toBe('91:00');
  });
});

describe('formatTimeLong', () => {
  it('should format without hours when < 1 hour', () => {
    expect(formatTimeLong(30 * 60 * 1000)).toBe('30:00');
  });

  it('should format with hours when >= 1 hour', () => {
    expect(formatTimeLong(60 * 60 * 1000)).toBe('1:00:00');
    expect(formatTimeLong(90 * 60 * 1000)).toBe('1:30:00');
    expect(formatTimeLong(3 * 60 * 60 * 1000)).toBe('3:00:00');
  });
});

describe('formatTimePrecise', () => {
  it('should include deciseconds', () => {
    expect(formatTimePrecise(0)).toBe('00:00.0');
    expect(formatTimePrecise(5500)).toBe('00:05.5');
    expect(formatTimePrecise(65300)).toBe('01:05.3');
  });
});
