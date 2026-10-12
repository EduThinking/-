import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useStore } from "../store";
import { EVENT_META, EVENT_ORDER } from "../lib/events";
import type { SleepEventType } from "../lib/types";
import { toLocalInput } from "../lib/time";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

interface OpenArgs {
  eventId?: string;
  type?: SleepEventType;
  time?: Date;
}

const Ctx = createContext<(a?: OpenArgs) => void>(() => {});

export function EventSheetProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<OpenArgs | null>(null);
  const open = useCallback((a: OpenArgs = {}) => setArgs(a), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {args && <EventEditor key={args.eventId ?? "new"} args={args} onClose={() => setArgs(null)} />}
    </Ctx.Provider>
  );
}

export function useEventSheet() {
  return useContext(Ctx);
}

function EventEditor({ args, onClose }: { args: OpenArgs; onClose: () => void }) {
  const { events, addEvent, updateEvent, deleteEvent } = useStore();
  const existing = args.eventId ? events.find((e) => e.id === args.eventId) : undefined;
  const [type, setType] = useState<SleepEventType>(existing?.type ?? args.type ?? "NAP_START");
  const [time, setTime] = useState(toLocalInput(existing ? new Date(existing.time) : args.time ?? new Date()));
  const [note, setNote] = useState(existing?.note ?? "");
  const invalid = !time || isNaN(new Date(time).getTime()) || new Date(time).getTime() > Date.now() + 60_000;

  const save = () => {
    if (invalid) return;
    const t = new Date(time);
    if (existing) updateEvent(existing.id, { type, time: t.toISOString(), note: note || undefined });
    else addEvent(type, t, "MANUAL", { note: note || undefined });
    onClose();
  };

  return (
    <Sheet title={existing ? "기록 수정" : "기록 추가"} onClose={onClose}>
      <p className="mb-2 text-[13px] font-semibold text-ink-variant">어떤 기록인가요?</p>
      <div className="grid grid-cols-2 gap-2">
        {EVENT_ORDER.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`press flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-[14px] font-semibold ${
              type === t ? "bg-primary text-on-primary" : "bg-surface-low text-ink"
            }`}
          >
            <span className="text-lg">{EVENT_META[t].emoji}</span>
            {EVENT_META[t].label}
          </button>
        ))}
      </div>
      <label className="mt-5 block text-[13px] font-semibold text-ink-variant" htmlFor="ev-time">
        시간
      </label>
      <input
        id="ev-time"
        type="datetime-local"
        value={time}
        max={toLocalInput(new Date())}
        onChange={(e) => setTime(e.target.value)}
        className="mt-2 w-full rounded-full border border-outline-variant bg-card px-4 py-3 text-[16px] tabular text-ink"
      />
      {invalid && <p className="mt-1 text-[12px] text-error">미래 시간은 기록할 수 없어요.</p>}
      <label className="mt-4 block text-[13px] font-semibold text-ink-variant" htmlFor="ev-note">
        메모 (선택)
      </label>
      <input
        id="ev-note"
        value={note}
        maxLength={80}
        placeholder="예: 유모차에서 잠듦"
        onChange={(e) => setNote(e.target.value)}
        className="mt-2 w-full rounded-full border border-outline-variant bg-card px-4 py-3 text-[15px] text-ink placeholder:text-outline"
      />
      <div className="mt-6 flex gap-2">
        {existing && (
          <button
            onClick={() => {
              deleteEvent(existing.id);
              onClose();
            }}
            className="press flex items-center gap-1 rounded-full bg-alert-light px-5 py-3.5 text-[15px] font-semibold text-error"
          >
            <Icon name="delete" size={20} /> 삭제
          </button>
        )}
        <button
          disabled={invalid}
          onClick={save}
          className="press flex-1 rounded-full bg-primary py-3.5 text-[16px] font-semibold text-on-primary disabled:opacity-40"
        >
          저장
        </button>
      </div>
    </Sheet>
  );
}
