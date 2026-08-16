
import { useEffect, useState } from "react";
import type { BaziChartResult, Pillar } from "mingyu-core/bazi";
import type { HiddenStems } from "./types";
import { WUXING_LIST, charWuXing, type WuXing } from "@/lib/wuxing";

interface WuxingBarsProps {
  chart: BaziChartResult;
}

/**
 * 统计五行能量（天干 1 权 + 地支 1 权 + 藏干：本气 1 / 中气 0.5 / 余气 0.3），
 * 在 mingyu-core wuxingStrength 仅给出 missing/present 的情况下，
 * 给页面提供可视化所需的连续数值。
 */
function computeWeightedCounts(pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }, hidden: HiddenStems) {
  const counts: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  ([pillars.year, pillars.month, pillars.day, pillars.hour] as Pillar[]).forEach((p) => {
    const gw = charWuXing(p.gan);
    const zw = charWuXing(p.zhi);
    if (gw) counts[gw] += 1;
    if (zw) counts[zw] += 1;
  });

  // 藏干：按主流约定给首位主气满权，其它递减
  (["year", "month", "day", "hour"] as const).forEach((pos) => {
    const stems = hidden[pos] ?? [];
    const weights = [1, 0.5, 0.3];
    stems.forEach((stem, idx) => {
      const w = charWuXing(stem);
      const weight = weights[idx] ?? 0.2;
      if (w) counts[w] += weight;
    });
  });

  return counts;
}

export default function WuxingBars({ chart }: WuxingBarsProps) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const counts = computeWeightedCounts(chart.pillars, chart.hiddenStems);
  const total = WUXING_LIST.reduce((s, k) => s + (counts[k] || 0), 0) || 1;
  const present = new Set<string>(chart.wuxingStrength?.present ?? []);
  const missing = new Set<string>(chart.wuxingStrength?.missing ?? []);
  const dominant = chart.wuxingStrength?.dominantByRule ?? [];
  const commander = chart.wuxingStrength?.commanderElement;

  return (
    <section className="panel-console p-4 sm:p-6">
      <h2 className="console-title mb-4 text-base">
        <span className="seq">02</span>五行能量
      </h2>

      <div className="space-y-3">
        {WUXING_LIST.map((wx, wxIdx) => {
          const v = counts[wx] ?? 0;
          const pct = Math.round((v / total) * 100);
          const isMissing = missing.has(wx);
          const isDominant = dominant.includes(wx);
          const isCommander = commander === wx;
          const textClass = wx === "木" ? "wx-mu" : wx === "火" ? "wx-huo" : wx === "土" ? "wx-tu" : wx === "金" ? "wx-jin" : "wx-shui";
          const bgClass = wx === "木" ? "wx-bg-mu" : wx === "火" ? "wx-bg-huo" : wx === "土" ? "wx-bg-tu" : wx === "金" ? "wx-bg-jin" : "wx-bg-shui";
          return (
            <div key={wx} className="flex items-center gap-3">
              <span
                className={`gz-char anim-pop ${textClass}`}
                style={{ width: "1.4rem", fontSize: "1.1rem", animationDelay: `${wxIdx * 110}ms` }}
              >
                {wx}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-full border border-gold-500/20 bg-ink-900/60">
                <div
                  className={`absolute inset-y-0 left-0 ${bgClass} opacity-80 transition-[width] duration-700 ease-out`}
                  style={{
                    width: grown ? `${pct}%` : "0%",
                    transitionDelay: `${wxIdx * 110}ms`,
                  }}
                />
                {isCommander && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-paper-50 drop-shadow">
                    月令司权
                  </div>
                )}
              </div>
              <span className="w-24 shrink-0 text-right text-[11px] text-paper-300">
                <span className="console-value">{pct}%</span> {isMissing && <span className="text-cinnabar-400">· 缺</span>}
                {!isMissing && isDominant && <span className="text-gold-400">· 旺</span>}
                {present.size > 0 && !isMissing && !isDominant && <span className="text-paper-500">· 平</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-paper-400 sm:grid-cols-4">
        <div className="anim-fade-up rounded border border-gold-500/15 bg-ink-900/30 p-2 text-center" style={{ animationDelay: "500ms" }}>
          <div className="console-label">五行缺失</div>
          <div className="mt-1 text-cinnabar-400">
            {missing.size > 0 ? Array.from(missing).join(" ") : "无"}
          </div>
        </div>
        <div className="anim-fade-up rounded border border-gold-500/15 bg-ink-900/30 p-2 text-center" style={{ animationDelay: "580ms" }}>
          <div className="console-label">月令司权</div>
          <div className="mt-1 console-value text-gold-300">{commander ?? chart.monthCommander ?? "—"}</div>
        </div>
        <div className="anim-fade-up rounded border border-gold-500/15 bg-ink-900/30 p-2 text-center" style={{ animationDelay: "660ms" }}>
          <div className="console-label">主导五行</div>
          <div className="mt-1 text-gold-300">
            {dominant.length > 0 ? dominant.join(" ") : "—"}
          </div>
        </div>
        <div className="anim-fade-up rounded border border-gold-500/15 bg-ink-900/30 p-2 text-center" style={{ animationDelay: "740ms" }}>
          <div className="console-label">判定依据</div>
          <div className="mt-1 text-paper-300">
            {(chart.wuxingStrength?.ruleBasis ?? []).slice(0, 2).join(" · ") || "—"}
          </div>
        </div>
      </div>
    </section>
  );
}