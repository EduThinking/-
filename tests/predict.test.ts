import { describe, expect, it } from "vitest";
import { buildSessions, currentState, resolveIntent } from "../src/lib/events";
import { predict } from "../src/lib/predict";
import { weekSummary } from "../src/lib/stats";
import type { Baby, SleepEvent, SleepEventType } from "../src/lib/types";
import { demoEvents } from "../src/data/demo";

const baby: Baby = { nickname: "하은이", birthDate: "2026-02-20", usualWakeTime: "07:00", usualBedtime: "20:15", napCount: 2, daycare: false };
let n = 0;
const ev = (type: SleepEventType, d: Date): SleepEvent => ({ id: `e${n++}`, type, time: d.toISOString(), inputMethod: "BUTTON", createdAt: "", updatedAt: "" });
const at = (h: number, m = 0, day = 7) => new Date(2026, 9, day, h, m);

describe("sessions", () => {
  it("builds nap and night sessions, subtracting night wakings", () => {
    const events = [
      ev("NIGHT_SLEEP_START", at(20, 0, 6)),
      ev("NIGHT_WAKE", at(2, 0)),
      ev("BACK_TO_SLEEP", at(2, 20)),
      ev("WAKE_UP", at(7, 0)),
      ev("NAP_START", at(9, 35)),
      ev("NAP_END", at(10, 42)),
    ];
    const s = buildSessions(events, at(11));
    expect(s).toHaveLength(2);
    expect(s[0].type).toBe("NIGHT");
    expect(s[0].nightWakings).toBe(1);
    expect(s[0].durationMin).toBe(11 * 60 - 20);
    expect(s[1].durationMin).toBe(67);
  });

  it("maps '일어났어' during a nap to nap end", () => {
    expect(resolveIntent("WAKE_UP", "NAPPING", at(10)).type).toBe("NAP_END");
    expect(resolveIntent("WAKE_UP", "AWAKE", at(10)).type).toBe("WAKE_UP");
  });
});

describe("predict", () => {
  const now = at(7, 15);
  it("predicts the first nap from the morning wake for a 7-month-old (guide only)", () => {
    const events = [ev("WAKE_UP", at(7, 12))];
    const p = predict(baby, events, now);
    expect(p.next?.type).toBe("NAP");
    // 7~9개월 first wake window = 150 min → 09:42 center, ±10 min
    expect(p.next!.start.getHours()).toBe(9);
    expect(p.next!.start.getMinutes()).toBe(32);
    expect(p.next!.end.getMinutes()).toBe(52);
    expect(p.personalization).toBe("GUIDE");
    // full day projection ends with bedtime
    expect(p.schedule.at(-1)!.type).toBe("NIGHT");
    expect(p.schedule.filter((w) => w.type === "NAP")).toHaveLength(2);
  });

  it("recalculates after the last nap → bedtime near usual bedtime", () => {
    const events = [ev("WAKE_UP", at(7)), ev("NAP_START", at(9, 30)), ev("NAP_END", at(10, 40)), ev("NAP_START", at(13, 30)), ev("NAP_END", at(15))];
    const p = predict(baby, events, at(15, 5));
    expect(p.next?.type).toBe("NIGHT");
    const h = p.next!.start.getHours() + p.next!.start.getMinutes() / 60;
    expect(h).toBeGreaterThan(18.3);
    expect(h).toBeLessThan(20.6);
  });

  it("shortens the next window after a short nap", () => {
    const base = [ev("WAKE_UP", at(7)), ev("NAP_START", at(9, 30))];
    const long = predict(baby, [...base, ev("NAP_END", at(10, 40))], at(10, 45));
    const short = predict(baby, [...base, ev("NAP_END", at(9, 55))], at(10, 0));
    expect(short.reason).toContain("짧았");
    expect(short.wakeWindowMin).toBeLessThan(long.wakeWindowMin);
  });

  it("personalizes with history", () => {
    const now = new Date();
    const events = demoEvents(now);
    const p = predict({ ...baby, birthDate: new Date(now.getFullYear(), now.getMonth() - 7, 1).toISOString().slice(0, 10) }, events, now);
    expect(["PERSONAL", "MIXED"]).toContain(p.personalization);
    expect(p.confidence).toBeGreaterThan(0.7);
    expect(currentState(events)).not.toBe("UNKNOWN");
    const w = weekSummary(events, now);
    expect(w.daysWithData).toBe(7);
    expect(w.avgNight!).toBeGreaterThan(8 * 60);
  });

  it("predicts morning wake during the night", () => {
    const events = [ev("NIGHT_SLEEP_START", at(20, 10))];
    const p = predict(baby, events, at(23));
    expect(p.next?.type).toBe("WAKE");
  });
});
