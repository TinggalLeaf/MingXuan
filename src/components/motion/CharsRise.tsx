
import { useEffect, useState } from "react";

export interface CharsRiseProps {
  text: string;
  /** 每字延迟步长（ms） */
  step?: number;
  base?: number;
  className?: string;
}

/**
 * 标题逐字浮现（书法感入场）。
 * 用法：<CharsRise text="排盘" step={120} />
 */
export default function CharsRise({ text, step = 90, base = 0, className = "" }: CharsRiseProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <span className={className} aria-label={text}>
      {mounted
        ? Array.from(text).map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className="anim-char-rise inline-block"
              style={{ animationDelay: `${base + i * step}ms` }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))
        : text}
    </span>
  );
}
