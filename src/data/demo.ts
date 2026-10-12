import type { Baby, SleepEvent, SleepEventType } from "../lib/types";
import { addDays, addMin, startOfDay, uid } from "../lib/time";

export function demoBaby(now = new Date()): Baby {
  const b = new Date(now);
  b.setMonth(b.getMonth() - 7);
  b.setDate(b.getDate() - 18);
  return {
    nickname: "하은이",
    birthDate: `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`,
    gender: "F",
    usualWakeTime: "07:00",
    usualBedtime: "20:15",
    napCount: 2,
    daycare: false,
  };
}

/** ~10 days of plausible 7-month-old records ending at `now`. */
export function demoEvents(now = new Date()): SleepEvent[] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const jitter = (n: number) => Math.round((rnd() * 2 - 1) * n);
  const out: SleepEvent[] = [];
  const push = (type: SleepEventType, t: Date) => {
    if (t > now) return false;
    const iso = t.toISOString();
    out.push({ id: uid(), type, time: iso, inputMethod: rnd() > 0.7 ? "VOICE" : "BUTTON", createdAt: iso, updatedAt: iso });
    return true;
  };

  for (let i = 10; i >= 0; i--) {
    const day = addDays(startOfDay(now), -i);
    const wake = addMin(day, 7 * 60 + jitter(25));
    if (!push("WAKE_UP", wake)) break;
    const nap1s = addMin(wake, 150 + jitter(15));
    const nap1e = addMin(nap1s, 65 + jitter(20));
    if (!push("NAP_START", nap1s) || !push("NAP_END", nap1e)) break;
    const nap2s = addMin(nap1e, 165 + jitter(20));
    const shortDay = i % 4 === 1;
    const nap2e = addMin(nap2s, shortDay ? 35 : 70 + jitter(20));
    if (!push("NAP_START", nap2s) || !push("NAP_END", nap2e)) break;
    // bedtime around 20:00 (a bit earlier after a short nap)
    const bed = addMin(day, (shortDay ? 19 * 60 + 40 : 20 * 60 + 5) + jitter(15));
    if (!push("NIGHT_SLEEP_START", bed)) break;
    const wakings = i % 3 === 0 ? 2 : i % 2 === 0 ? 1 : 0;
    for (let w = 0; w < wakings; w++) {
      const wAt = addMin(bed, 200 + w * 180 + jitter(30));
      if (!push("NIGHT_WAKE", wAt) || !push("BACK_TO_SLEEP", addMin(wAt, 12 + jitter(6)))) break;
    }
  }
  return out;
}
