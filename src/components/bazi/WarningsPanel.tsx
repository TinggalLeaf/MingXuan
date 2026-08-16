
import type { BaziChartResult } from "mingyu-core/bazi";

interface WarningsPanelProps {
  chart: BaziChartResult;
}

function classifyShenSha(name: string): "auspicious" | "inauspicious" | "neutral" {
  const auspicious = ["天乙", "天德", "月德", "天赦", "禄神", "驿马", "太极", "将星", "学堂", "词馆", "国印", "天德合", "月德合", "文昌", "华盖", "天医", "金舆", "天厨", "福星", "德秀", "拱禄", "天喜", "红鸾", "三奇"];
  const inauspicious = ["灾煞", "劫煞", "亡神", "羊刃", "飞刃", "血刃", "流霞", "天罗", "地网", "孤辰", "寡宿", "勾绞", "红艳", "十恶大败", "元辰", "披麻", "丧门", "吊客", "金神", "孤鸾", "阴差阳错", "天转", "地转", "童子煞", "九丑", "四废"];
  for (const k of auspicious) if (name.includes(k)) return "auspicious";
  for (const k of inauspicious) if (name.includes(k)) return "inauspicious";
  return "neutral";
}

function badgeClass(t: "auspicious" | "inauspicious" | "neutral"): string {
  if (t === "auspicious") return "border-gold-500/45 bg-gold-500/10 text-gold-300";
  if (t === "inauspicious") return "border-cinnabar-500/45 bg-cinnabar-500/10 text-cinnabar-400";
  return "border-paper-500/30 bg-paper-500/10 text-paper-300";
}

export default function WarningsPanel({ chart }: WarningsPanelProps) {
  // 汇总各柱神煞 + 全局神煞
  const seen = new Map<string, "auspicious" | "inauspicious" | "neutral">();
  (["year", "month", "day", "hour"] as const).forEach((pos) => {
    (chart.shenShaAnalysis?.[pos] ?? []).forEach((s) => {
      if (!seen.has(s)) seen.set(s, classifyShenSha(s));
    });
  });
  (chart.shenShaAnalysis?.global ?? []).forEach((s) => {
    if (!seen.has(s)) seen.set(s, classifyShenSha(s));
  });
  const allShenSha = Array.from(seen.entries()).sort((a, b) => {
    const order = { auspicious: 0, neutral: 1, inauspicious: 2 };
    return order[a[1]] - order[b[1]] || a[0].localeCompare(b[0]);
  });

  const kongWangPillars = (["year", "month", "day", "hour"] as const)
    .map((pos) => ({ pos, zh: chart.kongWang?.[pos] ?? [] }))
    .filter((p) => p.zh.length > 0);

  const warnings = chart.warnings ?? [];
  const hasAnything = allShenSha.length > 0 || kongWangPillars.length > 0 || warnings.length > 0;

  return (
    <section className="panel-console p-4 sm:p-6">
      <h2 className="console-title mb-4 text-base">
        <span className="seq">05</span>神煞 · 空亡 · 排盘提示
      </h2>

      {!hasAnything && (
        <p className="text-sm text-paper-400">当前盘面无显著神煞、空亡与边界提示。</p>
      )}

      {allShenSha.length > 0 && (
        <div className="mb-4">
          <div className="console-label mb-2">
            神煞汇总（<span className="console-value">{allShenSha.length}</span> 项）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allShenSha.map(([name, kind], sIdx) => (
              <span
                key={name}
                className={`anim-pop rounded border px-2 py-0.5 text-[11px] ${badgeClass(kind)}`}
                style={{ animationDelay: `${Math.min(sIdx * 55, 600)}ms` }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {kongWangPillars.length > 0 && (
        <div className="mb-4 rounded-lg border border-cinnabar-500/20 bg-cinnabar-500/5 p-3">
          <div className="console-label mb-2 text-cinnabar-400">空亡（地支虚位）</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kongWangPillars.map((p, pIdx) => (
              <div key={p.pos} className="anim-fade-up rounded border border-cinnabar-500/20 bg-ink-900/40 p-2" style={{ animationDelay: `${pIdx * 90}ms` }}>
                <div className="console-label">
                  {p.pos === "year" ? "年柱空亡" : p.pos === "month" ? "月柱空亡" : p.pos === "day" ? "日柱空亡" : "时柱空亡"}
                </div>
                <div className="mt-0.5 font-bold console-value text-cinnabar-400">{p.zh.join(" ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-paper-500/30 bg-ink-900/40 p-3">
          <div className="console-label mb-2">排盘提示</div>
          <ul className="space-y-1 text-[11px] leading-relaxed text-paper-200">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gold-400">·</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {chart.warningSummaryFact && chart.warningSummaryFact.status !== "无预警" && (
        <p className="mt-3 text-[11px] text-paper-400">{chart.warningSummaryFact.promptText}</p>
      )}
    </section>
  );
}