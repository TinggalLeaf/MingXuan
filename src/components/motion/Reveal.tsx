
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type RevealVariant = "up" | "left" | "right" | "scale" | "none";

export interface RevealProps {
  children: ReactNode;
  /** 入场方向 */
  variant?: RevealVariant;
  /** 延迟（ms） */
  delay?: number;
  /** 额外类名 */
  className?: string;
  /** 只触发一次（默认 true） */
  once?: boolean;
  /** 触发阈值（默认 0.12） */
  threshold?: number;
}

/**
 * 滚动显现容器：进入视口时平滑浮现。
 * 用法：<Reveal variant="up" delay={120}>...</Reveal>
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  once = true,
  threshold = 0.12,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) io.disconnect();
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  const variantClass =
    variant === "left" ? "reveal-left"
    : variant === "right" ? "reveal-right"
    : variant === "scale" ? "reveal-scale"
    : "";

  const style: CSSProperties = delay
    ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties)
    : {};

  return (
    <div
      ref={ref}
      className={`reveal ${variantClass} ${revealed ? "is-revealed" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
