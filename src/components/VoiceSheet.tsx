import { useEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { Icon } from "./Icon";
import { useStore } from "../store";
import { useLogEvent } from "../hooks/useLogEvent";
import { parseUtterance } from "../lib/api";
import { EVENT_META, EVENT_ORDER, currentState, resolveIntent } from "../lib/events";
import type { SleepEventType, VoiceParseResult } from "../lib/types";
import { addMin, fmtTime, toLocalInput } from "../lib/time";

type Phase = "listening" | "typing" | "parsing" | "confirm";

const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export const voiceSupported = !!SR;

const EXAMPLES = ["지금 낮잠 들었어", "10분 전에 잠들었어", "낮잠에서 깼어", "밤에 깼어", "다시 잠들었어"];

export function VoiceSheet({ onClose }: { onClose: () => void }) {
  const { events } = useStore();
  const log = useLogEvent();
  const [phase, setPhase] = useState<Phase>(SR ? "listening" : "typing");
  const [transcript, setTranscript] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<VoiceParseResult | null>(null);
  const [intent, setIntent] = useState<SleepEventType | null>(null);
  const [changedFrom, setChangedFrom] = useState<SleepEventType | null>(null);
  const [time, setTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const finalRef = useRef("");

  const handleText = async (utterance: string) => {
    const u = utterance.trim();
    if (!u) return;
    setTranscript(u);
    setPhase("parsing");
    const r = await parseUtterance(u);
    setResult(r);
    const at = r.event_time ? new Date(r.event_time) : new Date();
    let resolved = r.intent;
    let changed = false;
    if (r.intent) {
      const res = resolveIntent(r.intent, currentState(events), at);
      resolved = res.type;
      changed = res.changed;
    }
    // confident, unambiguous, no reinterpretation → save immediately (with 수정/취소 in the toast)
    if (resolved && r.event_time && !r.requires_confirmation && !changed) {
      log(resolved, at, "VOICE", { confidence: r.confidence });
      onClose();
      return;
    }
    setIntent(resolved);
    setChangedFrom(changed ? r.intent : null);
    setTime(r.event_time ? toLocalInput(new Date(r.event_time)) : "");
    setPhase("confirm");
  };

  useEffect(() => {
    if (!SR || phase !== "listening") return;
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t;
        else interim += t;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e: any) => {
      setError(e.error === "not-allowed" ? "마이크 권한이 필요해요. 아래에 직접 입력할 수도 있어요." : "잘 들리지 않았어요. 다시 말하거나 직접 입력해 주세요.");
      setPhase("typing");
    };
    rec.onend = () => {
      const said = finalRef.current.trim();
      if (said) void handleText(said);
      else setPhase((p) => (p === "listening" ? "typing" : p));
    };
    try {
      rec.start();
    } catch {
      setPhase("typing");
    }
    return () => {
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const confirm = () => {
    if (!intent || !time) return;
    log(intent, new Date(time), "VOICE", { confidence: result?.confidence });
    onClose();
  };

  return (
    <Sheet title="말로 기록하기" onClose={onClose}>
      {phase === "listening" && (
        <div className="flex flex-col items-center py-4 text-center">
          <button
            aria-label="듣기 중지"
            onClick={() => recRef.current?.stop()}
            className="animate-listen press flex h-24 w-24 items-center justify-center rounded-full bg-primary text-on-primary"
          >
            <Icon name="mic" size={44} fill />
          </button>
          <p className="mt-5 text-[17px] font-semibold text-ink">{transcript || "듣고 있어요…"}</p>
          <p className="mt-1 text-[13px] text-ink-variant">예: "지금 낮잠 들었어", "10분 전에 잠들었어"</p>
          <button onClick={() => setPhase("typing")} className="mt-4 text-[13px] font-semibold text-primary underline-offset-2 hover:underline">
            키보드로 입력할게요
          </button>
        </div>
      )}

      {phase === "typing" && (
        <div>
          {error && <p className="mb-3 rounded-2xl bg-alert-light px-4 py-2.5 text-[13px] text-error">{error}</p>}
          {!SR && !error && (
            <p className="mb-3 rounded-2xl bg-surface-low px-4 py-2.5 text-[13px] text-ink-variant">
              이 브라우저는 음성 인식을 지원하지 않아요. 문장으로 입력하거나 홈의 빠른 버튼을 사용해 주세요.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleText(text);
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예: 방금 낮잠 들었어"
              className="min-w-0 flex-1 rounded-full border border-outline-variant bg-card px-4 py-3 text-[16px] text-ink placeholder:text-outline"
            />
            <button aria-label="기록" className="press flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
              <Icon name="send" fill />
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => void handleText(ex)} className="press rounded-full bg-muted-purple px-3 py-1.5 text-[13px] font-medium text-primary">
                "{ex}"
              </button>
            ))}
          </div>
          {SR && (
            <button onClick={() => { setError(null); setTranscript(""); setPhase("listening"); }} className="press mt-4 flex items-center gap-1 text-[14px] font-semibold text-primary">
              <Icon name="mic" size={20} /> 다시 말하기
            </button>
          )}
        </div>
      )}

      {phase === "parsing" && (
        <div className="flex flex-col items-center py-8 text-center">
          <Icon name="graphic_eq" size={36} className="animate-pulse text-primary" />
          <p className="mt-3 text-[15px] font-semibold text-ink">"{transcript}"</p>
          <p className="mt-1 text-[13px] text-ink-variant">기록 내용을 확인하고 있어요…</p>
        </div>
      )}

      {phase === "confirm" && (
        <div>
          <p className="rounded-2xl bg-surface-low px-4 py-3 text-[14px] text-ink-variant">
            <Icon name="record_voice_over" size={18} className="mr-1" />"{transcript}"
          </p>

          {intent ? (
            <p className="mt-4 text-[18px] font-bold leading-snug text-ink">
              {changedFrom
                ? `${EVENT_META[intent].emoji} ${EVENT_META[intent].label}으로 기록할까요?`
                : time
                  ? `${EVENT_META[intent].emoji} ${EVENT_META[intent].label}으로 기록할까요?`
                  : `${EVENT_META[intent].emoji} ${EVENT_META[intent].label}, 몇 시쯤이었나요?`}
            </p>
          ) : (
            <p className="mt-4 text-[18px] font-bold text-ink">어떤 기록인지 골라 주세요</p>
          )}
          {changedFrom && (
            <p className="mt-1 text-[13px] text-ink-variant">
              지금 {changedFrom === "WAKE_UP" ? "잠자는 중으로 기록되어 있어서" : "기록 흐름상"} "{EVENT_META[intent!].label}"(으)로 이해했어요.
            </p>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {EVENT_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setIntent(t)}
                className={`press rounded-2xl px-2 py-2.5 text-[12px] font-semibold ${intent === t ? "bg-primary text-on-primary" : "bg-surface-low text-ink"}`}
              >
                <span className="block text-lg">{EVENT_META[t].emoji}</span>
                {EVENT_META[t].short}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[13px] font-semibold text-ink-variant">시간</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 5, 10, 20, 30].map((m) => (
              <button
                key={m}
                onClick={() => setTime(toLocalInput(addMin(new Date(), -m)))}
                className="press rounded-full bg-muted-purple px-3 py-1.5 text-[13px] font-semibold text-primary"
              >
                {m === 0 ? "지금" : `${m}분 전`}
              </button>
            ))}
          </div>
          <input
            aria-label="기록 시간"
            type="datetime-local"
            value={time}
            max={toLocalInput(new Date())}
            onChange={(e) => setTime(e.target.value)}
            className="mt-2 w-full rounded-full border border-outline-variant bg-card px-4 py-3 text-[16px] tabular text-ink"
          />

          <button
            disabled={!intent || !time}
            onClick={confirm}
            className="press mt-5 w-full rounded-full bg-primary py-3.5 text-[16px] font-semibold text-on-primary disabled:opacity-40"
          >
            {intent && time ? `${fmtTime(new Date(time))} ${EVENT_META[intent].label} 기록` : "시간을 선택해 주세요"}
          </button>
          <button onClick={() => { setText(""); setPhase(SR ? "listening" : "typing"); }} className="mt-2 w-full py-2 text-[14px] font-semibold text-ink-variant">
            다시 말하기
          </button>
        </div>
      )}
    </Sheet>
  );
}
