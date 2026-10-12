import type { BabyState, SleepEvent, SleepEventType, SleepSession } from "./types";
import { diffMin, startOfDay, addDays } from "./time";

export const EVENT_META: Record<
  SleepEventType,
  { label: string; button: string; emoji: string; short: string; tone: "sun" | "nap" | "night" | "alert" | "sage" }
> = {
  WAKE_UP: { label: "아침 기상", button: "일어났어", emoji: "☀️", short: "기상", tone: "sun" },
  NAP_START: { label: "낮잠 시작", button: "낮잠 들었어", emoji: "😴", short: "낮잠 시작", tone: "nap" },
  NAP_END: { label: "낮잠 기상", button: "낮잠에서 깼어", emoji: "👀", short: "낮잠 끝", tone: "sage" },
  NIGHT_SLEEP_START: { label: "밤잠 시작", button: "밤잠 들었어", emoji: "🌙", short: "밤잠", tone: "night" },
  NIGHT_WAKE: { label: "밤중 각성", button: "밤중에 깼어", emoji: "🌃", short: "밤중 깸", tone: "alert" },
  BACK_TO_SLEEP: { label: "다시 잠듦", button: "다시 잠들었어", emoji: "💤", short: "재입면", tone: "night" },
};

export const EVENT_ORDER: SleepEventType[] = [
  "WAKE_UP",
  "NAP_START",
  "NAP_END",
  "NIGHT_SLEEP_START",
  "NIGHT_WAKE",
  "BACK_TO_SLEEP",
];

export function sortEvents(events: SleepEvent[]) {
  return [...events].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

/**
 * Turn the raw event stream into nap / night sessions.
 * A night session runs from NIGHT_SLEEP_START until WAKE_UP; NIGHT_WAKE/BACK_TO_SLEEP
 * pairs inside it are counted as wakings and subtracted from the asleep time.
 */
export function buildSessions(events: SleepEvent[], now = new Date()): SleepSession[] {
  const sorted = sortEvents(events);
  const sessions: SleepSession[] = [];
  let open: SleepSession | null = null;
  let wakeStartedAt: Date | null = null;

  const close = (end: Date, endEventId?: string) => {
    if (!open) return;
    if (wakeStartedAt) {
      open.awakeMin += Math.max(0, diffMin(end, wakeStartedAt));
      wakeStartedAt = null;
    }
    open.end = end;
    open.endEventId = endEventId;
    open.durationMin = Math.max(0, diffMin(end, open.start) - open.awakeMin);
    sessions.push(open);
    open = null;
  };

  const begin = (type: "NAP" | "NIGHT", ev: SleepEvent) => {
    open = {
      id: ev.id,
      type,
      start: new Date(ev.time),
      end: null,
      durationMin: 0,
      nightWakings: 0,
      awakeMin: 0,
      startEventId: ev.id,
    };
  };

  for (const ev of sorted) {
    const t = new Date(ev.time);
    switch (ev.type) {
      case "NAP_START":
        if (open) close(t);
        begin("NAP", ev);
        break;
      case "NIGHT_SLEEP_START":
        if (open && (open as SleepSession).type === "NIGHT") break; // duplicate tap
        if (open) close(t);
        begin("NIGHT", ev);
        break;
      case "NAP_END":
        if (open) close(t, ev.id);
        break;
      case "WAKE_UP":
        if (open) close(t, ev.id);
        break;
      case "NIGHT_WAKE":
        if (open && (open as SleepSession).type === "NIGHT" && !wakeStartedAt) {
          (open as SleepSession).nightWakings += 1;
          wakeStartedAt = t;
        }
        break;
      case "BACK_TO_SLEEP":
        if (open && wakeStartedAt) {
          (open as SleepSession).awakeMin += Math.max(0, diffMin(t, wakeStartedAt));
          wakeStartedAt = null;
        } else if (!open) {
          // fell back asleep without an open session: treat as night sleep if late, else nap
          const h = t.getHours();
          begin(h >= 18 || h < 6 ? "NIGHT" : "NAP", ev);
        }
        break;
    }
  }

  if (open) {
    const o = open as SleepSession;
    const awakeNow = wakeStartedAt ? diffMin(now, wakeStartedAt) : 0;
    o.durationMin = Math.max(0, diffMin(now, o.start) - o.awakeMin - awakeNow);
    sessions.push(o);
  }
  return sessions;
}

export function currentState(events: SleepEvent[], now = new Date()): BabyState {
  const sorted = sortEvents(events);
  const last = sorted[sorted.length - 1];
  if (!last) return "UNKNOWN";
  // stale data (>20h since last log) → unknown
  if (diffMin(now, new Date(last.time)) > 20 * 60) return "UNKNOWN";
  switch (last.type) {
    case "WAKE_UP":
    case "NAP_END":
      return "AWAKE";
    case "NAP_START":
      return "NAPPING";
    case "NIGHT_SLEEP_START":
      return "NIGHT_SLEEPING";
    case "NIGHT_WAKE":
      return "NIGHT_AWAKE";
    case "BACK_TO_SLEEP": {
      const h = new Date(last.time).getHours();
      const lastSession = buildSessions(sorted, now).at(-1);
      if (lastSession && !lastSession.end) return lastSession.type === "NIGHT" ? "NIGHT_SLEEPING" : "NAPPING";
      return h >= 18 || h < 6 ? "NIGHT_SLEEPING" : "NAPPING";
    }
  }
}

/**
 * Resolve an intent against the baby's current state. Mirrors spec scenario:
 * "일어났어" while napping → ask whether it's a nap wake.
 */
export function resolveIntent(intent: SleepEventType, state: BabyState, at: Date): { type: SleepEventType; changed: boolean } {
  if (intent === "WAKE_UP" && state === "NAPPING") return { type: "NAP_END", changed: true };
  if (intent === "WAKE_UP" && state === "NIGHT_SLEEPING") {
    const h = at.getHours();
    if (h >= 19 || h < 5) return { type: "NIGHT_WAKE", changed: true };
  }
  if (intent === "NAP_START" && state === "NIGHT_AWAKE") return { type: "BACK_TO_SLEEP", changed: true };
  if (intent === "NIGHT_SLEEP_START" && state === "NIGHT_AWAKE") return { type: "BACK_TO_SLEEP", changed: true };
  return { type: intent, changed: false };
}

/** Which quick buttons make most sense next. */
export function suggestedButtons(state: BabyState, now = new Date()): SleepEventType[] {
  const h = now.getHours();
  switch (state) {
    case "AWAKE":
      return h >= 17 ? ["NIGHT_SLEEP_START"] : ["NAP_START"];
    case "NAPPING":
      return ["NAP_END"];
    case "NIGHT_SLEEPING":
      return h >= 5 && h < 12 ? ["WAKE_UP"] : ["NIGHT_WAKE"];
    case "NIGHT_AWAKE":
      return ["BACK_TO_SLEEP"];
    default:
      return h >= 5 && h < 11 ? ["WAKE_UP"] : h >= 18 ? ["NIGHT_SLEEP_START"] : ["NAP_START"];
  }
}

export function eventsOnDay(events: SleepEvent[], day: Date) {
  const s = startOfDay(day).getTime();
  const e = addDays(startOfDay(day), 1).getTime();
  return sortEvents(events).filter((ev) => {
    const t = new Date(ev.time).getTime();
    return t >= s && t < e;
  });
}

/** Morning wake for a calendar day (first WAKE_UP that day). */
export function morningWake(events: SleepEvent[], day: Date): Date | null {
  const ev = eventsOnDay(events, day).find((e) => e.type === "WAKE_UP");
  return ev ? new Date(ev.time) : null;
}

export const STATE_LABEL: Record<BabyState, string> = {
  AWAKE: "깨어 있어요",
  NAPPING: "낮잠 자는 중",
  NIGHT_SLEEPING: "밤잠 자는 중",
  NIGHT_AWAKE: "밤중에 깨어 있어요",
  UNKNOWN: "오늘 기록을 시작해 주세요",
};
