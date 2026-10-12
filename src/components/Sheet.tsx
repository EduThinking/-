import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="닫기" className="absolute inset-0 bg-night-indigo/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-rise relative max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[2rem] bg-card px-5 pb-8 pt-3 shadow-soft">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-ink">{title}</h2>
          <button aria-label="닫기" onClick={onClose} className="press rounded-full p-2 text-ink-variant hover:bg-surface-low">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
