import type { ReactNode } from "react";
import Reveal from "@/components/motion/Reveal";

/**
 * 术数模块通用分节卡片：标题 + 内容区。
 * 用于 Taiyi / Huangji / Wuyun / Lingqian 等数据展示。
 * 默认以 Reveal 滚动显现入场（只动 transform/opacity）。
 */
export interface SectionProps {
  title: string;
  subtitle?: string;
  tone?: "gold" | "cinnabar" | "paper";
  /** 区段序号（按页面内出现顺序，如 01 / 02） */
  seq?: string;
  children: ReactNode;
  className?: string;
  /** 内容区是否使用 padding 容器（默认 true） */
  padded?: boolean;
  /** 是否启用滚动显现入场（默认 true） */
  reveal?: boolean;
  /** 入场延迟（ms），用于多卡级联 */
  revealDelay?: number;
}

const TONE_BG: Record<NonNullable<SectionProps["tone"]>, string> = {
  gold: "bg-gold-500/15 text-gold-300 border-gold-500/30",
  cinnabar: "bg-cinnabar-500/15 text-cinnabar-400 border-cinnabar-500/30",
  paper: "bg-paper-100/10 text-paper-200 border-paper-300/30",
};

export default function Section({
  title,
  subtitle,
  tone = "gold",
  seq,
  children,
  className,
  padded = true,
  reveal = true,
  revealDelay = 0,
}: SectionProps) {
  const card = (
    <section className={`panel-console ${className ?? ""}`}>
      <header className="flex flex-wrap items-baseline gap-3 border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title flex-1 text-base">
          {seq && <span className="seq">{seq}</span>}
          <span className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-bold ${TONE_BG[tone]}`}>
            {title}
          </span>
        </h2>
        {subtitle && (
          <span className="console-label text-paper-400">{subtitle}</span>
        )}
      </header>
      <div className={padded ? "px-5 py-4 sm:px-6" : ""}>{children}</div>
    </section>
  );
  if (!reveal) return card;
  return (
    <Reveal variant="up" delay={revealDelay}>
      {card}
    </Reveal>
  );
}

/** 键值对网格：标签 + 值，响应式列数。 */
export interface KeyValueGridProps {
  items: ReadonlyArray<{ label: string; value: ReactNode; tone?: "default" | "gold" | "cinnabar" | "paper" }>;
  columns?: 2 | 3 | 4;
  className?: string;
}

const TONE_TEXT: Record<NonNullable<KeyValueGridProps["items"][number]["tone"]>, string> = {
  default: "text-paper-100",
  gold: "text-gold-300",
  cinnabar: "text-cinnabar-400",
  paper: "text-paper-200",
};

const COLS_CLASS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function KeyValueGrid({ items, columns = 3, className }: KeyValueGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-6 gap-y-3 text-sm ${COLS_CLASS[columns]} ${className ?? ""}`}
    >
      {items.map((it, i) => (
        <div key={i} className="flex flex-col">
          <span className="console-label">
            {it.label}
          </span>
          <span className={`mt-0.5 ${TONE_TEXT[it.tone ?? "default"]}`}>
            {it.value ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 列表渲染：带序号。 */
export interface NumberedListProps {
  items: ReadonlyArray<{ title: string; subtitle?: string; body?: ReactNode }>;
  className?: string;
}

export function NumberedList({ items, className }: NumberedListProps) {
  return (
    <ol className={`space-y-3 ${className ?? ""}`}>
      {items.map((it, i) => (
        <li
          key={i}
          className="anim-fade-up flex gap-3 rounded-lg border border-gold-500/10 bg-ink-900/40 px-3 py-2"
          style={{ animationDelay: `${Math.min(i * 80, 480)}ms` }}
        >
          <span className="console-value mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-500/40 text-[11px]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-paper-100">{it.title}</span>
              {it.subtitle && (
                <span className="console-label text-paper-500">{it.subtitle}</span>
              )}
            </div>
            {it.body != null && (
              <div className="mt-1 text-xs text-paper-300">{it.body}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}