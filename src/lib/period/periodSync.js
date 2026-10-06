import { supabase } from '$lib/supabaseClient.js';
import { sanitizeCycles } from './periodStore.js';

export function isValidUUID(str) {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function ensureUUID(id) {
  if (isValidUUID(id)) return id;
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
 * Fetch all period data from Supabase (cycles, daily logs, settings).
 * @returns {Promise<{cycles: Array, logs: Object, settings: Object}|null>}
 */
export async function fetchPeriodDataFromSupabase() {
  try {
    const [cyclesRes, logsRes, settingsRes] = await Promise.all([
      supabase.from('period_cycles').select('*').order('start_date', { ascending: true }),
      supabase.from('period_daily_logs').select('*'),
      supabase.from('period_settings').select('*').eq('id', 1).maybeSingle()
    ]);

    if (cyclesRes.error) {
      console.warn('Supabase cycles fetch error:', cyclesRes.error.message);
    }
    if (logsRes.error) {
      console.warn('Supabase logs fetch error:', logsRes.error.message);
    }

    const cyclesData = cyclesRes.data || [];
    const logsData = logsRes.data || [];
    const settingsData = settingsRes.data || null;

    // Format cycles back to store format
    const cycles = sanitizeCycles(
      cyclesData.map(c => ({
        id: c.id,
        start: c.start_date,
        end: c.end_date || null
      }))
    );

    // Format logs back to store map format
    const logs = {};
    for (const row of logsData) {
      if (row.log_date) {
        logs[row.log_date] = {
          flow: row.flow || null,
          mood: row.mood || 'calm',
          symptoms: Array.isArray(row.symptoms) ? row.symptoms : ['fine'],
          water: row.water_cups !== null && row.water_cups !== undefined ? Number(row.water_cups) : 4,
          note: row.note || '',
          weight: row.weight !== null && row.weight !== undefined ? Number(row.weight) : 48.5,
          sleep: row.sleep_duration || '7h 45m',
          temp: row.temperature !== null && row.temperature !== undefined ? Number(row.temperature) : 36.6,
          tags: Array.isArray(row.tags) ? row.tags : [],
          updatedAt: row.updated_at || new Date().toISOString()
        };
      }
    }

    const settings = {
      cycleLength: settingsData ? Number(settingsData.cycle_length) || 28 : 28,
      periodDuration: settingsData ? Number(settingsData.period_duration) || 5 : 5
    };

    return { cycles, logs, settings };
  } catch (err) {
    console.error('Failed to fetch period data from Supabase:', err);
    return null;
  }
}

/**
 * Sync (upsert) a single cycle to Supabase.
 * @param {{id: string, start: string, end: string|null}} cycle
 */
export async function syncCycleToSupabase(cycle) {
  try {
    const validId = ensureUUID(cycle.id);
    cycle.id = validId;

    const payload = {
      id: validId,
      start_date: cycle.start,
      end_date: cycle.end || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('period_cycles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to sync cycle to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error syncing cycle to Supabase:', err);
  }
}

/**
 * Sync multiple cycles in batch to Supabase.
 * @param {Array<{id: string, start: string, end: string|null}>} cycles
 */
export async function syncAllCyclesToSupabase(cycles) {
  if (!Array.isArray(cycles) || cycles.length === 0) return;
  try {
    const payload = cycles.map(c => {
      const validId = ensureUUID(c.id);
      c.id = validId;
      return {
        id: validId,
        start_date: c.start,
        end_date: c.end || null,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase.from('period_cycles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to batch sync cycles to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error batch syncing cycles to Supabase:', err);
  }
}

/**
 * Delete a cycle entry from Supabase.
 * @param {string} cycleId
 */
export async function deleteCycleFromSupabase(cycleId) {
  if (!cycleId || !isValidUUID(cycleId)) return;
  try {
    const { error } = await supabase.from('period_cycles').delete().eq('id', cycleId);
    if (error) {
      console.warn('Failed to delete cycle from Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error deleting cycle from Supabase:', err);
  }
}

/**
 * Sync (upsert) daily log for a specific date to Supabase.
 * @param {string} logDate - YYYY-MM-DD
 * @param {Object} logData
 */
export async function syncDailyLogToSupabase(logDate, logData) {
  if (!logDate || !logData) return;
  try {
    const payload = {
      log_date: logDate,
      flow: logData.flow || null,
      mood: logData.mood || 'calm',
      symptoms: Array.isArray(logData.symptoms) ? logData.symptoms : ['fine'],
      water_cups: logData.water !== undefined ? Number(logData.water) : 4,
      note: logData.note || '',
      weight: logData.weight !== undefined ? Number(logData.weight) : 48.5,
      sleep_duration: logData.sleep || '7h 45m',
      temperature: logData.temp !== undefined ? Number(logData.temp) : 36.6,
      tags: Array.isArray(logData.tags) ? logData.tags : [],
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('period_daily_logs').upsert(payload, { onConflict: 'log_date' });
    if (error) {
      console.warn('Failed to sync daily log to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error syncing daily log to Supabase:', err);
  }
}

/**
 * Sync settings to Supabase.
 * @param {{cycleLength: number, periodDuration: number}} settings
 */
export async function syncSettingsToSupabase(settings) {
  if (!settings) return;
  try {
    const payload = {
      id: 1,
      cycle_length: Number(settings.cycleLength) || 28,
      period_duration: Number(settings.periodDuration) || 5,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('period_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to sync settings to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error syncing settings to Supabase:', err);
  }
}
