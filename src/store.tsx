import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Baby, ChatMessage, InputMethod, RoutineStep, Settings, SleepEvent, SleepEventType } from "./lib/types";
import { uid } from "./lib/time";
import { demoBaby, demoEvents } from "./data/demo";

const STORAGE_KEY = "baby-sleep-coach:v1";

export const DEFAULT_ROUTINE: RoutineStep[] = [
  { id: "r1", emoji: "💡", title: "조명 낮추기", minutes: 5 },
  { id: "r2", emoji: "🛁", title: "목욕 · 기저귀", minutes: 10 },
  { id: "r3", emoji: "🍼", title: "수유", minutes: 15 },
  { id: "r4", emoji: "📖", title: "그림책 읽기", minutes: 10 },
  { id: "r5", emoji: "🎵", title: "자장가", minutes: 10, soundId: "brahms" },
];

const DEFAULT_SETTINGS: Settings = {
  notifyNap: true,
  notifyRoutine: true,
  notifyBedtime: true,
  defaultVolume: 0.45,
  nightMode: false,
  favorites: ["pink", "rain"],
};

interface Persisted {
  baby: Baby | null;
  events: SleepEvent[];
  routine: RoutineStep[];
  settings: Settings;
  chats: ChatMessage[];
}

function load(): Persisted {
  const empty: Persisted = { baby: null, events: [], routine: DEFAULT_ROUTINE, settings: DEFAULT_SETTINGS, chats: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw);
    return { ...empty, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } };
  } catch {
    return empty;
  }
}

interface Store extends Persisted {
  now: Date;
  setBaby: (b: Baby) => void;
  addEvent: (type: SleepEventType, time?: Date, method?: InputMethod, extra?: { confidence?: number; note?: string }) => SleepEvent;
  updateEvent: (id: string, patch: Partial<Pick<SleepEvent, "type" | "time" | "note">>) => void;
  deleteEvent: (id: string) => void;
  setRoutine: (r: RoutineStep[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addChat: (m: Omit<ChatMessage, "id" | "createdAt">) => ChatMessage;
  clearChats: () => void;
  resetAll: () => void;
  loadDemo: () => void;
  exportData: () => string;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle("night", state.settings.nightMode);
  }, [state.settings.nightMode]);

  const addEvent = useCallback<Store["addEvent"]>((type, time = new Date(), method = "BUTTON", extra) => {
    const iso = new Date().toISOString();
    const ev: SleepEvent = {
      id: uid(),
      type,
      time: time.toISOString(),
      inputMethod: method,
      confidence: extra?.confidence,
      note: extra?.note,
      createdAt: iso,
      updatedAt: iso,
    };
    setState((s) => ({ ...s, events: [...s.events, ev] }));
    setNow(new Date());
    return ev;
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...state,
      now,
      setBaby: (baby) => setState((s) => ({ ...s, baby })),
      addEvent,
      updateEvent: (id, patch) =>
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)),
        })),
      deleteEvent: (id) => setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })),
      setRoutine: (routine) => setState((s) => ({ ...s, routine })),
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      addChat: (m) => {
        const msg: ChatMessage = { ...m, id: uid(), createdAt: new Date().toISOString() };
        setState((s) => ({ ...s, chats: [...s.chats, msg].slice(-60) }));
        return msg;
      },
      clearChats: () => setState((s) => ({ ...s, chats: [] })),
      resetAll: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState({ baby: null, events: [], routine: DEFAULT_ROUTINE, settings: DEFAULT_SETTINGS, chats: [] });
      },
      loadDemo: () => setState((s) => ({ ...s, baby: demoBaby(), events: demoEvents() })),
      exportData: () => JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2),
    }),
    [state, now, addEvent],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
