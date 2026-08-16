
/**
 * 人生K线 · 摘要卡
 * 命主信息、四柱五行色大字、日主旺衰、用神、一生均分/峰/谷
 */

import type { BaziChartResult } from "mingyu-core/bazi";
import { charWuxingClass, ganWuXing, zhiWuXing } from "@/lib/wuxing";
import type { KLineEngineResult } from "@/lib/kline/types";

export interface SummaryHeaderProps {
  chart: BaziChartResult;
  summary: KLineEngineResult["summary"];
  name?: string;
}

export default function SummaryHeader({ chart, summary, name }: SummaryHeaderProps) {
  const pillars = [
    { label: "年柱", p: chart.pillars.year },
    { label: "月柱", p: chart.pillars.month },
    { label: "日柱", p: chart.pillars.day },
    { label: "时柱", p: chart.pillars.hour },
  ];
  const dmGan = chart.dayMaster.gan;
  const dmWx = ganWuXing(dmGan) ?? "土";
  const strength = chart.analysis?.dayMasterStrength?.status ?? "—";
  const useful = chart.analysis?.usefulGod?.useful ?? "—";
  const avoid = chart.analysis?.usefulGod?.avoid ?? "—";

  return (
    <section className="panel-console hud-frame space-y-5 p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-gold-500/15 pb-3">
        <div>
          <div className="console-label">
            命主 · SUBJECT
          </div>
          <h2 className="mt-1 text-2xl font-bold text-gold-300">
            <span className="console-value">{name || "匿名"}</span>
            <span className="ml-2 text-sm text-paper-400">
              {chart.gender === "male" ? "乾造" : "坤造"} ·{" "}
              <span className="console-value">{chart.solarDate.year}.{chart.solarDate.month}.{chart.solarDate.day}</span>
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="hud-chip">
            <span className="hud-dot" />
            LIFE-INDEX
          </span>
          <span className="hud-chip">百年跨度</span>
          <span className="seal anim-seal">人生百年</span>
          <span className="console-value text-paper-400">
            {chart.solarDate.year} – {chart.solarDate.year + 99}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3">
        {pillars.map(({ label, p }, i) => (
          <div
            key={label}
            className="anim-pop rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-3 text-center"
            style={{ animationDelay: `${i * 110}ms` }}
          >
            <div className="console-label">{label}</div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className={`gz-char ${charWuxingClass(p.gan)}`}>
                {p.gan}
              </span>
              <span className={`gz-char ${charWuxingClass(p.zhi)}`}>
                {p.zhi}
              </span>
            </div>
            <div className="mt-1 console-value text-[10px]">
              {ganWuXing(p.gan) ?? ""}/{zhiWuXing(p.zhi) ?? ""}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">日主</div>
          <div className="text-lg font-bold text-paper-50">
            <span className={charWuxingClass(dmGan)}>{dmGan}</span>
            <span className="ml-2 text-sm console-value text-paper-300">{dmWx}</span>
          </div>
        </div>
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">旺衰</div>
          <div className="text-base font-bold text-gold-300">{strength}</div>
        </div>
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">用神</div>
          <div className="text-base font-bold text-jade-400">{useful}</div>
        </div>
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">忌神</div>
          <div className="text-base font-bold text-cinnabar-400">{avoid}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="anim-fade-up rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2"
          style={{ animationDelay: "120ms" }}
        >
          <div className="console-label">百年均分</div>
          <div className="text-2xl font-bold console-value text-paper-50">
            {summary.averageScore}
          </div>
          <div className="text-[10px] text-paper-500">综合 0-100</div>
        </div>
        <div
          className="anim-fade-up rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2"
          style={{ animationDelay: "240ms" }}
        >
          <div className="console-label">最高峰</div>
          <div className="text-base font-bold text-gold-300">
            <span className="console-value">{summary.peak.year}</span> · {summary.peak.ganZhi}（<span className="console-value">{summary.peak.age}</span> 岁）
          </div>
          <div className="text-[10px] text-paper-500">均分 <span className="console-value">{summary.peak.score}</span></div>
        </div>
        <div
          className="anim-fade-up rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2"
          style={{ animationDelay: "360ms" }}
        >
          <div className="console-label">最低谷</div>
          <div className="text-base font-bold text-cinnabar-400">
            <span className="console-value">{summary.valley.year}</span> · {summary.valley.ganZhi}（<span className="console-value">{summary.valley.age}</span> 岁）
          </div>
          <div className="text-[10px] text-paper-500">均分 <span className="console-value">{summary.valley.score}</span></div>
        </div>
      </div>
    </section>
  );
}
