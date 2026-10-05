/**
 * Utility functions for local date handling without UTC-offset bugs.
 * Avoids new Date("YYYY-MM-DD") which parses as UTC midnight.
 */

/**
 * Convert a Date object to local YYYY-MM-DD string.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
export function toISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in local YYYY-MM-DD.
 * @returns {string}
 */
export function todayISO() {
  return toISO(new Date());
}

/**
 * Parse YYYY-MM-DD string safely into local Date object (00:00:00 local time).
 * @param {string} isoStr
 * @returns {Date}
 */
export function parseISO(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return new Date();
  const parts = isoStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

/**
 * Add or subtract days to an ISO date string.
 * @param {string} isoStr
 * @param {number} days
 * @returns {string}
 */
export function addDays(isoStr, days) {
  const d = parseISO(isoStr);
  d.setDate(d.getDate() + Number(days));
  return toISO(d);
}

/**
 * Calculate difference in days between two ISO strings (b - a).
 * Positive if b is after a.
 * @param {string} aIso
 * @param {string} bIso
 * @returns {number}
 */
export function diffDays(aIso, bIso) {
  const a = parseISO(aIso);
  const b = parseISO(bIso);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Format an ISO string to Indonesian date display.
 * @param {string} isoStr
 * @param {'short'|'medium'|'long'|'dayOnly'} [mode='medium']
 * @returns {string}
 */
export function formatDateIndo(isoStr, mode = 'medium') {
  const d = parseISO(isoStr);
  if (mode === 'dayOnly') {
    return String(d.getDate());
  }
  if (mode === 'short') {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  if (mode === 'long') {
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
