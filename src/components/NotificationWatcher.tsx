import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useToast } from "./Toast";
import { predict } from "../lib/predict";
import { addMin, fmtRange, fmtTime } from "../lib/time";

const KEY = "baby-sleep-coach:notified";

function alreadySent(id: string) {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}");
    return !!m[id];
  } catch {
    return false;
  }
}
function markSent(id: string) {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}");
    m[id] = Date.now();
    // keep it small
    const entries = Object.entries(m).sort((a: any, b: any) => b[1] - a[1]).slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* noop */
  }
}

/**
 * In-app reminders (예상 낮잠 15분 전 · 루틴 시작 · 밤잠 준비).
 * Also raises a system notification when permission is granted and the tab is in the background.
 */
export function NotificationWatcher() {
  const { baby, events, routine, settings, now } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    if (!baby) return;
    const p = predict(baby, events, now);
    const t = now.getTime();
    const day = now.toDateString();
    const notify = (id: string, title: string, body: string, action?: { label: string; to: string }) => {
      if (alreadySent(id)) return;
      markSent(id);
      toast({
        message: title,
        detail: body,
        icon: "notifications_active",
        durationMs: 15000,
        actions: action ? [{ label: action.label, onClick: () => navRef.current(action.to) }] : undefined,
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        try {
          new Notification(title, { body, icon: "/icon.svg", tag: id });
        } catch {
          /* some mobile browsers require a service worker for notifications */
        }
      }
    };
    const within = (target: Date, leadMin: number) => {
      const from = addMin(target, -leadMin).getTime();
      return t >= from && t < from + 10 * 60_000;
    };

    const nap = p.schedule.find((w) => w.type === "NAP");
    if (settings.notifyNap && nap && within(nap.start, 15)) {
      notify(`nap-${day}-${nap.napIndex}`, "😴 다음 낮잠 시간이 가까워지고 있어요.", `예상 ${fmtRange(nap.start, nap.end)} · 15분 정도 후부터 잠들 준비를 시작해 보세요.`, {
        label: "소리 켜기",
        to: "/sounds",
      });
    }
    const night = p.schedule.find((w) => w.type === "NIGHT");
    if (night) {
      const total = routine.reduce((a, s) => a + s.minutes, 0);
      if (settings.notifyRoutine && total > 0 && within(night.start, total)) {
        notify(`routine-${day}`, "🌙 수면 루틴을 시작할 시간이에요.", `예상 밤잠 ${fmtTime(night.start)} 기준 · 루틴 ${total}분`, { label: "루틴 시작", to: "/routine?run=1" });
      } else if (settings.notifyBedtime && within(night.start, 30)) {
        notify(`bed-${day}`, "🌙 밤잠 준비 시간이에요.", `오늘 예상 밤잠 ${fmtRange(night.start, night.end)}`);
      }
    }
  }, [baby, events, routine, settings, now, toast]);

  return null;
}
