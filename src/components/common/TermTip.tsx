import { useEffect, useRef, useState, type CSSProperties } from "react";
import { explainTerm } from "@/lib/explain";

export interface TermTipProps {
  /** 术语原文（如「正官」「帝旺」「天乙贵人」） */
  term: string;
  /** 显式传入的白话解释；省略时自动查 src/lib/explain.ts 各字典 */
  text?: string;
  /** 追加到触发元素上的类名（用于保留徽章等原有样式） */
  className?: string;
  /** 触发元素的内联样式（如入场动画延迟） */
  style?: CSSProperties;
}

/**
 * 术语白话提示：虚线下划线的术语，悬浮或点击弹出口语化解释气泡。
 * - 桌面端：CSS group-hover 即显；
 * - 移动端：点击切换（再点或点击他处关闭）。
 * 查不到解释时退化为普通文本，不带下划线与交互。
 */
export default function TermTip({ term, text, className = "", style }: TermTipProps) {
  const explanation = text ?? explainTerm(term);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  if (!explanation) {
    return <span className={className} style={style}>{term}</span>;
  }

  return (
    <span
      ref={rootRef}
      className={`group/term relative inline-block cursor-help ${className}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      <span className="border-b border-dashed border-cyber-400/50 pb-px">
        {term}
      </span>
      <span
        className={`card-xuan pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg p-3 text-left text-[11px] font-normal leading-relaxed text-paper-200 shadow-xl shadow-ink-950/60 transition-all duration-150 ${
          open
            ? "visible opacity-100"
            : "invisible opacity-0 group-hover/term:visible group-hover/term:opacity-100"
        }`}
      >
        <span className="console-label mb-1 flex items-center gap-1.5 text-cyber-300">
          <span className="hud-dot" />
          GLOSS · 白话 · {term}
        </span>
        {explanation}
        {/* 小三角 */}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-gold-500/20" />
      </span>
    </span>
  );
}
