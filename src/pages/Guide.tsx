import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { Header } from "../components/Layout";
import { Icon } from "../components/Icon";
import { AGE_GROUPS, GUIDES, ageGroupFor, recommendedGuides, type Guide as GuideT } from "../data/guides";
import { ageNorm } from "../lib/predict";
import { ageInMonths, fmtDuration } from "../lib/time";

const CATS = ["전체", "수면 특징", "낮잠", "밤중 각성", "루틴", "발달", "안전 수면"] as const;

export default function Guide() {
  const { baby, now } = useStore();
  const months = ageInMonths(baby!.birthDate, now);
  const myGroup = ageGroupFor(months);
  const [group, setGroup] = useState<string>(myGroup.key);
  const [cat, setCat] = useState<(typeof CATS)[number]>("전체");
  const g = AGE_GROUPS.find((x) => x.key === group)!;
  const featured = recommendedGuides(months, 1)[0];
  const list = GUIDES.filter((x) => x.ageMin <= g.max && x.ageMax >= g.min && (cat === "전체" || x.category === cat));

  return (
    <>
      <Header subtitle="월령 맞춤 수면 가이드" />
      <main className="space-y-6 px-5">
        <div>
          <span className="rounded-full bg-muted-purple px-2.5 py-1 text-[12px] font-semibold text-primary">{myGroup.label} 맞춤</span>
          <h2 className="mt-2 text-[26px] font-bold leading-[34px] text-ink">{baby!.nickname}를 위한 수면 가이드</h2>
          <p className="mt-1 text-[14px] text-ink-variant">월령과 기록에 맞춘 수면 정보를 모았어요.</p>
        </div>

        {featured && (
          <Link to={`/guide/${featured.id}`} className="press block rounded-[2rem] bg-gradient-to-br from-butter-light via-card to-muted-purple p-5 shadow-soft">
            <span className="flex items-center gap-1 text-[12px] font-semibold text-butter-ink">
              <Icon name="lightbulb" size={16} fill /> 지금 {baby!.nickname}에게 필요한 수면 정보 · 약 {featured.minutes}분
            </span>
            <p className="mt-2 text-[20px] font-bold leading-[28px] text-ink">{featured.title}</p>
            <p className="mt-2 line-clamp-2 text-[14px] text-ink-variant">{featured.summary}</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary">
              이어서 읽기 <Icon name="arrow_forward" size={18} />
            </span>
          </Link>
        )}

        <WakeWindowCard months={months} />

        <section>
          <h3 className="mb-3 text-[18px] font-bold text-ink">월령별 수면 로드맵</h3>
          <div className="scroll-x -mx-5 flex gap-2 overflow-x-auto px-5">
            {AGE_GROUPS.map((x) => (
              <button
                key={x.key}
                onClick={() => setGroup(x.key)}
                className={`press shrink-0 rounded-full px-4 py-2.5 text-[14px] font-semibold ${group === x.key ? "bg-primary text-on-primary" : "bg-card text-ink-variant shadow-soft"}`}
              >
                {x.label}
                {x.key === myGroup.key && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-butter align-middle" />}
              </button>
            ))}
          </div>
          <div className="scroll-x -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`press shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${cat === c ? "bg-night-indigo text-white" : "bg-surface-container text-ink-variant"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {list.map((x) => (
              <GuideCard key={x.id} g={x} />
            ))}
            {list.length === 0 && <p className="rounded-3xl bg-surface-low p-6 text-center text-[14px] text-ink-variant">이 조건의 가이드는 준비 중이에요.</p>}
          </div>
        </section>

        <SafeSleepCheck />

        <p className="flex items-start gap-2 px-1 pb-4 text-[12px] leading-relaxed text-ink-variant">
          <Icon name="verified_user" size={16} className="shrink-0" />
          가이드는 공신력 있는 소아 수면·안전수면 지침을 바탕으로 정리했으며, 출시 전 소아청소년과 전문의 검토를 거칠 예정이에요. 개별 아이의 진단 기준으로 사용하지 마세요.
        </p>
      </main>
    </>
  );
}

function GuideCard({ g }: { g: GuideT }) {
  return (
    <Link to={`/guide/${g.id}`} className="press block rounded-3xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="rounded-full bg-muted-purple px-2 py-0.5 font-semibold text-primary">{g.category}</span>
        <span className="flex items-center gap-0.5 text-ink-variant">
          <Icon name="schedule" size={14} /> {g.minutes}분
        </span>
      </div>
      <p className="mt-2 text-[16px] font-bold leading-snug text-ink">{g.title}</p>
      <p className="mt-1 text-[13px] text-ink-variant">{g.summary}</p>
    </Link>
  );
}

function WakeWindowCard({ months }: { months: number }) {
  const rows = [
    { label: "4~6개월", m: 5 },
    { label: "7~9개월", m: 8 },
    { label: "10~12개월", m: 11 },
    { label: "13~18개월", m: 15 },
  ];
  const mine = ageNorm(months);
  return (
    <section className="rounded-[2rem] bg-card p-5 shadow-soft">
      <span className="rounded-full bg-sage-light px-2 py-0.5 text-[12px] font-semibold text-sage-ink">한눈에 보기</span>
      <h3 className="mt-2 text-[17px] font-bold text-ink">적정 깨어있는 시간(Wake Window)</h3>
      <p className="mt-1 text-[13px] text-ink-variant">
        지금 {mine.label}: <b className="text-primary">{fmtDuration(mine.wwMin)}~{fmtDuration(mine.wwMax)}</b>, 낮잠 {mine.naps}회 내외
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {rows.map((r) => {
          const n = ageNorm(r.m);
          const active = n.label === mine.label;
          return (
            <div key={r.label} className={`rounded-2xl px-1 py-2.5 text-center ${active ? "bg-muted-purple ring-2 ring-primary" : "bg-surface-low"}`}>
              <p className="text-[11px] text-ink-variant">{r.label}</p>
              <p className={`mt-0.5 text-[12px] font-bold leading-tight ${active ? "text-primary" : "text-ink"}`}>
                {(n.wwMin / 60).toFixed(1)}~{(n.wwMax / 60).toFixed(1)}h
              </p>
            </div>
          );
        })}
      </div>
      <Link to="/guide/wake-window-table" className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-primary">
        전체 월령 조견표 열기 <Icon name="chevron_right" size={18} />
      </Link>
    </section>
  );
}

const CHECKS = [
  "등을 대고 바로 눕혀 재워요",
  "단단하고 평평한 매트리스 · 몸에 맞는 시트",
  "베개, 이불, 범퍼, 인형 없는 빈 침대",
  "같은 방, 다른 침대 (침대 공유 피하기)",
  "덥지 않게 입히고 머리·얼굴은 덮지 않아요",
];

function SafeSleepCheck() {
  const [checked, setChecked] = useState<boolean[]>(() => CHECKS.map(() => false));
  const done = checked.filter(Boolean).length;
  return (
    <section className="rounded-[2rem] border-2 border-sage/40 bg-sage-light p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[18px] font-bold text-sage-ink">
          <Icon name="shield" fill /> 안전 수면 퀵 체크
        </h3>
        <span className="text-[12px] font-semibold text-sage-ink">
          {done}/{CHECKS.length}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-sage-ink/90">영아돌연사증후군(SIDS) 위험을 줄이는 기본 원칙이에요.</p>
      <ul className="mt-3 space-y-2">
        {CHECKS.map((c, i) => (
          <li key={c}>
            <button
              onClick={() => setChecked((arr) => arr.map((v, j) => (j === i ? !v : v)))}
              className="press flex w-full items-center gap-3 rounded-full bg-card px-4 py-2.5 text-left text-[14px] text-ink"
            >
              <Icon name={checked[i] ? "check_circle" : "radio_button_unchecked"} fill={checked[i]} className={checked[i] ? "text-sage-ink" : "text-outline"} />
              {c}
            </button>
          </li>
        ))}
      </ul>
      <Link to="/guide/safe-sleep" className="press mt-3 block rounded-full border-2 border-sage-ink/30 bg-card py-2.5 text-center text-[14px] font-semibold text-sage-ink">
        안전 수면 가이드 전체 보기
      </Link>
    </section>
  );
}

export function GuideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const g = GUIDES.find((x) => x.id === id);
  if (!g)
    return (
      <main className="px-5 pt-10 text-center">
        <p className="text-ink-variant">가이드를 찾을 수 없어요.</p>
        <Link to="/guide" className="mt-4 inline-block font-semibold text-primary">
          가이드 목록으로
        </Link>
      </main>
    );
  return (
    <main className="px-5 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
      <button onClick={() => navigate(-1)} aria-label="뒤로" className="press -ml-2 rounded-full p-2 text-ink-variant">
        <Icon name="arrow_back" />
      </button>
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        <span className="rounded-full bg-muted-purple px-2 py-0.5 font-semibold text-primary">{g.category}</span>
        <span className="text-ink-variant">
          {g.ageMin}~{g.ageMax}개월 · {g.minutes}분
        </span>
      </div>
      <h1 className="mt-3 text-[26px] font-bold leading-[34px] text-ink">{g.title}</h1>
      <p className="mt-2 text-[16px] font-medium text-primary">{g.summary}</p>
      <article className="mt-6 space-y-4">
        {g.body.map((p, i) => (
          <p key={i} className="text-[16px] leading-[27px] text-ink">
            {p}
          </p>
        ))}
      </article>
      {g.tips && (
        <div className="mt-6 rounded-3xl bg-butter-light p-4">
          <p className="flex items-center gap-1 text-[14px] font-bold text-butter-ink">
            <Icon name="tips_and_updates" size={18} fill /> 이렇게 해보세요
          </p>
          <ul className="mt-2 space-y-1.5">
            {g.tips.map((t) => (
              <li key={t} className="text-[14px] leading-relaxed text-ink">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link
        to={`/coach?q=${encodeURIComponent(`"${g.title}" 내용을 우리 아기 기록에 맞춰 설명해줘`)}`}
        className="press mt-6 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[15px] font-semibold text-on-primary"
      >
        <Icon name="forum" /> AI 코치에게 우리 아기 상황으로 물어보기
      </Link>
      <p className="mt-6 text-[12px] text-ink-variant">출처: {g.source}</p>
    </main>
  );
}
