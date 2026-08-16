import type { ReactNode } from "react";

/**
 * 术数模块操作条：年份输入 + 主按钮。
 * 默认当前年，可被父级 controlled 覆盖。
 */
export interface ActionBarProps {
  year: number;
  onYearChange: (year: number) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  yearRange?: { min: number; max: number };
  extra?: ReactNode;
}

export default function ActionBar({
  year,
  onYearChange,
  onSubmit,
  loading,
  submitLabel = "起卦推演",
  yearRange,
  extra,
}: ActionBarProps) {
  const min = yearRange?.min ?? 1900;
  const max = yearRange?.max ?? 2100;

  return (
    <section className="anim-fade-up panel-console mx-auto mt-2 flex max-w-5xl flex-col items-stretch gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6" style={{ animationDelay: "180ms" }}>
      <label className="flex items-center gap-2 text-sm text-paper-300">
        <span className="console-label shrink-0">YEAR · 年份</span>
        <input
          type="number"
          min={min}
          max={max}
          value={year}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onYearChange(Math.max(min, Math.min(max, Math.round(v))));
          }}
          className="input-xuan w-28 text-center font-mono"
        />
        <span className="console-label text-paper-500">公元年</span>
      </label>
      {extra}
      <div className="flex-1" />
      <button
        type="button"
        className="btn-gold"
        disabled={loading}
        onClick={onSubmit}
      >
        {loading ? "推演中…" : submitLabel}
      </button>
    </section>
  );
}