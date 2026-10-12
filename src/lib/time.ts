export const MIN = 60_000;

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function fmtTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fmtRange(a: Date, b: Date) {
  return `${fmtTime(a)}~${fmtTime(b)}`;
}

export function fmtDuration(min: number) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}분`;
  if (r === 0) return `${h}시간`;
  return `${h}시간 ${r}분`;
}

export function fmtSignedDuration(min: number) {
  const sign = min > 0 ? "+" : min < 0 ? "−" : "±";
  return `${sign}${fmtDuration(Math.abs(min))}`;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMin(d: Date, n: number) {
  return new Date(d.getTime() + n * MIN);
}

export function diffMin(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / MIN;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "HH:MM" -> minutes since midnight */
export function hmToMin(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minToHm(min: number) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function atTime(day: Date, hm: string) {
  const d = startOfDay(day);
  d.setMinutes(hmToMin(hm));
  return d;
}

/** minutes since midnight for a date */
export function minOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function fmtDateLabel(d: Date, today = new Date()) {
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
  if (sameDay(d, today)) return `오늘 ${base}`;
  if (sameDay(d, addDays(today, -1))) return `어제 ${base}`;
  return base;
}

export function fmtShortDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

/** value for <input type="datetime-local"> */
export function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ageInMonths(birthDate: string, now = new Date()) {
  const b = new Date(birthDate + "T00:00:00");
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

export function ageLabel(birthDate: string, now = new Date()) {
  const months = ageInMonths(birthDate, now);
  const b = new Date(birthDate + "T00:00:00");
  const anchor = new Date(b);
  anchor.setMonth(b.getMonth() + months);
  const days = Math.max(0, Math.floor((startOfDay(now).getTime() - anchor.getTime()) / 86_400_000));
  if (months === 0) {
    const total = Math.floor((startOfDay(now).getTime() - b.getTime()) / 86_400_000);
    return `생후 ${total}일`;
  }
  return `생후 ${months}개월 ${days}일`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
