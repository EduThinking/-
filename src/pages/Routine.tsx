import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { useSound } from "../components/SoundProvider";
import { useLogEvent } from "../hooks/useLogEvent";
import { Icon } from "../components/Icon";
import { SOUNDS, soundById } from "../data/sounds";
import { predict } from "../lib/predict";
import { addMin, fmtTime, uid } from "../lib/time";
import type { RoutineStep } from "../lib/types";

export default function Routine() {
  const { baby, events, routine, setRoutine, now } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const running = params.get("run") === "1";
  const prediction = useMemo(() => predict(baby!, events, now), [baby, events, now]);
  const night = prediction.schedule.find((w) => w.type === "NIGHT") ?? (prediction.next?.type === "NIGHT" ? prediction.next : null);
  const total = routine.reduce((a, s) => a + s.minutes, 0);
  const bedAt = night ? addMin(night.start, 10) : null; // middle of the window
  const startAt = bedAt ? addMin(bedAt, -total) : null;

  if (running) return <Runner steps={routine} onExit={() => setParams({})} />;

  const update = (id: string, patch: Partial<RoutineStep>) => setRoutine(routine.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= routine.length) return;
    const next = [...routine];
    [next[i], next[j]] = [next[j], next[i]];
    setRoutine(next);
  };

  let cursor = startAt;
  return (
    <main className="space-y-5 px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="뒤로" className="press -ml-2 rounded-full p-2 text-ink-variant">
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-[22px] font-bold text-ink">수면 루틴</h1>
      </div>

      <section className="rounded-[2rem] bg-night-indigo p-5 text-white shadow-lift">
        <p className="text-[13px] text-white/70">오늘 예상 밤잠 기준</p>
        {startAt && bedAt ? (
          <p className="mt-1 text-[22px] font-bold">
            <span className="tabular">{fmtTime(startAt)}</span>에 시작하면 <span className="tabular text-butter">{fmtTime(bedAt)}</span> 밤잠
          </p>
        ) : (
          <p className="mt-1 text-[18px] font-bold">밤잠 예상이 아직 없어요</p>
        )}
        <p className="mt-1 text-[13px] text-white/70">루틴 총 {total}분 · 매일 같은 순서가 잠들 준비 신호가 돼요</p>
        <button
          onClick={() => setParams({ run: "1" })}
          disabled={!routine.length}
          className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[16px] font-bold text-night-indigo disabled:opacity-40"
        >
          <Icon name="play_arrow" fill /> 수면 루틴 시작
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-[18px] font-bold text-ink">루틴 단계</h2>
        {routine.map((s, i) => {
          const at = cursor;
          if (cursor) cursor = addMin(cursor, s.minutes);
          return (
            <div key={s.id} className="rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2">
                <input
                  aria-label="이모지"
                  value={s.emoji}
                  maxLength={2}
                  onChange={(e) => update(s.id, { emoji: e.target.value })}
                  className="h-11 w-11 shrink-0 rounded-2xl bg-surface-low text-center text-xl"
                />
                <input
                  aria-label="단계 이름"
                  value={s.title}
                  maxLength={20}
                  onChange={(e) => update(s.id, { title: e.target.value })}
                  className="min-w-0 flex-1 rounded-full bg-surface-low px-3 py-2 text-[15px] font-semibold text-ink"
                />
                {at && <span className="tabular shrink-0 text-[13px] font-semibold text-primary">{fmtTime(at)}</span>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center rounded-full bg-surface-low">
                  <button aria-label="시간 줄이기" onClick={() => update(s.id, { minutes: Math.max(1, s.minutes - 5) })} className="press p-2 text-ink-variant">
                    <Icon name="remove" size={18} />
                  </button>
                  <span className="tabular w-12 text-center text-[14px] font-semibold text-ink">{s.minutes}분</span>
                  <button aria-label="시간 늘리기" onClick={() => update(s.id, { minutes: Math.min(60, s.minutes + 5) })} className="press p-2 text-ink-variant">
                    <Icon name="add" size={18} />
                  </button>
                </div>
                <select
                  aria-label="이 단계에서 재생할 소리"
                  value={s.soundId ?? ""}
                  onChange={(e) => update(s.id, { soundId: e.target.value || undefined })}
                  className="min-w-0 flex-1 rounded-full bg-surface-low px-3 py-2 text-[13px] text-ink"
                >
                  <option value="">소리 없음</option>
                  {SOUNDS.map((x) => (
                    <option key={x.id} value={x.id}>
                      🎵 {x.title}
                    </option>
                  ))}
                </select>
                <button aria-label="위로" onClick={() => move(i, -1)} className="press rounded-full p-1.5 text-ink-variant">
                  <Icon name="arrow_upward" size={18} />
                </button>
                <button aria-label="아래로" onClick={() => move(i, 1)} className="press rounded-full p-1.5 text-ink-variant">
                  <Icon name="arrow_downward" size={18} />
                </button>
                <button aria-label="삭제" onClick={() => setRoutine(routine.filter((x) => x.id !== s.id))} className="press rounded-full p-1.5 text-error">
                  <Icon name="delete" size={18} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={() => setRoutine([...routine, { id: uid(), emoji: "⭐", title: "새 단계", minutes: 5 }])}
          className="press flex w-full items-center justify-center gap-1 rounded-full border-2 border-dashed border-outline-variant py-3 text-[14px] font-semibold text-primary"
        >
          <Icon name="add" /> 단계 추가
        </button>
      </section>
    </main>
  );
}

function Runner({ steps, onExit }: { steps: RoutineStep[]; onExit: () => void }) {
  const snd = useSound();
  const log = useLogEvent();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const step = steps[i];
  const done = i >= steps.length;

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (step?.soundId) snd.play(step.soundId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  void tick;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const left = step ? Math.max(0, step.minutes * 60 - elapsed) : 0;
  const next = () => {
    setI((x) => x + 1);
    setStartedAt(Date.now());
  };

  return (
    <main className="flex min-h-[calc(100dvh-110px)] flex-col bg-night-indigo px-6 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[13px] font-semibold">
          <Icon name="close" size={18} /> 루틴 종료
        </button>
        <span className="text-[13px] text-white/60">
          {Math.min(i + 1, steps.length)} / {steps.length}
        </span>
      </div>
      <div className="mt-4 flex gap-1.5">
        {steps.map((s, j) => (
          <span key={s.id} className={`h-1.5 flex-1 rounded-full ${j < i ? "bg-butter" : j === i ? "bg-white" : "bg-white/20"}`} />
        ))}
      </div>

      {!done ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-7xl">{step.emoji}</span>
          <h1 className="mt-6 text-[30px] font-bold">{step.title}</h1>
          <p className="tabular mt-3 text-[44px] font-bold text-butter">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </p>
          {step.soundId && (
            <p className="mt-2 flex items-center gap-1 text-[14px] text-white/70">
              <Icon name="music_note" size={18} /> {soundById(step.soundId)?.title} {snd.playing ? "재생 중" : ""}
            </p>
          )}
          {steps[i + 1] && <p className="mt-6 text-[14px] text-white/60">다음: {steps[i + 1].emoji} {steps[i + 1].title}</p>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-7xl">🌙</span>
          <h1 className="mt-6 text-[28px] font-bold">루틴을 마쳤어요</h1>
          <p className="mt-2 text-[15px] text-white/70">잠들면 아래 버튼으로 기록해 주세요.</p>
          <button
            onClick={() => {
              log("NIGHT_SLEEP_START");
              navigate("/");
            }}
            className="press mt-8 w-full rounded-full bg-butter py-4 text-[17px] font-bold text-night-indigo"
          >
            🌙 밤잠 들었어
          </button>
          <button onClick={() => navigate("/sounds")} className="press mt-3 w-full rounded-full bg-white/10 py-3.5 text-[15px] font-semibold">
            수면음 계속 듣기
          </button>
        </div>
      )}

      {!done && (
        <div className="mt-6 flex gap-2">
          <button disabled={i === 0} onClick={() => { setI(i - 1); setStartedAt(Date.now()); }} className="press rounded-full bg-white/10 px-5 py-4 disabled:opacity-30" aria-label="이전 단계">
            <Icon name="skip_previous" fill />
          </button>
          <button onClick={next} className="press flex-1 rounded-full bg-white py-4 text-[17px] font-bold text-night-indigo">
            {i === steps.length - 1 ? "루틴 완료" : "다음 단계"}
          </button>
        </div>
      )}
    </main>
  );
}
