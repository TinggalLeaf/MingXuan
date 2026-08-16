
import type { BaziChartResult, Pillar } from "mingyu-core/bazi";
import { charWuxingClass } from "@/lib/wuxing";
import TermTip from "@/components/common/TermTip";
import { TEN_GOD_EXPLAIN, LIFE_STAGE_EXPLAIN, NAYIN_EXPLAIN, SHENSHA_EXPLAIN, explainOf } from "@/lib/explain";

type Position = "year" | "month" | "day" | "hour";

interface PillarTableProps {
  chart: BaziChartResult;
}

const POSITION_LABELS: Record<Position, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
};

const POSITION_GAN_LABELS: Record<Position, string> = {
  year: "年干",
  month: "月干",
  day: "日干（主）",
  hour: "时干",
};

/**
 * 已知"吉神/中性/凶煞"的轻量分类。完整分类由 mingyu-core 神煞系统决定，
 * 这里只取首字启发式作为视觉标记。
 */
function classifyShenSha(name: string): "auspicious" | "inauspicious" | "neutral" {
  const auspicious = ["天乙", "天德", "月德", "天赦", "禄神", "驿马", "太极", "将星", "学堂", "词馆", "国印", "天德合", "月德合", "文昌", "华盖", "天医", "金舆", "天厨", "福星", "德秀", "拱禄", "天喜", "红鸾", "三奇"];
  const inauspicious = ["灾煞", "劫煞", "亡神", "羊刃", "飞刃", "血刃", "流霞", "天罗", "地网", "孤辰", "寡宿", "勾绞", "红艳", "十恶大败", "元辰", "披麻", "丧门", "吊客", "金神", "孤鸾", "阴差阳错", "天转", "地转", "童子煞", "九丑", "四废"];
  for (const k of auspicious) if (name.includes(k)) return "auspicious";
  for (const k of inauspicious) if (name.includes(k)) return "inauspicious";
  return "neutral";
}

function shenShaBadgeClass(t: "auspicious" | "inauspicious" | "neutral"): string {
  if (t === "auspicious") return "border-gold-500/45 bg-gold-500/10 text-gold-300";
  if (t === "inauspicious") return "border-cinnabar-500/45 bg-cinnabar-500/10 text-cinnabar-400";
  return "border-paper-500/30 bg-paper-500/10 text-paper-300";
}

function kongWangMarkClass(inKongWang: boolean): string {
  return inKongWang
    ? "border border-cinnabar-500/60 text-cinnabar-400 bg-cinnabar-500/10"
    : "border border-paper-500/20 text-paper-400 bg-ink-900/40";
}

export default function PillarTable({ chart }: PillarTableProps) {
  const positions: Position[] = ["year", "month", "day", "hour"];
  const { pillars, hiddenStems, hiddenTenGods, tenGods, nayin, lifeStages, ziZuo, kongWang, shenShaAnalysis } = chart;

  // 空亡以日柱旬空为准（日主所在旬），兼顾年柱旬空
  const kongWangSet = new Set<string>([
    ...(kongWang?.day ?? []),
    ...(kongWang?.year ?? []),
  ]);

  const globalShenSha = shenShaAnalysis?.global ?? [];

  return (
    <section className="panel-console hud-frame p-4 sm:p-6">
      <h2 className="console-title mb-4 text-base">
        <span className="seq">01</span>四柱命盘
      </h2>

      {/* 移动端：单列堆叠；桌面：四列网格 */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-4">
        {positions.map((pos, posIdx) => {
          const p: Pillar = pillars[pos];
          const hidden = hiddenStems[pos] ?? [];
          const hiddenTGs = hidden.map((_, idx) => hiddenTenGods?.[pos]?.[idx] ?? "");
          const shenSha = shenShaAnalysis?.[pos] ?? [];
          const inKongWang = kongWangSet.has(p.zhi);
          const wxClass = charWuxingClass(p.zhi);
          const colDelay = 150 * (posIdx + 1);

          return (
            <div
              key={pos}
              className="anim-fade-up rounded-xl border border-gold-500/15 bg-ink-900/40 p-3 sm:p-4"
              style={{ animationDelay: `${colDelay}ms` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="console-label">
                  {POSITION_LABELS[pos]}
                </span>
                {inKongWang && (
                  <TermTip
                    term="空亡"
                    className={`rounded px-1.5 py-0.5 text-[10px] tracking-widest ${kongWangMarkClass(true)}`}
                  />
                )}
              </div>

              {/* 天干大字 + 十神 */}
              <div className="mb-3 text-center">
                <div
                  className={`gz-char anim-pop ${charWuxingClass(p.gan)}`}
                  style={{ animationDelay: `${colDelay + 120}ms` }}
                >
                  {p.gan}
                </div>
                <div className="mt-1 text-[11px] text-paper-300">
                  {POSITION_GAN_LABELS[pos]}
                </div>
                <div className="mt-0.5 text-[11px] text-gold-400">
                  十神 · <TermTip term={tenGods?.[pos] ?? "—"} text={explainOf(TEN_GOD_EXPLAIN, tenGods?.[pos] ?? "")} />
                </div>
              </div>

              {/* 分隔 */}
              <div className="my-2 h-px bg-gold-500/15" />

              {/* 地支大字 + 十神 */}
              <div className="mb-3 text-center">
                <div
                  className={`gz-char anim-pop ${wxClass}`}
                  style={{ animationDelay: `${colDelay + 220}ms` }}
                >
                  {p.zhi}
                </div>
                <div className="mt-0.5 text-[11px] text-gold-400">
                  支十神 · <TermTip term={hiddenTenGods?.[pos]?.[0] ?? "—"} text={explainOf(TEN_GOD_EXPLAIN, hiddenTenGods?.[pos]?.[0] ?? "")} />
                </div>
              </div>

              {/* 藏干 */}
              <div className="mb-2">
                <div className="console-label mb-1">藏干</div>
                <div className="flex flex-wrap gap-1.5">
                  {hidden.length === 0 && <span className="text-[11px] text-paper-500">—</span>}
                  {hidden.map((h, idx) => {
                    const tg = hiddenTGs[idx];
                    return (
                      <span
                        key={`${h}-${idx}`}
                        className="inline-flex items-center gap-1 rounded border border-gold-500/20 bg-ink-800/60 px-1.5 py-0.5 text-[11px]"
                      >
                        <span className={`${charWuxingClass(h)} font-bold`}>{h}</span>
                        <TermTip term={tg ?? ""} text={explainOf(TEN_GOD_EXPLAIN, tg ?? "")} className="text-paper-400" />
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 纳音 + 星运 + 自坐 */}
              <dl className="space-y-1 text-[11px] text-paper-300">
                <div className="flex items-center justify-between">
                  <dt className="console-label">纳音</dt>
                  <dd><TermTip term={nayin?.[pos] ?? "—"} text={explainOf(NAYIN_EXPLAIN, nayin?.[pos] ?? "")} /></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="console-label">星运</dt>
                  <dd><TermTip term={lifeStages?.[`${pos}Pillar`] ?? lifeStages?.[`${pos}`] ?? "—"} text={explainOf(LIFE_STAGE_EXPLAIN, lifeStages?.[`${pos}Pillar`] ?? lifeStages?.[`${pos}`] ?? "")} /></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="console-label">自坐</dt>
                  <dd><TermTip term={ziZuo?.[pos] ?? "—"} text={explainOf(LIFE_STAGE_EXPLAIN, ziZuo?.[pos] ?? "")} /></dd>
                </div>
              </dl>

              {/* 神煞 */}
              {shenSha.length > 0 && (
                <div className="mt-3 border-t border-gold-500/10 pt-2">
                  <div className="console-label mb-1">神煞</div>
                  <div className="flex flex-wrap gap-1">
                    {shenSha.map((s, sIdx) => (
                      <TermTip
                        key={s}
                        term={s}
                        text={explainOf(SHENSHA_EXPLAIN, s)}
                        className={`anim-pop rounded border px-1.5 py-0.5 text-[10px] ${shenShaBadgeClass(classifyShenSha(s))}`}
                        style={{ animationDelay: `${Math.min(colDelay + 300 + sIdx * 60, 900)}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {globalShenSha.length > 0 && (
        <div className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/30 p-3">
          <div className="console-label mb-2">全局神煞（不在四柱本位）</div>
          <div className="flex flex-wrap gap-1.5">
            {globalShenSha.map((s, sIdx) => (
              <TermTip
                key={s}
                term={s}
                text={explainOf(SHENSHA_EXPLAIN, s)}
                className={`anim-pop rounded border px-2 py-0.5 text-[11px] ${shenShaBadgeClass(classifyShenSha(s))}`}
                style={{ animationDelay: `${Math.min(600 + sIdx * 60, 1100)}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}