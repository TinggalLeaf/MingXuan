
import { useMemo } from "react";

/**
 * 星空背景：随机散布的闪烁星点 + 一轮晕月。
 * 用于 Hero 区装饰，pointer-events-none。
 */
export default function Starfield({ count = 36 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 73.7 + 13) % 100,
        top: (i * 41.3 + 7) % 100,
        size: 1 + ((i * 7) % 3),
        delay: (i * 0.37) % 2.8,
        dur: 2.4 + ((i * 11) % 20) / 10,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* 晕月 */}
      <div className="anim-float absolute right-[12%] top-6 h-24 w-24 rounded-full bg-gold-300/12 blur-xl" />
      <div className="absolute right-[12%] top-6 h-14 w-14 rounded-full bg-gold-300/10 blur-md" />
      {stars.map((s, i) => (
        <span
          key={i}
          className="anim-twinkle absolute rounded-full bg-gold-300"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
