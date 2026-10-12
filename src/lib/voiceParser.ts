import type { SleepEventType, VoiceParseResult } from "./types";

/**
 * Rule-based Korean intent + time parser for quick sleep logging.
 * Used directly in the browser (offline) and as the server fallback when no LLM key is set.
 * Ambiguous times ("아까 잤어") are never guessed: event_time = null, requires_confirmation = true.
 */

const NATIVE: Record<string, number> = {
  한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6,
  일곱: 7, 여덟: 8, 아홉: 9, 열: 10, 열한: 11, 열하나: 11, 열두: 12, 열둘: 12,
};
const SINO: Record<string, number> = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };

/** "삼십오" → 35, "십" → 10, "15" → 15, "열두" → 12 */
export function koNumber(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  if (t in NATIVE) return NATIVE[t];
  if (/^[일이삼사오육칠팔구십]+$/.test(t)) {
    let total = 0;
    let cur = 0;
    for (const ch of t) {
      if (ch === "십") {
        total += (cur || 1) * 10;
        cur = 0;
      } else cur = SINO[ch];
    }
    return total + cur;
  }
  return null;
}

const NUM = "(\\d+|[일이삼사오육칠팔구십]+|열한|열하나|열두|열둘|한|하나|두|둘|세|셋|네|넷|다섯|여섯|일곱|여덟|아홉|열)";

function normalize(text: string) {
  return text.replace(/\s+/g, " ").replace(/[.!?~,]/g, "").trim();
}

export function parseIntent(text: string, now = new Date()): { intent: SleepEventType | null; confidence: number } {
  const t = normalize(text).replace(/\s/g, "");
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const sleepVerb = has("잠들", "잤", "자요", "재웠", "재움", "들었", "자기시작", "잠이들", "코자", "잠듦", "자는중", "잔다");
  const wakeVerb = has("깼", "깨었", "일어났", "일어남", "기상", "눈떴", "깸", "깨요", "깨서", "끝났");

  if (has("다시잠", "다시잤", "다시재웠", "다시자", "또잠들", "재입면")) return { intent: "BACK_TO_SLEEP", confidence: 0.95 };
  if (has("밤중에깼", "밤에깼", "새벽에깼", "밤중깸", "자다가깼", "자다깼", "밤에일어났", "새벽에일어났", "밤중에일어났", "밤수유"))
    return { intent: "NIGHT_WAKE", confidence: 0.93 };
  if (has("낮잠") && wakeVerb) return { intent: "NAP_END", confidence: 0.95 };
  if (has("낮잠")) return { intent: "NAP_START", confidence: sleepVerb ? 0.96 : 0.85 };
  if (has("밤잠") && wakeVerb) return { intent: "WAKE_UP", confidence: 0.85 };
  if (has("밤잠", "취침", "밤에잠들", "밤에재웠")) return { intent: "NIGHT_SLEEP_START", confidence: sleepVerb ? 0.95 : 0.85 };
  if (wakeVerb) {
    const h = now.getHours();
    // "깼어" at 1am → night waking; context resolution (napping → nap end) happens in resolveIntent()
    if ((h >= 22 || h < 5) && !has("아침", "기상")) return { intent: "NIGHT_WAKE", confidence: 0.75 };
    return { intent: "WAKE_UP", confidence: has("아침", "기상") ? 0.95 : 0.85 };
  }
  if (sleepVerb) {
    const h = now.getHours();
    if (h >= 18 || h < 5) return { intent: "NIGHT_SLEEP_START", confidence: 0.75 };
    return { intent: "NAP_START", confidence: 0.75 };
  }
  return { intent: null, confidence: 0 };
}

export function parseTime(text: string, now = new Date()): { time: Date | null; ambiguous: boolean; explicit: boolean } {
  const t = normalize(text);
  const compact = t.replace(/\s/g, "");

  // relative: N분 전 / N시간 (반) 전 / N시간 M분 전
  const relHM = new RegExp(`${NUM}\\s*시간\\s*(반|${NUM}\\s*분)?\\s*(전|쯤 전|정도 전)`).exec(t);
  if (relHM) {
    const h = koNumber(relHM[1]) ?? 0;
    let m = 0;
    if (relHM[2] === "반") m = 30;
    else if (relHM[3]) m = koNumber(relHM[3]) ?? 0;
    return { time: new Date(now.getTime() - (h * 60 + m) * 60_000), ambiguous: false, explicit: true };
  }
  const relM = new RegExp(`${NUM}\\s*분\\s*(전|쯤 전|정도 전)`).exec(t);
  if (relM) {
    const m = koNumber(relM[1]) ?? 0;
    return { time: new Date(now.getTime() - m * 60_000), ambiguous: false, explicit: true };
  }
  if (/반\s*시간\s*(쯤\s*|정도\s*)?전/.test(t)) return { time: new Date(now.getTime() - 30 * 60_000), ambiguous: false, explicit: true };

  // absolute: (오전|오후|아침|저녁|밤|새벽)? N시 (반|M분)?
  const abs = new RegExp(`(오전|오후|아침|낮|저녁|밤|새벽)?\\s*${NUM}\\s*시\\s*(반|${NUM}\\s*분)?`).exec(t);
  if (abs && !/시간/.test(t.slice(abs.index, abs.index + abs[0].length + 1))) {
    const period = abs[1];
    let h = koNumber(abs[2]);
    if (h != null && h <= 24) {
      let m = 0;
      if (abs[3] === "반") m = 30;
      else if (abs[4]) m = koNumber(abs[4]) ?? 0;
      if (period === "오후" || period === "저녁" || (period === "밤" && h < 12 && h >= 6) || (period === "낮" && h < 6)) {
        if (h < 12) h += 12;
      } else if ((period === "오전" || period === "아침" || period === "새벽") && h === 12) h = 0;
      else if (period === "밤" && h === 12) h = 0;
      const d = new Date(now);
      d.setSeconds(0, 0);
      d.setHours(h % 24, m);
      if (!period && h <= 12) {
        // pick the most recent past occurrence of h or h+12
        const alt = new Date(d);
        alt.setHours((h + 12) % 24);
        const candidates = [d, alt].map((c) => (c > now ? new Date(c.getTime() - 86_400_000) : c));
        candidates.sort((a, b) => b.getTime() - a.getTime());
        return { time: candidates[0], ambiguous: false, explicit: true };
      }
      if (d > now) d.setDate(d.getDate() - 1);
      return { time: d, ambiguous: false, explicit: true };
    }
  }

  if (/(지금|방금|막|금방|이제)/.test(compact)) return { time: new Date(now), ambiguous: false, explicit: true };
  if (/(아까|좀전|조금전|얼마전|아까전|한참전|몇분전|언제)/.test(compact)) return { time: null, ambiguous: true, explicit: false };
  return { time: new Date(now), ambiguous: false, explicit: false };
}

export function parseVoice(text: string, now = new Date()): VoiceParseResult {
  const { intent, confidence } = parseIntent(text, now);
  const { time, ambiguous, explicit } = parseTime(text, now);
  const conf = intent ? Math.round(confidence * (explicit || !ambiguous ? 1 : 0.9) * 100) / 100 : 0;
  return {
    intent,
    event_time: time ? toOffsetIso(time) : null,
    confidence: conf,
    requires_confirmation: !intent || ambiguous || conf < 0.8,
    transcript: text,
    source: "rules",
  };
}

/** ISO string with the local UTC offset, e.g. 2026-10-07T14:20:00+09:00 */
export function toOffsetIso(d: Date) {
  const p = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}
