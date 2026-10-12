import type { Baby, SleepEvent } from "./types";
import { EVENT_META, STATE_LABEL, buildSessions, currentState, eventsOnDay } from "./events";
import { ageNorm, predict } from "./predict";
import { weekSummary } from "./stats";
import { ageInMonths, fmtDuration, fmtRange, fmtTime, minToHm, sameDay } from "./time";
import type { CoachContext } from "./coachRules";

export * from "./coachRules";

const PRED_LABEL = { NAP: "낮잠", NIGHT: "밤잠", WAKE: "기상" } as const;

export function buildCoachContext(baby: Baby, events: SleepEvent[], now = new Date()): CoachContext {
  const months = ageInMonths(baby.birthDate, now);
  const norm = ageNorm(months);
  const p = predict(baby, events, now);
  const sessions = buildSessions(events, now);
  const naps = sessions.filter((s) => s.type === "NAP" && sameDay(s.start, now));
  const finished = naps.filter((n) => n.end);
  const cur = weekSummary(events, now, 0);
  const prev = weekSummary(events, now, 1);
  const d = (m: number | null) => (m == null ? null : fmtDuration(m));
  const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
  const allNaps = sessions.filter((s) => s.type === "NAP" && s.end && !sameDay(s.start, now)).slice(-14);
  return {
    baby: {
      nickname: baby.nickname,
      ageMonths: months,
      ageGroup: norm.label,
      usualWakeTime: baby.usualWakeTime,
      usualBedtime: baby.usualBedtime,
    },
    now: fmtTime(now),
    state: STATE_LABEL[currentState(events, now)],
    today: {
      events: eventsOnDay(events, now).map((e) => ({ time: fmtTime(e.time), label: EVENT_META[e.type].label })),
      napCount: naps.length,
      napMinutes: Math.round(naps.reduce((a, n) => a + n.durationMin, 0)),
      lastNapMinutes: finished.length ? Math.round(finished.at(-1)!.durationMin) : null,
    },
    prediction: {
      next: p.next ? `${PRED_LABEL[p.next.type]} ${fmtRange(p.next.start, p.next.end)}` : null,
      schedule: p.schedule.map((w) => `${w.type === "NAP" ? `낮잠 ${w.napIndex ?? ""}` : PRED_LABEL[w.type]} ${fmtRange(w.start, w.end)}`),
      reason: p.reason,
      personalization: p.personalization,
    },
    norms: {
      wakeWindow: `${fmtDuration(norm.wwMin)}~${fmtDuration(norm.wwMax)}`,
      naps: norm.naps,
      totalSleep: `${norm.totalSleep[0]}~${norm.totalSleep[1]}시간`,
      typicalNap: fmtDuration(norm.napLen),
    },
    week: {
      daysWithData: cur.daysWithData,
      avgNight: d(cur.avgNight),
      avgNap: d(cur.avgNap),
      avgBedtime: cur.avgBedtime == null ? null : minToHm(cur.avgBedtime),
      avgWakings: round1(cur.avgWakings),
      prevAvgNight: prev.daysWithData >= 3 ? d(prev.avgNight) : null,
      prevAvgWakings: prev.daysWithData >= 3 ? round1(prev.avgWakings) : null,
      avgNapMinutes: allNaps.length ? Math.round(allNaps.reduce((a, n) => a + n.durationMin, 0) / allNaps.length) : null,
    },
  };
}
