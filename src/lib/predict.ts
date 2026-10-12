import type { Baby, Prediction, PredictionWindow, SleepEvent, SleepSession } from "./types";
import { buildSessions, currentState, morningWake, sortEvents } from "./events";
import { addDays, addMin, ageInMonths, atTime, diffMin, fmtDuration, hmToMin, minOfDay, sameDay, startOfDay } from "./time";

export const MODEL_VERSION = "rules-ww-1.0";

export interface AgeNorm {
  label: string;
  /** wake window range in minutes (first window → last window of the day) */
  wwMin: number;
  wwMax: number;
  naps: number;
  /** typical nap length in minutes */
  napLen: number;
  /** typical total sleep per 24h (hours) */
  totalSleep: [number, number];
}

/**
 * General wake-window guide by age (months). These are commonly cited ranges used as
 * a starting point only — the engine blends them with the baby's own records.
 * Needs expert review before launch (see README).
 */
export function ageNorm(months: number): AgeNorm {
  if (months < 1) return { label: "신생아", wwMin: 35, wwMax: 60, naps: 5, napLen: 50, totalSleep: [14, 17] };
  if (months < 2) return { label: "1개월", wwMin: 50, wwMax: 80, naps: 5, napLen: 50, totalSleep: [14, 17] };
  if (months < 3) return { label: "2개월", wwMin: 60, wwMax: 100, naps: 4, napLen: 55, totalSleep: [14, 17] };
  if (months < 4) return { label: "3개월", wwMin: 75, wwMax: 120, naps: 4, napLen: 55, totalSleep: [12, 16] };
  if (months < 5) return { label: "4개월", wwMin: 90, wwMax: 135, naps: 3, napLen: 60, totalSleep: [12, 16] };
  if (months < 7) return { label: "5~6개월", wwMin: 120, wwMax: 165, naps: 3, napLen: 60, totalSleep: [12, 16] };
  if (months < 10) return { label: "7~9개월", wwMin: 150, wwMax: 210, naps: 2, napLen: 70, totalSleep: [12, 16] };
  if (months < 13) return { label: "10~12개월", wwMin: 180, wwMax: 240, naps: 2, napLen: 75, totalSleep: [12, 16] };
  if (months < 16) return { label: "13~15개월", wwMin: 210, wwMax: 300, naps: 2, napLen: 80, totalSleep: [11, 14] };
  if (months < 19) return { label: "16~18개월", wwMin: 270, wwMax: 330, naps: 1, napLen: 110, totalSleep: [11, 14] };
  return { label: "19~24개월", wwMin: 300, wwMax: 360, naps: 1, napLen: 110, totalSleep: [11, 14] };
}

/** target wake window for the k-th window (0-based) of a day with `naps` naps */
export function targetWindow(norm: AgeNorm, k: number, naps = norm.naps) {
  const n = naps; // n naps => n+1 windows, index 0..n
  if (n <= 0) return norm.wwMax;
  const t = Math.min(1, k / n);
  return Math.round(norm.wwMin + (norm.wwMax - norm.wwMin) * t);
}

interface PersonalStats {
  /** avg wake window by index (0 = after morning wake) */
  windowByIndex: Record<number, { avg: number; n: number }>;
  avgNapLen: number | null;
  napSamples: number;
  avgBedtimeMin: number | null;
  avgWakeMin: number | null;
  days: number;
}

/** Look back `days` days (excluding today) and compute personal averages. */
export function personalStats(events: SleepEvent[], now = new Date(), days = 7): PersonalStats {
  const from = addDays(startOfDay(now), -days);
  const today = startOfDay(now);
  const sessions = buildSessions(events, now);
  const windows: Record<number, number[]> = {};
  const napLens: number[] = [];
  const bedtimes: number[] = [];
  const wakes: number[] = [];
  let daysWithData = 0;

  for (let d = new Date(from); d < today; d = addDays(d, 1)) {
    const wake = morningWake(events, d);
    if (!wake) continue;
    daysWithData++;
    wakes.push(minOfDay(wake));
    const naps = sessions.filter((s) => s.type === "NAP" && sameDay(s.start, d) && s.end);
    const night = sessions.find((s) => s.type === "NIGHT" && sameDay(s.start, d) && s.start > wake);
    let prevEnd = wake;
    naps.forEach((nap, i) => {
      const w = diffMin(nap.start, prevEnd);
      if (w > 20 && w < 8 * 60) (windows[i] ||= []).push(w);
      napLens.push(nap.durationMin);
      prevEnd = nap.end!;
    });
    if (night) {
      let bm = minOfDay(night.start);
      if (bm < 12 * 60) bm += 1440; // after midnight
      bedtimes.push(bm);
      const w = diffMin(night.start, prevEnd);
      if (w > 20 && w < 8 * 60) (windows[naps.length] ||= []).push(w);
      // also store the "last window" under a sentinel key for bedtime estimation
      (windows[-1] ||= []).push(w);
    }
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const windowByIndex: PersonalStats["windowByIndex"] = {};
  for (const [k, arr] of Object.entries(windows)) windowByIndex[Number(k)] = { avg: avg(arr)!, n: arr.length };
  return {
    windowByIndex,
    avgNapLen: avg(napLens),
    napSamples: napLens.length,
    avgBedtimeMin: avg(bedtimes),
    avgWakeMin: avg(wakes),
    days: daysWithData,
  };
}

function blend(guide: number, personal: { avg: number; n: number } | undefined) {
  if (!personal || personal.n < 2) return { value: guide, personal: false };
  const w = Math.min(0.7, 0.3 + personal.n * 0.08); // more samples → more weight on own data
  return { value: Math.round(personal.avg * w + guide * (1 - w)), personal: true };
}

const HALF_RANGE = 10;

function windowAround(type: PredictionWindow["type"], center: Date, napIndex?: number): PredictionWindow {
  return { type, start: addMin(center, -HALF_RANGE), end: addMin(center, HALF_RANGE), napIndex };
}

/**
 * Predict the next sleep window and the rest of today's schedule.
 * Rule-based: age wake-window guide + today's events + 7-day personal averages.
 */
export function predict(baby: Baby, events: SleepEvent[], now = new Date()): Prediction {
  const months = ageInMonths(baby.birthDate, now);
  const norm = ageNorm(months);
  const expectedNaps = baby.napCount && baby.napCount > 0 ? baby.napCount : norm.naps;
  const stats = personalStats(events, now);
  const state = currentState(events, now);
  const sessions = buildSessions(events, now);
  const usualBed = hmToMin(baby.usualBedtime || "20:00");
  const bedTarget = stats.avgBedtimeMin != null && stats.days >= 3 ? Math.round(stats.avgBedtimeMin * 0.5 + usualBed * 0.5) : usualBed;
  const napLen = stats.avgNapLen != null && stats.napSamples >= 3 ? Math.round(stats.avgNapLen * 0.6 + norm.napLen * 0.4) : norm.napLen;

  const sampleCount = Object.values(stats.windowByIndex).reduce((a, b) => a + b.n, 0);
  const personalization: Prediction["personalization"] = stats.days >= 5 ? "PERSONAL" : stats.days >= 2 ? "MIXED" : "GUIDE";
  const confidence = Math.min(0.95, 0.55 + stats.days * 0.04 + Math.min(sampleCount, 10) * 0.015);

  const base: Omit<Prediction, "next" | "schedule" | "reason" | "wakeWindowMin"> = {
    confidence,
    personalization,
    modelVersion: MODEL_VERSION,
  };

  // Night or no data yet
  if (state === "NIGHT_SLEEPING" || state === "NIGHT_AWAKE") {
    let wake = atTime(now, baby.usualWakeTime || "07:00");
    if (wake < now) wake = addDays(wake, 1);
    if (stats.avgWakeMin != null && stats.days >= 3) {
      wake = startOfDay(wake);
      wake.setMinutes(Math.round(stats.avgWakeMin * 0.6 + hmToMin(baby.usualWakeTime || "07:00") * 0.4));
    }
    return {
      ...base,
      next: windowAround("WAKE", wake),
      schedule: [],
      reason:
        state === "NIGHT_AWAKE"
          ? "밤중 각성은 이 시기에 흔히 있어요. 조명은 어둡게, 자극은 적게 유지해 보세요."
          : `평소 기상 시간을 바탕으로 아침 기상을 예상했어요.`,
      wakeWindowMin: 0,
    };
  }

  const todaysNaps = sessions.filter((s) => s.type === "NAP" && sameDay(s.start, now));
  const completedNaps = todaysNaps.filter((s) => s.end);
  const wakeToday = morningWake(events, now);

  if (state === "NAPPING") {
    const nap = todaysNaps.find((s) => !s.end) ?? sessions.at(-1)!;
    const expectedEnd = addMin(nap.start, napLen);
    const napIndex = completedNaps.length + 1;
    const rest = projectDay({ from: expectedEnd, k: napIndex, norm, expectedNaps, napLen, bedTarget, stats, firstNapIndex: napIndex + 1 });
    return {
      ...base,
      next: { type: "WAKE", start: addMin(expectedEnd, -10), end: addMin(expectedEnd, 15) },
      schedule: rest.schedule,
      reason: `${stats.napSamples >= 3 ? "최근 평균 낮잠 길이" : "월령 평균 낮잠 길이"}(약 ${fmtDuration(napLen)})를 바탕으로 기상 시각을 예상했어요.`,
      wakeWindowMin: 0,
    };
  }

  // AWAKE or UNKNOWN
  let lastWakeAt: Date;
  let k: number;
  let assumed = false;
  const lastEventAt = events.length ? new Date(sortEvents(events).at(-1)!.time) : null;
  if (state === "AWAKE" && lastEventAt && sameDay(lastEventAt, now)) {
    lastWakeAt = lastEventAt;
    k = completedNaps.length;
  } else {
    lastWakeAt = wakeToday ?? atTime(now, baby.usualWakeTime || "07:00");
    k = completedNaps.length;
    assumed = !wakeToday;
  }

  const lastNap: SleepSession | undefined = completedNaps.at(-1);
  const shortNap = lastNap && k > 0 && lastNap.durationMin < 40 && months >= 4;

  const rest = projectDay({ from: lastWakeAt, k, norm, expectedNaps, napLen, bedTarget, stats, firstNapIndex: k + 1, shortNap });
  const next = rest.schedule[0] ?? null;

  const personalW = stats.windowByIndex[k];
  let reason: string;
  if (assumed) {
    reason = `오늘 기상 기록이 없어 평소 기상 시간(${baby.usualWakeTime})과 ${norm.label} 일반 가이드로 계산했어요. 기상을 기록하면 더 정확해져요.`;
  } else if (next?.type === "NIGHT") {
    reason =
      stats.days >= 3
        ? `오늘 낮잠 ${completedNaps.length}회를 마쳤고, 최근 평균 취침 시각과 마지막 깨어있는 시간(약 ${fmtDuration(rest.windowUsed)})을 함께 고려했어요.`
        : `오늘 낮잠 ${completedNaps.length}회를 마쳤어요. 평소 취침 시간과 ${norm.label} 가이드를 함께 고려했어요.`;
  } else if (personalW && personalW.n >= 2) {
    reason = `최근 ${stats.days}일 동안 ${k === 0 ? "아침 기상" : `낮잠 ${k}`} 이후 평균 깨어 있는 시간이 약 ${fmtDuration(personalW.avg)}이었어요.`;
  } else {
    reason = `${norm.label} 아기의 일반적인 깨어있는 시간(${fmtDuration(norm.wwMin)}~${fmtDuration(norm.wwMax)})을 기준으로 계산했어요. 기록이 쌓이면 우리 아기에게 맞춰져요.`;
  }
  if (shortNap) reason += " 직전 낮잠이 짧았어서 조금 일찍 피곤해질 수 있어요.";

  return { ...base, next, schedule: rest.schedule, reason, wakeWindowMin: rest.windowUsed };
}

function projectDay(opts: {
  from: Date;
  k: number;
  norm: AgeNorm;
  expectedNaps: number;
  napLen: number;
  bedTarget: number;
  stats: PersonalStats;
  firstNapIndex: number;
  shortNap?: boolean;
}): { schedule: PredictionWindow[]; windowUsed: number } {
  const { norm, expectedNaps, napLen, bedTarget, stats } = opts;
  const schedule: PredictionWindow[] = [];
  let cursor = opts.from;
  let k = opts.k;
  let napIndex = opts.firstNapIndex;
  let firstWindow = 0;
  const dayStart = startOfDay(opts.from);
  const bedAt = addMin(dayStart, bedTarget);
  const lastWindowGuide = blend(norm.wwMax, stats.windowByIndex[-1]).value;

  for (let guard = 0; guard < 8; guard++) {
    let ww = blend(targetWindow(norm, k, expectedNaps), stats.windowByIndex[k]).value;
    if (guard === 0 && opts.shortNap) ww = Math.max(norm.wwMin, ww - 15);
    const napStart = addMin(cursor, ww);
    const napEnd = addMin(napStart, napLen);
    // can another nap fit and still leave a full last window before bedtime?
    const fits = k < expectedNaps && diffMin(bedAt, napEnd) >= Math.min(lastWindowGuide, norm.wwMax) - 30;
    if (fits) {
      if (guard === 0) firstWindow = ww;
      schedule.push(windowAround("NAP", napStart, napIndex));
      cursor = napEnd;
      k++;
      napIndex++;
      continue;
    }
    // bedtime: blend wake-window-based bedtime with target bedtime
    const wwBed = addMin(cursor, lastWindowGuide);
    let bed = new Date((wwBed.getTime() + bedAt.getTime()) / 2);
    // never earlier than cursor + min window, never absurdly late
    if (diffMin(bed, cursor) < norm.wwMin) bed = addMin(cursor, norm.wwMin);
    if (guard === 0) firstWindow = Math.round(diffMin(bed, cursor));
    schedule.push(windowAround("NIGHT", bed));
    break;
  }
  return { schedule, windowUsed: firstWindow };
}
