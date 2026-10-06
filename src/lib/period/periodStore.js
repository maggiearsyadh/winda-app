import { todayISO, addDays, diffDays } from './dateUtils.js';

export const STORAGE_KEY_V2 = 'winda_period_tracker_v2';
export const STORAGE_KEY_V1 = 'winda_period_tracker_v1';

/**
 * @typedef {Object} DayLog
 * @property {string} [flow] - 'light' | 'medium' | 'heavy' | null
 * @property {string} [mood] - 'calm' | 'happy' | 'sad' | 'energetic' | 'frisky' | null
 * @property {string[]} [symptoms] - list of symptom IDs
 * @property {string} [note] - optional daily notes
 * @property {number} [weight] - kg
 * @property {string} [sleep] - e.g. '7h 45m'
 * @property {string} [updatedAt] - ISO timestamp
 */

/**
 * @typedef {Object} PeriodStoreData
 * @property {number} version
 * @property {{cycleLength: number, periodDuration: number}} settings
 * @property {Array<{id: string, start: string, end: string|null}>} cycles
 * @property {Record<string, DayLog>} logs
 */

/**
 * Load store data from localStorage with graceful migration from v1.
 * @returns {PeriodStoreData}
 */
export function loadPeriodStore() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultStore();
  }

  try {
    const v2Raw = localStorage.getItem(STORAGE_KEY_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (parsed && Array.isArray(parsed.cycles)) {
        const cleanedCycles = sanitizeCycles(parsed.cycles).filter(c => c.id !== 'cycle_init_1');
        return {
          version: 2,
          settings: {
            cycleLength: Number(parsed.settings?.cycleLength) || 28,
            periodDuration: Number(parsed.settings?.periodDuration) || 5
          },
          cycles: cleanedCycles,
          logs: parsed.logs || {}
        };
      }
    }

    // Migrate from v1 if v2 doesn't exist
    const v1Raw = localStorage.getItem(STORAGE_KEY_V1);
    if (v1Raw) {
      const v1 = JSON.parse(v1Raw);
      const start = v1.lastPeriodStart || addDays(todayISO(), -1);
      const isOngoing = v1.isPeriodOngoing ?? true;
      const duration = Number(v1.periodDuration) || 5;
      const cycleLength = Number(v1.cycleLength) || 28;

      const initialCycles = [
        {
          id: 'cycle_migrated_1',
          start,
          end: isOngoing ? null : addDays(start, duration - 1)
        }
      ];

      // If user had logged mood/symptoms/flow in v1, save it for the date
      const initialLogs = {};
      const targetDate = v1.updatedAt ? v1.updatedAt.split('T')[0] : todayISO();
      initialLogs[targetDate] = {
        flow: v1.selectedFlow || 'medium',
        mood: v1.selectedMood || 'calm',
        symptoms: v1.selectedSymptoms || ['cramps'],
        weight: v1.loggedWeight || 48.5,
        sleep: v1.loggedSleep || '7h 45m',
        updatedAt: v1.updatedAt || new Date().toISOString()
      };

      const migratedStore = {
        version: 2,
        settings: {
          cycleLength,
          periodDuration: duration
        },
        cycles: initialCycles,
        logs: initialLogs
      };

      // Persist v2 immediately
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migratedStore));
      return migratedStore;
    }
  } catch (err) {
    console.error('Error loading period store:', err);
  }

  return createDefaultStore();
}

/**
 * Create fresh default store data.
 * @returns {PeriodStoreData}
 */
export function generateCycleId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sanitize and deduplicate cycles without destructively corrupting valid distinct intervals.
 * Only merges genuine duplicates (same start date) or directly overlapping periods.
 * @param {Array<{id: string, start: string, end: string|null}>} rawCycles
 * @returns {Array<{id: string, start: string, end: string|null}>}
 */
export function sanitizeCycles(rawCycles) {
  if (!Array.isArray(rawCycles) || rawCycles.length === 0) return [];
  const sorted = [...rawCycles].sort((a, b) => a.start.localeCompare(b.start));
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    if (result.length === 0) {
      result.push({ ...curr });
      continue;
    }
    const prev = result[result.length - 1];

    // If identical start date: merge duplicate
    if (prev.start === curr.start) {
      prev.end = curr.end || prev.end;
      continue;
    }

    // If prev has an end date, and curr starts before or on prev.end (direct date overlap)
    if (prev.end && curr.start <= prev.end) {
      prev.end = curr.end && curr.end > prev.end ? curr.end : prev.end;
      continue;
    }

    result.push({ ...curr });
  }
  return result;
}

export function createDefaultStore() {
  return {
    version: 2,
    settings: {
      cycleLength: 28,
      periodDuration: 5
    },
    cycles: [],
    logs: {}
  };
}

/**
 * Persist store data to localStorage.
 * @param {PeriodStoreData} store
 */
export function savePeriodStore(store) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(store));
  } catch (err) {
    console.error('Error saving period store:', err);
  }
}

/**
 * Add a new period cycle.
 * If previous cycle had no end, it is closed gracefully on the day before.
 * @param {Array<{id: string, start: string, end: string|null}>} cycles
 * @param {string} startIso - YYYY-MM-DD
 * @returns {Array<{id: string, start: string, end: string|null}>}
 */
export function startCycle(cycles, startIso = todayISO()) {
  if (!cycles || cycles.length === 0) {
    return [{ id: generateCycleId(), start: startIso, end: null }];
  }

  const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
  const latest = sorted[sorted.length - 1];

  // If latest cycle is ongoing and within 20 days, update its start date (Edit Date behavior)
  const diffFromLatest = Math.abs(diffDays(latest.start, startIso));
  if (!latest.end && diffFromLatest <= 20) {
    const updated = sorted.map(c => {
      if (c.id === latest.id) {
        return { ...c, start: startIso };
      }
      return c;
    });
    return sanitizeCycles(updated);
  }

  // Auto-close preceding ongoing cycle if new startIso is later
  const updated = sorted.map(c => {
    if (!c.end && diffDays(c.start, startIso) > 0) {
      return { ...c, end: addDays(startIso, -1) };
    }
    return c;
  });

  const existingIdx = updated.findIndex(c => c.start === startIso);
  if (existingIdx !== -1) {
    updated[existingIdx].end = null;
    return sanitizeCycles(updated);
  }

  const newCycle = {
    id: generateCycleId(),
    start: startIso,
    end: null
  };

  return sanitizeCycles([...updated, newCycle]);
}

/**
 * Mark active period cycle ended on endIso.
 * @param {Array<{id: string, start: string, end: string|null}>} cycles
 * @param {string} endIso - YYYY-MM-DD
 * @returns {Array<{id: string, start: string, end: string|null}>}
 */
export function endCycle(cycles, endIso = todayISO()) {
  if (!cycles || cycles.length === 0) return cycles;
  const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
  const latest = sorted[sorted.length - 1];

  // End date cannot be before start date
  const safeEnd = diffDays(latest.start, endIso) < 0 ? latest.start : endIso;

  return sorted.map(c => {
    if (c.id === latest.id) {
      return { ...c, end: safeEnd };
    }
    return c;
  });
}
