import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useLogEvent } from "../hooks/useLogEvent";
import { useEventSheet } from "../components/EventSheet";
import { Header } from "../components/Layout";
import { Icon } from "../components/Icon";
import { VoiceSheet } from "../components/VoiceSheet";
import { Timeline, buildTimeline } from "../components/Timeline";
import { EVENT_META, EVENT_ORDER, buildSessions, currentState, sortEvents, suggestedButtons } from "../lib/events";
import { ageNorm, predict, targetWindow } from "../lib/predict";
import { ageInMonths, diffMin, fmtDuration, fmtRange, fmtTime, sameDay } from "../lib/time";
import { recommendedGuides } from "../data/guides";
import type { SleepEventType } from "../lib/types";

const TONE: Record<string, string> = {
  sun: "bg-butter-light",
  nap: "bg-muted-purple",
  sage: "bg-sage-light",
  night: "bg-night-indigo",
  alert: "bg-alert-light",
};

const BUTTON_SUB: Record<SleepEventType, string> = {
  WAKE_UP: "아침 기상",
  NAP_START: "낮잠 시작",
  NAP_END: "낮잠 완료",
  NIGHT_SLEEP_START: "밤잠 시작",
  NIGHT_WAKE: "야간 각성",
  BACK_TO_SLEEP: "재입면 완료",
};

export default function Today() {
  const { baby, events, now, deleteEvent } = useStore();
  const log = useLogEvent();
  const openSheet = useEventSheet();
  const navigate = useNavigate();
  const [voiceOpen, setVoiceOpen] = useState(false);

  const months = ageInMonths(baby!.birthDate, now);
  const norm = ageNorm(months);
  const state = currentState(events, now);
  const sessions = useMemo(() => buildSessions(events, now), [events, now]);
  const prediction = useMemo(() => predict(baby!, events, now), [baby, events, now]);
  const suggested = suggestedButtons(state, now);
  const sorted = sortEvents(events);
  const last = sorted.at(-1);
  const todayNaps = sessions.filter((s) => s.type === "NAP" && sameDay(s.start, now));
  const todaySleepMin = todayNaps.reduce((a, s) => a + s.durationMin, 0);
  const timelineItems = buildTimeline(now, events, sessions, prediction.schedule);
  const guides = recommendedGuides(months, 2);

  return (
    <>
      <Header subtitle={`${norm.label} · 낮잠 ${baby!.napCount || norm.naps}회기 · 오늘 낮잠 ${todayNaps.length}회`} />
      <main className="space-y-5 px-5">
        <StatusCard state={state} now={now} lastAt={last ? new Date(last.time) : null} sessions={sessions} target={prediction.wakeWindowMin || targetWindow(norm, todayNaps.length)} />

        {/* Voice */}
        <button
          onClick={() => setVoiceOpen(true)}
          className="press flex w-full items-center gap-3 rounded-full bg-surface-container px-3 py-2.5 text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-lift">
            <Icon name="mic" fill />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink-variant">말 한마디로 3초 빠른 기록</span>
            <span className="mt-0.5 flex gap-1.5 overflow-hidden">
              <span className="shrink-0 rounded-full bg-card px-2.5 py-0.5 text-[12px] font-medium text-primary">"지금 낮잠 들었어"</span>
              <span className="shrink-0 rounded-full bg-card px-2.5 py-0.5 text-[12px] font-medium text-primary">"10분 전에 깼어"</span>
            </span>
          </span>
        </button>

        {/* Quick buttons */}
        <section aria-labelledby="quick">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="quick" className="text-[20px] font-bold text-ink">
              빠른 수면 기록
            </h2>
            <span className="text-[12px] text-ink-variant">터치 즉시 현재 시간으로 기록</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {EVENT_ORDER.map((t) => {
              const m = EVENT_META[t];
              const hot = suggested.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => log(t)}
                  className={`press relative flex min-h-[72px] items-center gap-3 rounded-3xl bg-card px-3 py-3 text-left shadow-soft ${
                    hot ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${TONE[m.tone]}`}>{m.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-bold leading-tight text-ink">{m.button}</span>
                    <span className="block text-[12px] text-ink-variant">{BUTTON_SUB[t]}</span>
                  </span>
                  {hot && <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">추천</span>}
                </button>
              );
            })}
          </div>
          {last && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-surface-low py-2 pl-4 pr-2 text-[13px]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sage" />
              <span className="min-w-0 flex-1 truncate text-ink-variant">
                마지막 기록 · <b className="tabular text-ink">{fmtTime(last.time)}</b> {EVENT_META[last.type].label}
                {last.inputMethod === "VOICE" && " (음성)"}
              </span>
              <button onClick={() => openSheet({ eventId: last.id })} className="press rounded-full px-2.5 py-1 font-semibold text-primary">
                수정
              </button>
              <button onClick={() => deleteEvent(last.id)} className="press rounded-full px-2.5 py-1 font-semibold text-ink-variant">
                취소
              </button>
            </div>
          )}
        </section>

        {/* Prediction */}
        <PredictionCard prediction={prediction} now={now} onRoutine={() => navigate("/routine")} onSound={() => navigate("/sounds")} />

        {/* Today's timeline */}
        <section className="rounded-[2rem] bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[20px] font-bold text-ink">
              <Icon name="schedule" className="text-primary" /> 오늘의 수면 일정
            </h2>
            <span className="rounded-full bg-surface-low px-3 py-1 text-[12px] font-semibold text-ink-variant">낮잠 {fmtDuration(todaySleepMin)}</span>
          </div>
          <Timeline items={timelineItems} compact now={now} />
          <Link to="/sleep" className="mt-1 flex items-center justify-center gap-1 rounded-full py-2 text-[14px] font-semibold text-primary">
            상세 기록 보기 <Icon name="chevron_right" size={18} />
          </Link>
        </section>

        {/* Guides */}
        <section>
          <h2 className="mb-3 text-[18px] font-bold text-ink">이번 주 {baby!.nickname}에게 필요한 수면 정보</h2>
          <div className="space-y-3">
            {guides.map((g) => (
              <Link key={g.id} to={`/guide/${g.id}`} className="press flex items-center gap-3 rounded-3xl bg-muted-purple/70 px-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary">
                  <Icon name="menu_book" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-primary">{g.category}</span>
                  <span className="block text-[15px] font-bold leading-snug text-ink">{g.title}</span>
                </span>
                <Icon name="chevron_right" className="text-primary" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      {voiceOpen && <VoiceSheet onClose={() => setVoiceOpen(false)} />}
    </>
  );
}

function StatusCard({
  state,
  now,
  lastAt,
  sessions,
  target,
}: {
  state: ReturnType<typeof currentState>;
  now: Date;
  lastAt: Date | null;
  sessions: ReturnType<typeof buildSessions>;
  target: number;
}) {
  const open = sessions.at(-1);
  let chip = "";
  let title: React.ReactNode = "";
  let sub = "";
  let ring: number | null = null;
  let emoji = "☀️";

  if (state === "AWAKE" && lastAt) {
    const awake = diffMin(now, lastAt);
    chip = "적정 깨어있는 시간 (Wake Window)";
    title = (
      <>
        일어난 지 <span className="text-primary">{fmtDuration(awake)}</span> 지났어요
      </>
    );
    const left = target - awake;
    sub = left > 0 ? `목표 깨어있는 시간 ${fmtDuration(target)} · 약 ${fmtDuration(left)} 남음` : `목표 ${fmtDuration(target)}을 지났어요 · 졸린 신호를 살펴봐 주세요`;
    ring = Math.min(1, awake / Math.max(1, target));
  } else if (state === "NAPPING" && open) {
    emoji = "😴";
    chip = "낮잠 중";
    title = (
      <>
        낮잠 잔 지 <span className="text-primary">{fmtDuration(open.durationMin)}</span>째예요
      </>
    );
    sub = `${fmtTime(open.start)}에 잠들었어요 · 깨면 "낮잠에서 깼어"를 눌러주세요`;
  } else if (state === "NIGHT_SLEEPING" && open) {
    emoji = "🌙";
    chip = "밤잠 중";
    title = (
      <>
        밤잠 <span className="text-primary">{fmtDuration(open.durationMin)}</span>째 자고 있어요
      </>
    );
    sub = `${fmtTime(open.start)} 취침${open.nightWakings ? ` · 밤중 각성 ${open.nightWakings}회` : ""}`;
  } else if (state === "NIGHT_AWAKE" && lastAt) {
    emoji = "🌃";
    chip = "밤중 각성";
    title = (
      <>
        밤중에 깬 지 <span className="text-primary">{fmtDuration(diffMin(now, lastAt))}</span>
      </>
    );
    sub = "조명은 어둡게, 목소리는 작게 · 다시 잠들면 \"다시 잠들었어\"를 눌러주세요";
  } else {
    chip = "오늘의 시작";
    title = <>좋은 하루예요! 아기가 깨면 기록해 주세요</>;
    sub = "\"일어났어\" 한 번이면 오늘 낮잠·밤잠 일정을 예측해 드려요";
  }

  const C = 2 * Math.PI * 26;
  return (
    <section className="rounded-[2rem] bg-card p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-sage-light px-2.5 py-1 text-[12px] font-semibold text-sage-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" /> {chip}
          </span>
          <p className="mt-3 text-[22px] font-bold leading-[30px] text-ink">
            {title} <span aria-hidden>{emoji}</span>
          </p>
        </div>
        {ring != null && (
          <div className="relative h-16 w-16 shrink-0" aria-label={`목표 대비 ${Math.round(ring * 100)}%`}>
            <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-muted-purple)" strokeWidth="7" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={ring >= 1 ? "var(--color-alert)" : "var(--color-primary)"}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ring)}
                style={{ transition: "stroke-dashoffset .5s" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular text-primary">{Math.round(ring * 100)}%</span>
          </div>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 border-t border-surface-container pt-3 text-[13px] text-ink-variant">
        <Icon name="info" size={16} /> {sub}
      </p>
    </section>
  );
}

function PredictionCard({
  prediction,
  now,
  onRoutine,
  onSound,
}: {
  prediction: ReturnType<typeof predict>;
  now: Date;
  onRoutine: () => void;
  onSound: () => void;
}) {
  const n = prediction.next;
  if (!n) return null;
  const label = n.type === "NAP" ? `낮잠 ${n.napIndex ?? ""} 예상` : n.type === "NIGHT" ? "밤잠 예상" : "기상 예상";
  const until = diffMin(n.start, now);
  const p = prediction.personalization;
  const badge = p === "PERSONAL" ? "우리 아기 맞춤" : p === "MIXED" ? "개인화 중" : "월령 가이드";
  return (
    <section className="prediction-card rounded-[2rem] p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-primary">
          <Icon name="auto_awesome" size={18} fill /> AI 다음 수면 예측
        </span>
        <span className="rounded-full bg-card/80 px-2.5 py-1 text-[11px] font-bold text-primary">
          {badge} · 신뢰도 {Math.round(prediction.confidence * 100)}%
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="tabular text-[32px] font-bold leading-[38px] text-ink">{fmtRange(n.start, n.end)}</p>
        <span className="mb-1 rounded-full bg-alert-light px-2.5 py-0.5 text-[12px] font-bold text-error">
          {until > 0 ? `약 ${fmtDuration(until)} 남음` : diffMin(n.end, now) > 0 ? "지금이 적기예요" : "예상 시간이 지났어요"}
        </span>
      </div>
      <p className="mt-1 text-[14px] font-semibold text-ink-variant">{label}</p>
      <p className="mt-3 flex gap-2 rounded-2xl bg-card/70 p-3 text-[13px] leading-relaxed text-ink-variant">
        <Icon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-butter-ink" />
        <span>{prediction.reason}</span>
      </p>
      {prediction.schedule.length > 1 && (
        <p className="mt-2 text-[12px] text-ink-variant">
          이후 일정:{" "}
          {prediction.schedule
            .slice(1)
            .map((w) => `${w.type === "NAP" ? `낮잠 ${w.napIndex}` : "밤잠"} ${fmtTime(w.start)}`)
            .join(" · ")}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {n.type === "NIGHT" ? (
          <button onClick={onRoutine} className="press flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[15px] font-semibold text-on-primary shadow-lift">
            <Icon name="bedtime" fill /> 수면 루틴 준비하기
          </button>
        ) : (
          <button onClick={onSound} className="press flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[15px] font-semibold text-on-primary shadow-lift">
            <Icon name="music_note" fill /> 수면음 준비하기
          </button>
        )}
        <button onClick={onRoutine} aria-label="수면 루틴" className="press rounded-full bg-card px-4 text-primary">
          <Icon name="checklist" />
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-variant">예측은 참고용이에요. 아기의 졸림 신호를 함께 살펴봐 주세요.</p>
    </section>
  );
}
