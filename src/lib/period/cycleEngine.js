import { diffDays, addDays, todayISO, parseISO } from './dateUtils.js';

/**
 * @typedef {Object} Cycle
 * @property {string} id
 * @property {string} start - YYYY-MM-DD
 * @property {string|null} end - YYYY-MM-DD or null if ongoing
 */

/**
 * Compute statistical averages from recorded cycles.
 * @param {Cycle[]} rawCycles
 * @param {{cycleLength?: number, periodDuration?: number}} [settings={}]
 */
export function computeStats(rawCycles = [], settings = {}) {
  const defaultCycle = Number(settings.cycleLength) || 28;
  const defaultPeriod = Number(settings.periodDuration) || 5;

  if (!rawCycles || rawCycles.length === 0) {
    return {
      avgCycleLength: defaultCycle,
      avgPeriodDuration: defaultPeriod,
      isIrregular: false,
      cycleCount: 0,
      recordedIntervals: []
    };
  }

  // Sort chronologically ascending
  const sorted = [...rawCycles].sort((a, b) => a.start.localeCompare(b.start));

  // 1. Calculate cycle lengths (distance between consecutive cycle starts)
  const intervals = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const len = diffDays(sorted[i].start, sorted[i + 1].start);
    // Medical normal range roughly 18 - 60 days
    if (len >= 18 && len <= 60) {
      intervals.push(len);
    }
  }

  // Use up to last 6 cycles for moving average
  const recentIntervals = intervals.slice(-6);
  let avgCycleLength = defaultCycle;
  if (recentIntervals.length > 0) {
    const sum = recentIntervals.reduce((acc, v) => acc + v, 0);
    avgCycleLength = Math.round(sum / recentIntervals.length);
  }

  // Check irregularity (difference between max and min cycle > 7 days)
  let isIrregular = false;
  if (recentIntervals.length >= 3) {
    const maxI = Math.max(...recentIntervals);
    const minI = Math.min(...recentIntervals);
    isIrregular = (maxI - minI) > 7;
  }

  // 2. Calculate period durations (diff between start and end + 1)
  const durations = [];
  for (const c of sorted) {
    if (c.end) {
      const dur = diffDays(c.start, c.end) + 1;
      if (dur >= 2 && dur <= 14) {
        durations.push(dur);
      }
    }
  }
  const recentDurations = durations.slice(-6);
  let avgPeriodDuration = defaultPeriod;
  if (recentDurations.length > 0) {
    const sum = recentDurations.reduce((acc, v) => acc + v, 0);
    avgPeriodDuration = Math.round(sum / recentDurations.length);
  }

  return {
    avgCycleLength,
    avgPeriodDuration,
    isIrregular,
    cycleCount: sorted.length,
    recordedIntervals: recentIntervals
  };
}

/**
 * Predict next cycle milestones based on latest cycle and statistics.
 * @param {Cycle[]} rawCycles
 * @param {ReturnType<typeof computeStats>} stats
 * @param {string} [today=todayISO()]
 */
export function predictCycle(rawCycles = [], stats, today = todayISO()) {
  if (!rawCycles || rawCycles.length === 0) {
    const nextPeriodStart = addDays(today, stats.avgCycleLength);
    const ovulationDate = addDays(nextPeriodStart, -14);
    return {
      latestStart: today,
      nextPeriodStart,
      ovulationDate,
      fertileStart: addDays(ovulationDate, -5),
      fertileEnd: addDays(ovulationDate, 1),
      daysUntilNext: stats.avgCycleLength,
      lateDays: 0,
      isLate: false
    };
  }

  const sorted = [...rawCycles].sort((a, b) => a.start.localeCompare(b.start));
  const latest = sorted[sorted.length - 1];

  const nextPeriodStart = addDays(latest.start, stats.avgCycleLength);
  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  const daysUntilNext = diffDays(today, nextPeriodStart);

  // Late check: today is past predicted next start, and latest cycle is either ended or past cycle length
  const diffFromLatest = diffDays(latest.start, today);
  const isPastCycle = diffFromLatest >= stats.avgCycleLength;
  const lateDays = isPastCycle ? diffDays(nextPeriodStart, today) : 0;
  const isLate = lateDays > 0;

  return {
    latestStart: latest.start,
    latestEnd: latest.end,
    nextPeriodStart,
    ovulationDate,
    fertileStart,
    fertileEnd,
    daysUntilNext,
    lateDays,
    isLate
  };
}

/**
 * Get cycle day, phase, and UI colors for any date (past, present, or projected future).
 * @param {string} targetDate - YYYY-MM-DD
 * @param {Cycle[]} rawCycles
 * @param {ReturnType<typeof computeStats>} stats
 * @param {string} [today=todayISO()]
 */
export function getDayStatus(targetDate, rawCycles = [], stats, today = todayISO()) {
  if (!rawCycles || rawCycles.length === 0) {
    return {
      cDay: 0,
      dayText: 'Mulai Catat',
      label: 'Belum Ada Siklus',
      phase: 'menstruation',
      phaseName: 'Belum Ada Data',
      phaseEnglish: 'Ready to Track',
      isPeriod: false,
      isPredictedPeriod: false,
      isFertile: false,
      isOvulation: false,
      lateDays: 0,
      charBody: '#FDA4AF',
      charContour: '#FB7185',
      charHighlight: '#FFE4E6',
      knobFill: '#FDA4AF',
      knobStroke: '#F43F5E',
      knobAngle: 0
    };
  }

  const prediction = predictCycle(rawCycles, stats, today);
  const sorted = [...rawCycles].sort((a, b) => a.start.localeCompare(b.start));
  const latest = sorted[sorted.length - 1] || { start: today, end: null };

  // Check if targetDate falls in a known recorded cycle
  let matchedCycle = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const c = sorted[i];
    if (diffDays(c.start, targetDate) >= 0) {
      matchedCycle = c;
      break;
    }
  }

  const cycleStart = matchedCycle ? matchedCycle.start : latest.start;
  const diff = diffDays(cycleStart, targetDate);

  // Pre-cycle / future cycle detection
  if (diff < 0) {
    return {
      cDay: 1,
      dayText: `H${diff}`,
      label: 'Menuju Haid',
      phase: 'pre-cycle',
      phaseName: 'Persiapan',
      phaseEnglish: 'Preparation',
      isPeriod: false,
      isPredictedPeriod: false,
      isFertile: false,
      isOvulation: false,
      lateDays: 0,
      charBody: '#60A5FA',
      charContour: '#2563EB',
      charHighlight: '#93C5FD',
      knobFill: '#60A5FA',
      knobStroke: '#1D4ED8',
      knobAngle: 210
    };
  }

  // Determine if it's currently bleeding on targetDate
  let isPeriod = false;
  if (matchedCycle) {
    if (matchedCycle.end) {
      isPeriod = diffDays(matchedCycle.start, targetDate) >= 0 && diffDays(targetDate, matchedCycle.end) >= 0;
    } else {
      // Ongoing: if within 14 days of start
      isPeriod = diff >= 0 && diff < Math.max(stats.avgPeriodDuration, 14);
    }
  }

  // Is targetDate predicted period in the future?
  const isFuture = diffDays(today, targetDate) > 0;
  const isPredictedPeriod = isFuture && (
    (targetDate >= prediction.nextPeriodStart && targetDate <= addDays(prediction.nextPeriodStart, stats.avgPeriodDuration - 1))
  );

  // Check late status: date is at or after predicted next period start, and no new cycle started
  const isLate = (targetDate > prediction.nextPeriodStart) && (diff >= stats.avgCycleLength) && !isPeriod;
  const lateDays = isLate ? diffDays(prediction.nextPeriodStart, targetDate) : 0;

  const cDay = diff + 1;

  // Ovulation & fertile window for this specific cycle
  const currentNextStart = addDays(cycleStart, stats.avgCycleLength);
  const currentOvulation = addDays(currentNextStart, -14);
  const currentFertileStart = addDays(currentOvulation, -5);
  const currentFertileEnd = addDays(currentOvulation, 1);

  const isOvulation = targetDate === currentOvulation;
  const isFertile = targetDate >= currentFertileStart && targetDate <= currentFertileEnd;

  // Knob angle formula (210° top-left origin, 360° full circle)
  // If late, knob caps gracefully at 205° near end of ring with pulsing state
  let knobAngle;
  if (isLate) {
    knobAngle = 202; // anchored at green/late end
  } else {
    const cycleFraction = Math.min(Math.max((cDay - 0.5) / stats.avgCycleLength, 0), 0.999);
    knobAngle = (210 + cycleFraction * 360) % 360;
  }

  // Phases categorization
  if (isLate) {
    return {
      cDay,
      dayText: `Telat ${lateDays} Hari`,
      label: 'Telat Haid',
      phase: 'late',
      phaseName: 'Telat Haid',
      phaseEnglish: 'Late Period',
      isPeriod: false,
      isPredictedPeriod: false,
      isFertile: false,
      isOvulation: false,
      lateDays,
      charBody: '#FDE68A',
      charContour: '#FCD34D',
      charHighlight: '#FEF9C3',
      knobFill: '#FDE68A',
      knobStroke: '#F59E0B',
      knobAngle
    };
  }

  if (isPeriod || isPredictedPeriod || cDay <= stats.avgPeriodDuration) {
    return {
      cDay,
      dayText: `Day ${cDay}`,
      label: isPredictedPeriod ? 'Prediksi Haid' : 'Period',
      phase: 'period',
      phaseName: 'Fase Menstruasi',
      phaseEnglish: 'Period Phase',
      isPeriod: isPeriod || (!isFuture && cDay <= stats.avgPeriodDuration),
      isPredictedPeriod,
      isFertile: false,
      isOvulation: false,
      lateDays: 0,
      charBody: '#FECDD3',
      charContour: '#FDA4AF',
      charHighlight: '#FFF1F2',
      knobFill: '#FECDD3',
      knobStroke: '#FB7185',
      knobAngle
    };
  }

  if (isOvulation || (cDay >= Math.max(stats.avgCycleLength - 15, stats.avgPeriodDuration + 1) && cDay <= stats.avgCycleLength - 13)) {
    return {
      cDay,
      dayText: `Day ${cDay}`,
      label: 'Masa Subur',
      phase: 'ovulation',
      phaseName: 'Fase Ovulasi',
      phaseEnglish: 'Ovulation Phase',
      isPeriod: false,
      isPredictedPeriod: false,
      isFertile: true,
      isOvulation: true,
      lateDays: 0,
      charBody: '#FEF08A',
      charContour: '#FDE047',
      charHighlight: '#FEF9C3',
      knobFill: '#FEF08A',
      knobStroke: '#FACC15',
      knobAngle
    };
  }

  if (cDay < stats.avgCycleLength - 15) {
    return {
      cDay,
      dayText: `Day ${cDay}`,
      label: 'Fase Folikuler',
      phase: 'follicular',
      phaseName: 'Fase Folikuler',
      phaseEnglish: 'Follicular Phase',
      isPeriod: false,
      isPredictedPeriod: false,
      isFertile: isFertile,
      isOvulation: false,
      lateDays: 0,
      charBody: '#FDE68A',
      charContour: '#FCD34D',
      charHighlight: '#FEF9C3',
      knobFill: '#FDE68A',
      knobStroke: '#F59E0B',
      knobAngle
    };
  }

  const isPrePeriod = cDay > (stats.avgCycleLength - 4);
  return {
    cDay,
    dayText: `Day ${cDay}`,
    label: isPrePeriod ? 'Pra-Menstruasi' : 'Fase PMS',
    phase: isPrePeriod ? 'pre-period' : 'luteal',
    phaseName: isPrePeriod ? 'Pra-Menstruasi' : 'Fase Luteal',
    phaseEnglish: isPrePeriod ? 'Pre-Period Phase' : 'Luteal Phase',
    isPeriod: false,
    isPredictedPeriod: false,
    isFertile: false,
    isOvulation: false,
    lateDays: 0,
    charBody: isPrePeriod ? '#BBF7D0' : '#BAE6FD',
    charContour: isPrePeriod ? '#86EFAC' : '#7DD3FC',
    charHighlight: isPrePeriod ? '#DCFCE7' : '#E0F2FE',
    knobFill: isPrePeriod ? '#BBF7D0' : '#BAE6FD',
    knobStroke: isPrePeriod ? '#86EFAC' : '#93C5FD',
    knobAngle
  };
}
