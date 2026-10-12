import { useState } from "react";
import { useStore } from "../store";
import { Icon } from "../components/Icon";
import { BabyForm, emptyBaby } from "../components/BabyForm";
import type { Baby } from "../lib/types";

export default function Onboarding() {
  const { setBaby, loadDemo } = useStore();
  const [step, setStep] = useState<0 | 1>(0);
  const [draft, setDraft] = useState<Baby>(emptyBaby());

  if (step === 0)
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pb-10 pt-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary text-4xl shadow-lift">🌙</div>
        <h1 className="mt-8 text-[30px] font-bold leading-[38px] text-ink">
          우리 아기,
          <br />
          다음엔 언제 재우면 좋을까?
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-variant">
          버튼 한 번, 말 한마디로 수면을 기록하면
          <br />
          월령과 실제 패턴을 분석해 <b className="text-primary">다음 낮잠·밤잠 시간</b>을 알려드려요.
        </p>
        <ul className="mt-8 space-y-3">
          {[
            ["touch_app", "3초 기록", "큰 버튼과 음성으로 바로 기록"],
            ["auto_awesome", "다음 잠 예측", "월령 가이드 + 우리 아기 기록"],
            ["music_note", "수면 루틴 · 소리", "자장가, 백색소음, 자연음"],
            ["forum", "AI 수면 코치", "기록을 바탕으로 질문에 답해요"],
          ].map(([icon, t, d]) => (
            <li key={t} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-purple text-primary">
                <Icon name={icon} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{t}</p>
                <p className="text-[13px] text-ink-variant">{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-10">
          <button onClick={() => setStep(1)} className="press w-full rounded-full bg-primary py-4 text-[17px] font-semibold text-on-primary shadow-lift">
            우리 아기 등록하기
          </button>
          <button onClick={loadDemo} className="press mt-3 w-full rounded-full bg-muted-purple py-4 text-[16px] font-semibold text-primary">
            샘플 데이터로 둘러보기
          </button>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-variant">
            기록은 이 기기에만 저장돼요. 실명 대신 별명을 사용해도 괜찮아요.
            <br />이 앱은 의료 진단 서비스가 아닌 수면 관리 도우미예요.
          </p>
        </div>
      </main>
    );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-6 pb-10 pt-8">
      <button onClick={() => setStep(0)} aria-label="뒤로" className="press -ml-2 rounded-full p-2 text-ink-variant">
        <Icon name="arrow_back" />
      </button>
      <h1 className="mt-2 text-[26px] font-bold text-ink">아기 정보를 알려주세요</h1>
      <p className="mt-1 text-[14px] text-ink-variant">별명과 생년월일만 있으면 시작할 수 있어요.</p>
      <BabyForm value={draft} onChange={setDraft} />
      <button
        disabled={!draft.nickname.trim() || !draft.birthDate}
        onClick={() => setBaby({ ...draft, nickname: draft.nickname.trim() })}
        className="press mt-8 w-full rounded-full bg-primary py-4 text-[17px] font-semibold text-on-primary shadow-lift disabled:opacity-40 disabled:shadow-none"
      >
        시작하기
      </button>
    </main>
  );
}
