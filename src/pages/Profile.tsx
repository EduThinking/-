import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useSound } from "../components/SoundProvider";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { BabyForm } from "../components/BabyForm";
import { aiStatus } from "../lib/api";
import type { Baby, Settings } from "../lib/types";

export default function Profile() {
  const { baby, setBaby, settings, updateSettings, exportData, resetAll, events } = useStore();
  const snd = useSound();
  const toast = useToast();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Baby>(baby!);
  const [ai, setAi] = useState<{ ai: boolean; model: string | null } | null>(null);
  const [perm, setPerm] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const dirty = JSON.stringify(draft) !== JSON.stringify(baby);

  useEffect(() => {
    aiStatus().then(setAi);
  }, []);

  const toggle = (k: keyof Settings) => updateSettings({ [k]: !settings[k] } as Partial<Settings>);

  const askPermission = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `baby-sleep-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-5 px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="뒤로" className="press -ml-2 rounded-full p-2 text-ink-variant">
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-[22px] font-bold text-ink">아기 정보 · 설정</h1>
      </div>

      <section className="rounded-[2rem] bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
          <Icon name="child_care" className="text-primary" /> 아기 정보
        </h2>
        <BabyForm value={draft} onChange={setDraft} />
        <button
          disabled={!dirty || !draft.nickname.trim() || !draft.birthDate}
          onClick={() => {
            setBaby({ ...draft, nickname: draft.nickname.trim() });
            toast({ message: "아기 정보를 저장했어요.", detail: "예측에 바로 반영돼요." });
          }}
          className="press mt-5 w-full rounded-full bg-primary py-3.5 text-[15px] font-semibold text-on-primary disabled:opacity-40"
        >
          저장
        </button>
      </section>

      <section className="rounded-[2rem] bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
          <Icon name="notifications" className="text-primary" /> 알림
        </h2>
        <Toggle label="예상 낮잠 15분 전" desc="다음 낮잠이 가까워지면 알려드려요" on={settings.notifyNap} onClick={() => toggle("notifyNap")} />
        <Toggle label="수면 루틴 시작 시간" desc="예상 밤잠에서 루틴 시간만큼 앞서 알려요" on={settings.notifyRoutine} onClick={() => toggle("notifyRoutine")} />
        <Toggle label="밤잠 준비 (30분 전)" desc="루틴 알림이 꺼져 있을 때 사용돼요" on={settings.notifyBedtime} onClick={() => toggle("notifyBedtime")} />
        {perm !== "granted" && perm !== "unsupported" && (
          <button onClick={askPermission} className="press mt-3 w-full rounded-full bg-muted-purple py-3 text-[14px] font-semibold text-primary">
            휴대폰 알림도 받기 (권한 허용)
          </button>
        )}
        <p className="mt-2 text-[12px] text-ink-variant">앱이 열려 있을 때 화면 안내와 함께, 권한을 허용하면 백그라운드 탭에서도 알림을 보내요.</p>
      </section>

      <section className="rounded-[2rem] bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
          <Icon name="tune" className="text-primary" /> 환경
        </h2>
        <Toggle label="야간 모드" desc="어두운 방에서 눈부심을 줄여요" on={settings.nightMode} onClick={() => toggle("nightMode")} />
        <div className="mt-4">
          <div className="flex justify-between text-[14px]">
            <span className="font-semibold text-ink">기본 볼륨</span>
            <span className="tabular text-ink-variant">{Math.round(settings.defaultVolume * 100)}%</span>
          </div>
          <input
            aria-label="기본 볼륨"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.defaultVolume * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              updateSettings({ defaultVolume: v });
              snd.setVolume(v);
            }}
            className="slider mt-3 w-full"
            style={{ ["--val" as any]: `${Math.round(settings.defaultVolume * 100)}%` }}
          />
        </div>
        <Link to="/routine" className="press mt-4 flex items-center justify-between rounded-2xl bg-surface-low px-4 py-3 text-[14px] font-semibold text-ink">
          <span className="flex items-center gap-2">
            <Icon name="checklist" className="text-primary" /> 수면 루틴 편집
          </span>
          <Icon name="chevron_right" />
        </Link>
      </section>

      <section className="rounded-[2rem] bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
          <Icon name="group" className="text-primary" /> 가족 공유 · 어린이집 모드
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-variant">배우자·조부모와 함께 기록하는 가족 공유와 어린이집 일정 반영은 다음 업데이트에서 제공될 예정이에요.</p>
        <span className="mt-3 inline-block rounded-full bg-butter-light px-3 py-1 text-[12px] font-semibold text-butter-ink">준비 중</span>
      </section>

      <section className="rounded-[2rem] bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
          <Icon name="lock" className="text-primary" /> 개인정보 · 데이터
        </h2>
        <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-variant">
          <li>· 모든 기록({events.length}건)은 이 기기의 브라우저에만 저장돼요.</li>
          <li>· 음성 원본은 저장하지 않아요. 인식된 문장만 기록 해석에 사용해요.</li>
          <li>· AI 코치에는 별명·월령·오늘의 요약 등 꼭 필요한 정보만 보내요. 생년월일은 보내지 않아요.</li>
        </ul>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-low px-4 py-3 text-[13px]">
          <Icon name={ai?.ai ? "cloud_done" : "cloud_off"} size={18} className={ai?.ai ? "text-sage-ink" : "text-outline"} />
          <span className="text-ink-variant">{ai == null ? "AI 연결 확인 중…" : ai.ai ? `AI 연결됨 (${ai.model})` : "AI 키 없음 · 기록 기반 기본 코치로 동작 중"}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={download} className="press flex items-center justify-center gap-1 rounded-full bg-muted-purple py-3 text-[14px] font-semibold text-primary">
            <Icon name="download" size={18} /> 내보내기
          </button>
          <button
            onClick={() => {
              if (confirm("아기 정보와 모든 수면 기록을 삭제할까요? 되돌릴 수 없어요.")) {
                snd.stop();
                resetAll();
                navigate("/");
              }
            }}
            className="press flex items-center justify-center gap-1 rounded-full bg-alert-light py-3 text-[14px] font-semibold text-error"
          >
            <Icon name="delete_forever" size={18} /> 모든 데이터 삭제
          </button>
        </div>
      </section>

      <p className="px-2 text-center text-[11px] leading-relaxed text-ink-variant">
        Baby Sleep Coach는 의료기기나 수면장애 진단 서비스가 아니며, 생활 기록·교육·의사결정 지원을 위한 앱이에요.
      </p>
    </main>
  );
}

function Toggle({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className="mt-3 flex w-full items-center gap-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        <span className="block text-[12px] text-ink-variant">{desc}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-surface-high"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}
