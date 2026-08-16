import type { ReactNode } from "react";

interface MethodChipsProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; desc?: string }>;
  extra?: ReactNode;
}

export default function MethodChips<T extends string>({
  label,
  value,
  onChange,
  options,
  extra,
}: MethodChipsProps<T>) {
  return (
    <section className="panel-console p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="console-label text-paper-400">{label}</span>
        {extra}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            type="button"
            key={opt.value}
            className={`tab-chip text-xs ${value === opt.value ? "is-active" : ""}`}
            onClick={() => onChange(opt.value)}
            title={opt.desc}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}