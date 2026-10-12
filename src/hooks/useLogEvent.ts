import { useCallback } from "react";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { useEventSheet } from "../components/EventSheet";
import { EVENT_META, buildSessions } from "../lib/events";
import { predict } from "../lib/predict";
import type { InputMethod, SleepEventType } from "../lib/types";
import { fmtDuration, fmtRange, fmtTime, sameDay } from "../lib/time";

const NEXT_LABEL = { NAP: "낮잠", NIGHT: "밤잠", WAKE: "기상" } as const;

/** Log an event and show the "기록했어요 [수정] [취소]" toast with the recalculated next window. */
export function useLogEvent() {
  const { baby, events, addEvent, deleteEvent } = useStore();
  const toast = useToast();
  const openSheet = useEventSheet();

  return useCallback(
    (type: SleepEventType, time: Date = new Date(), method: InputMethod = "BUTTON", extra?: { confidence?: number; note?: string }) => {
      const ev = addEvent(type, time, method, extra);
      navigator.vibrate?.(15);
      const all = [...events, ev];
      const now = new Date();
      const lines: string[] = [];
      const sessions = buildSessions(all, now);
      if (type === "NAP_END") {
        const s = sessions.find((x) => x.endEventId === ev.id);
        if (s) {
          const idx = sessions.filter((x) => x.type === "NAP" && sameDay(x.start, s.start) && x.start <= s.start).length;
          lines.push(`오늘 ${idx}번째 낮잠 ${fmtDuration(s.durationMin)}`);
        }
      }
      if (type === "NAP_START") {
        const idx = sessions.filter((x) => x.type === "NAP" && sameDay(x.start, time)).length;
        lines.push(`${idx}번째 낮잠을 시작했어요.`);
      }
      if (baby && (type === "WAKE_UP" || type === "NAP_END")) {
        const p = predict(baby, all, now);
        if (p.next) lines.push(`다음 ${NEXT_LABEL[p.next.type]} 예상 ${fmtRange(p.next.start, p.next.end)}`);
      }
      toast({
        message: `${EVENT_META[type].emoji} ${fmtTime(time)} ${EVENT_META[type].label}으로 기록했어요.`,
        detail: lines.join("\n") || undefined,
        actions: [
          { label: "수정", onClick: () => openSheet({ eventId: ev.id }) },
          { label: "취소", onClick: () => deleteEvent(ev.id) },
        ],
      });
      return ev;
    },
    [baby, events, addEvent, deleteEvent, toast, openSheet],
  );
}
