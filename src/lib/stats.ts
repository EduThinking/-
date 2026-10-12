import type { SleepEvent, SleepSession } from "./types";
import { buildSessions, morningWake } from "./events";
import { addDays, diffMin, fmtDuration, fmtSignedDuration, minOfDay, minToHm, sameDay, startOfDay } from "./time";

export interface DayStats {
  date: Date;
  napMin: number;
  napCount: number;
  /** night sleep that ended on the morning of this day */
  nightMin: number;
  nightWakings: number;
  totalMin: number;
  wakeMin: number | null;
  /** bedtime (night sleep starting this evening), minutes since midnight (may exceed 1440) */
  bedtimeMin: number | null;
  lastNapEndMin: number | null;
  hasData: boolean;
}

export function dayStats(events: SleepEvent[], day: Date, sessions?: SleepSession[], now = new Date()): DayStats {
  const all = sessions ?? buildSessions(events, now);
  const naps = all.filter((s) => s.type === "NAP" && sameDay(s.start, day));
  const nightEnded = all.find((s) => s.type === "NIGHT" && s.end && sameDay(s.end, day));
  const nightStarted = all.find((s) => s.type === "NIGHT" && sameDay(addDays(s.start, s.start.getHours() < 5 ? -1 : 0), day));
  const wake = morningWake(events, day);
  const napMin = naps.reduce((a, s) => a + s.durationMin, 0);
  const nightMin = nightEnded?.durationMin ?? 0;
  const lastNap = naps.filter((n) => n.end).at(-1);
  let bedtimeMin: number | null = null;
  if (nightStarted) {
    bedtimeMin = minOfDay(nightStarted.start);
    if (bedtimeMin < 5 * 60) bedtimeMin += 1440;
  }
  return {
    date: startOfDay(day),
    napMin,
    napCount: naps.length,
    nightMin,
    nightWakings: nightEnded?.nightWakings ?? 0,
    totalMin: napMin + nightMin,
    wakeMin: wake ? minOfDay(wake) : null,
    bedtimeMin,
    lastNapEndMin: lastNap?.end ? minOfDay(lastNap.end) : null,
    hasData: naps.length > 0 || !!nightEnded || !!wake || !!nightStarted,
  };
}

export interface WeekSummary {
  days: DayStats[];
  daysWithData: number;
  avgTotal: number | null;
  avgNight: number | null;
  avgNap: number | null;
  avgNapCount: number | null;
  avgBedtime: number | null;
  avgWake: number | null;
  totalWakings: number;
  avgWakings: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** 7 complete days ending yesterday (offsetWeeks=0) or the week before (offsetWeeks=1). */
export function weekSummary(events: SleepEvent[], now = new Date(), offsetWeeks = 0): WeekSummary {
  const sessions = buildSessions(events, now);
  const end = addDays(startOfDay(now), -7 * offsetWeeks); // exclusive
  const days: DayStats[] = [];
  for (let i = 7; i >= 1; i--) days.push(dayStats(events, addDays(end, -i), sessions, now));
  const withData = days.filter((d) => d.hasData);
  const full = withData.filter((d) => d.nightMin > 0);
  return {
    days,
    daysWithData: withData.length,
    avgTotal: avg(full.map((d) => d.totalMin)),
    avgNight: avg(full.map((d) => d.nightMin)),
    avgNap: avg(withData.map((d) => d.napMin)),
    avgNapCount: avg(withData.map((d) => d.napCount)),
    avgBedtime: avg(withData.filter((d) => d.bedtimeMin != null).map((d) => d.bedtimeMin!)),
    avgWake: avg(withData.filter((d) => d.wakeMin != null).map((d) => d.wakeMin!)),
    totalWakings: full.reduce((a, d) => a + d.nightWakings, 0),
    avgWakings: avg(full.map((d) => d.nightWakings)),
  };
}

export interface Insight {
  icon: string;
  title: string;
  body: string;
}

/**
 * Plain-language observations. Correlations are described as co-occurrence, never causation,
 * and nothing is phrased as a diagnosis.
 */
export function weeklyInsights(cur: WeekSummary, prev: WeekSummary, nickname: string): Insight[] {
  const out: Insight[] = [];
  if (cur.daysWithData < 3) {
    out.push({
      icon: "edit_note",
      title: "기록이 조금 더 필요해요",
      body: `최근 7일 중 ${cur.daysWithData}일만 기록되어 있어요. 3일 이상 기록하면 ${nickname}의 패턴을 더 잘 보여드릴 수 있어요.`,
    });
    return out;
  }

  if (cur.avgNight != null && prev.avgNight != null && prev.daysWithData >= 3) {
    const d = Math.round(cur.avgNight - prev.avgNight);
    if (Math.abs(d) >= 10)
      out.push({
        icon: d > 0 ? "trending_up" : "trending_down",
        title: `평균 밤잠이 지난주보다 ${fmtSignedDuration(d)}`,
        body: `이번 주 평균 밤잠은 ${fmtDuration(cur.avgNight)}, 지난주는 ${fmtDuration(prev.avgNight)}이었어요.`,
      });
  }

  // last nap end vs bedtime (co-occurrence)
  const pairs = cur.days.filter((d) => d.lastNapEndMin != null && d.bedtimeMin != null);
  if (pairs.length >= 4) {
    const early = pairs.filter((d) => d.lastNapEndMin! <= 17 * 60 + 30);
    const late = pairs.filter((d) => d.lastNapEndMin! > 17 * 60 + 30);
    if (early.length >= 2 && late.length >= 1) {
      const eb = avg(early.map((d) => d.bedtimeMin!))!;
      const lb = avg(late.map((d) => d.bedtimeMin!))!;
      if (lb - eb >= 15)
        out.push({
          icon: "insights",
          title: "마지막 낮잠과 취침 시간",
          body: `마지막 낮잠이 17:30 이전에 끝난 날에는 밤잠 시작이 평균 ${minToHm(eb)}, 그렇지 않은 날은 ${minToHm(lb)}였어요. 함께 나타난 경향일 뿐 원인을 뜻하지는 않아요.`,
        });
    }
  }

  if (cur.avgWakings != null && prev.avgWakings != null && prev.daysWithData >= 3) {
    const d = cur.avgWakings - prev.avgWakings;
    if (Math.abs(d) >= 0.5)
      out.push({
        icon: "bedtime",
        title: d > 0 ? "밤중 각성이 조금 늘었어요" : "밤중 각성이 줄었어요",
        body: `최근 7일 하룻밤 평균 각성 횟수는 ${cur.avgWakings.toFixed(1)}회로, 이전 7일(${prev.avgWakings.toFixed(1)}회)보다 ${d > 0 ? "증가" : "감소"}했어요.${
          d > 0 ? " 이가 나거나 발달 변화가 있는 시기에 흔히 나타나기도 해요. 걱정되는 증상이 함께 있다면 소아과와 상담해 보세요." : ""
        }`,
      });
  }

  // bedtime consistency
  const beds = cur.days.filter((d) => d.bedtimeMin != null).map((d) => d.bedtimeMin!);
  if (beds.length >= 4) {
    const spread = Math.max(...beds) - Math.min(...beds);
    out.push(
      spread <= 45
        ? { icon: "schedule", title: "취침 시간이 일정해요", body: `이번 주 밤잠 시작 시각이 ${Math.round(spread)}분 범위 안에서 유지됐어요. 지금의 루틴을 이어가 보세요.` }
        : { icon: "schedule", title: "취침 시간 변화 폭", body: `이번 주 밤잠 시작 시각은 최대 ${fmtDuration(spread)} 차이가 났어요. 루틴 시작 시간을 비슷하게 맞추면 예측도 더 정확해져요.` },
    );
  }

  if (out.length === 0)
    out.push({ icon: "favorite", title: "안정적인 한 주였어요", body: "지난주와 비교해 큰 변화 없이 비슷한 리듬을 유지했어요." });
  return out;
}

export function diffLabel(cur: number | null, prev: number | null) {
  if (cur == null || prev == null) return null;
  const d = Math.round(cur - prev);
  return { text: `${fmtSignedDuration(d)}`, positive: d >= 0 };
}
