import type { Baby } from "../lib/types";
import { ageInMonths, ageLabel } from "../lib/time";
import { ageNorm } from "../lib/predict";

export function emptyBaby(): Baby {
  return { nickname: "", birthDate: "", gender: "", usualWakeTime: "07:00", usualBedtime: "20:00", napCount: 0, daycare: false };
}

const input = "mt-2 w-full rounded-full border border-outline-variant bg-card px-4 py-3 text-[16px] text-ink placeholder:text-outline";
const label = "mt-5 block text-[14px] font-semibold text-ink";

export function BabyForm({ value, onChange }: { value: Baby; onChange: (b: Baby) => void }) {
  const set = <K extends keyof Baby>(k: K, v: Baby[K]) => onChange({ ...value, [k]: v });
  const today = new Date();
  const minDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 3);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const months = value.birthDate ? ageInMonths(value.birthDate) : null;
  const norm = months != null ? ageNorm(months) : null;

  return (
    <div>
      <label className={label} htmlFor="b-name">
        이름 또는 별명 <span className="text-primary">*</span>
      </label>
      <input id="b-name" className={input} value={value.nickname} maxLength={12} placeholder="예: 하은이, 콩콩이" onChange={(e) => set("nickname", e.target.value)} />

      <label className={label} htmlFor="b-birth">
        생년월일 <span className="text-primary">*</span>
      </label>
      <input id="b-birth" type="date" className={`${input} tabular`} value={value.birthDate} min={iso(minDate)} max={iso(today)} onChange={(e) => set("birthDate", e.target.value)} />
      {value.birthDate && (
        <p className="mt-2 px-2 text-[13px] text-primary">
          {ageLabel(value.birthDate)} · {norm?.label} 가이드로 시작해요{months! > 24 && " (24개월 이후는 19~24개월 기준으로 안내해요)"}
        </p>
      )}

      <p className={label}>성별 (선택)</p>
      <div className="mt-2 flex gap-2">
        {[
          ["F", "여아"],
          ["M", "남아"],
          ["", "선택 안 함"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => set("gender", k as Baby["gender"])}
            className={`press flex-1 rounded-full py-2.5 text-[14px] font-semibold ${value.gender === k ? "bg-primary text-on-primary" : "bg-surface-low text-ink-variant"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="b-wake">
            평소 기상
          </label>
          <input id="b-wake" type="time" className={`${input} tabular`} value={value.usualWakeTime} onChange={(e) => set("usualWakeTime", e.target.value || "07:00")} />
        </div>
        <div>
          <label className={label} htmlFor="b-bed">
            평소 취침
          </label>
          <input id="b-bed" type="time" className={`${input} tabular`} value={value.usualBedtime} onChange={(e) => set("usualBedtime", e.target.value || "20:00")} />
        </div>
      </div>

      <p className={label}>현재 하루 낮잠 횟수 (선택)</p>
      <div className="mt-2 flex gap-2">
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => set("napCount", n)}
            className={`press flex-1 rounded-full py-2.5 text-[14px] font-semibold ${value.napCount === n ? "bg-primary text-on-primary" : "bg-surface-low text-ink-variant"}`}
          >
            {n === 0 ? "모름" : `${n}회`}
          </button>
        ))}
      </div>

      <label className="mt-5 flex items-center justify-between rounded-2xl bg-surface-low px-4 py-3">
        <span>
          <span className="block text-[14px] font-semibold text-ink">어린이집에 다녀요</span>
          <span className="text-[12px] text-ink-variant">어린이집 일정 반영은 곧 지원돼요</span>
        </span>
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" checked={value.daycare} onChange={(e) => set("daycare", e.target.checked)} />
      </label>
    </div>
  );
}
