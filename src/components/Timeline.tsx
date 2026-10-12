import type { PredictionWindow, SleepEvent, SleepSession } from "../lib/types";
import { eventsOnDay } from "../lib/events";
import { addDays, diffMin, fmtDuration, fmtRange, fmtTime, sameDay, startOfDay } from "../lib/time";
import { Icon } from "./Icon";

type Item =
  | { kind: "wake"; at: Date; ev: SleepEvent }
  | { kind: "session"; at: Date; s: SleepSession; napNo?: number; carried?: boolean }
  | { kind: "pred"; at: Date; w: PredictionWindow };

export function buildTimeline(day: Date, events: SleepEvent[], sessions: SleepSession[], predictions: PredictionWindow[] = []): Item[] {
  const items: Item[] = [];
  const naps = sessions.filter((s) => s.type === "NAP" && sameDay(s.start, day));
  // last night (started the previous evening, ended today)
  const carried = sessions.find((s) => s.type === "NIGHT" && !sameDay(s.start, day) && s.end && sameDay(s.end, day));
  if (carried) items.push({ kind: "session", at: startOfDay(day), s: carried, carried: true });
  for (const ev of eventsOnDay(events, day)) if (ev.type === "WAKE_UP") items.push({ kind: "wake", at: new Date(ev.time), ev });
  naps.forEach((s, i) => items.push({ kind: "session", at: s.start, s, napNo: i + 1 }));
  sessions
    .filter((s) => s.type === "NIGHT" && sameDay(s.start, day))
    .forEach((s) => items.push({ kind: "session", at: s.start, s }));
  for (const w of predictions) items.push({ kind: "pred", at: w.start, w });
  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

const dot = {
  wake: "bg-butter ring-butter-light",
  NAP: "bg-butter ring-butter-light",
  NIGHT: "bg-night-indigo ring-muted-purple",
  pred: "bg-card ring-prediction border-2 border-dashed border-prediction",
};

export function Timeline({
  items,
  compact,
  onEdit,
  now = new Date(),
}: {
  items: Item[];
  compact?: boolean;
  onEdit?: (eventId: string) => void;
  now?: Date;
}) {
  if (!items.length)
    return (
      <div className="rounded-3xl bg-surface-low px-5 py-8 text-center text-[14px] text-ink-variant">
        <Icon name="bedtime" size={32} className="mb-2 text-outline" />
        <p>아직 기록이 없어요.</p>
        <p className="mt-1 text-[13px]">아침에 "일어났어"부터 기록해 보세요.</p>
      </div>
    );

  return (
    <ol className="relative ml-3 border-l-2 border-dashed border-outline-variant pl-6">
      {items.map((it, i) => {
        if (it.kind === "wake")
          return (
            <li key={`w${i}`} className="relative pb-4">
              <span className={`absolute -left-[33px] top-3 h-4 w-4 rounded-full ring-4 ${dot.wake}`} />
              <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
                <span className="text-xl">☀️</span>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-ink">아침 기상</p>
                  {!compact && it.ev.note && <p className="text-[12px] text-ink-variant">{it.ev.note}</p>}
                </div>
                <span className="tabular text-[15px] font-bold text-ink">{fmtTime(it.at)}</span>
                {onEdit && <EditBtn onClick={() => onEdit(it.ev.id)} />}
              </div>
            </li>
          );
        if (it.kind === "pred") {
          const w = it.w;
          const label = w.type === "NAP" ? `낮잠 ${w.napIndex ?? ""} 예상` : w.type === "NIGHT" ? "밤잠 예상" : "기상 예상";
          const overdue = w.end < now;
          return (
            <li key={`p${i}`} className="relative pb-4">
              <span className={`absolute -left-[33px] top-3 h-4 w-4 rounded-full ${dot.pred}`} />
              <div className="prediction-card flex items-center gap-3 rounded-2xl px-4 py-3">
                <span className="text-xl">{w.type === "NIGHT" ? "🌙" : w.type === "NAP" ? "😴" : "☀️"}</span>
                <div className="flex-1">
                  <p className="flex items-center gap-1 text-[15px] font-semibold text-primary">
                    {label}
                    <Icon name="auto_awesome" size={16} className="text-primary" fill />
                  </p>
                  {overdue && <p className="text-[12px] text-ink-variant">예상 시간이 지났어요 · 졸린 신호를 살펴봐 주세요</p>}
                </div>
                <span className="tabular text-[14px] font-bold text-primary">{fmtRange(w.start, w.end)}</span>
              </div>
            </li>
          );
        }
        const s = it.s;
        const isNap = s.type === "NAP";
        const ongoing = !s.end;
        const title = it.carried ? "지난밤 밤잠" : isNap ? `낮잠 ${it.napNo}` : "밤잠";
        const endLabel = s.end ? fmtTime(s.end) : "진행 중";
        return (
          <li key={`s${s.id}`} className="relative pb-4">
            <span className={`absolute -left-[33px] top-3 h-4 w-4 rounded-full ring-4 ${isNap ? dot.NAP : dot.NIGHT} ${ongoing ? "animate-pulse" : ""}`} />
            <div className={`rounded-2xl px-4 py-3 shadow-soft ${isNap ? "border-l-4 border-butter bg-card" : "bg-night-indigo text-white"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{isNap ? "😴" : "🌙"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-2 text-[15px] font-semibold ${isNap ? "text-ink" : "text-white"}`}>
                    {title}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isNap ? "bg-butter-light text-butter-ink" : "bg-white/15 text-butter"}`}>
                      {ongoing ? `${fmtDuration(s.durationMin)}째` : fmtDuration(s.durationMin)}
                    </span>
                  </p>
                  <p className={`tabular text-[13px] ${isNap ? "text-ink-variant" : "text-white/75"}`}>
                    {fmtTime(s.start)} ~ {endLabel}
                    {s.nightWakings > 0 && ` · 밤중 각성 ${s.nightWakings}회`}
                  </p>
                </div>
              </div>
              {!compact && onEdit && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <EventChip label={`${isNap ? "잠듦" : "취침"} ${fmtTime(s.start)}`} onClick={() => onEdit(s.startEventId)} dark={!isNap} />
                  {s.endEventId && <EventChip label={`깸 ${fmtTime(s.end!)}`} onClick={() => onEdit(s.endEventId!)} dark={!isNap} />}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="수정" onClick={onClick} className="press rounded-full p-1.5 text-ink-variant hover:bg-surface-low">
      <Icon name="edit" size={18} />
    </button>
  );
}

function EventChip({ label, onClick, dark }: { label: string; onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`press flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${dark ? "bg-white/10 text-white" : "bg-surface-low text-ink-variant"}`}
    >
      {label} <Icon name="edit" size={14} />
    </button>
  );
}

/** 24-hour band: night (indigo), naps (butter), wakings (red), predictions (dashed) */
export function SleepBand({
  day,
  sessions,
  events,
  predictions = [],
  now = new Date(),
}: {
  day: Date;
  sessions: SleepSession[];
  events: SleepEvent[];
  predictions?: PredictionWindow[];
  now?: Date;
}) {
  const s0 = startOfDay(day);
  const s1 = addDays(s0, 1);
  const pct = (d: Date) => Math.max(0, Math.min(100, (diffMin(d, s0) / 1440) * 100));
  const segs = sessions
    .filter((s) => s.start < s1 && (s.end ?? now) > s0)
    .map((s) => ({ type: s.type, left: pct(s.start < s0 ? s0 : s.start), right: pct((s.end ?? now) > s1 ? s1 : s.end ?? now) }));
  const wakes = eventsOnDay(events, day).filter((e) => e.type === "NIGHT_WAKE");
  return (
    <div>
      <div className="relative h-8 overflow-hidden rounded-full bg-muted-purple/60" role="img" aria-label="24시간 수면 분포">
        {segs.map((g, i) => (
          <span
            key={i}
            className={`absolute inset-y-0 ${g.type === "NIGHT" ? "bg-night-indigo" : "bg-butter"} ${g.type === "NAP" ? "rounded-md" : ""}`}
            style={{ left: `${g.left}%`, width: `${Math.max(0.6, g.right - g.left)}%` }}
          />
        ))}
        {predictions.map((w, i) => (
          <span
            key={`p${i}`}
            className="absolute inset-y-1 rounded-md border-2 border-dashed border-primary/60 bg-prediction/40"
            style={{ left: `${pct(w.start)}%`, width: `${Math.max(1, pct(w.end) - pct(w.start))}%` }}
          />
        ))}
        {wakes.map((e) => (
          <span key={e.id} className="absolute inset-y-0 w-[3px] bg-alert" style={{ left: `${pct(new Date(e.time))}%` }} />
        ))}
        {sameDay(now, day) && <span className="absolute -inset-y-0 w-0.5 bg-primary" style={{ left: `${pct(now)}%` }} />}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular text-ink-variant">
        {["00", "06", "12", "18", "24"].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-variant">
        <Legend cls="bg-night-indigo" label="밤잠" />
        <Legend cls="bg-butter" label="낮잠" />
        <Legend cls="bg-alert" label="밤중 깸" />
        <Legend cls="border border-dashed border-primary bg-prediction/40" label="예상" />
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${cls}`} />
      {label}
    </span>
  );
}
