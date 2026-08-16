import Title from "@/components/Title";
/**
 * 人生K线 · 客户端编排
 * 流程：BirthForm → calculateBaziFromBirthProfile → computeKLine → 摘要/蜡烛图/六维/详批
 */

import { useMemo, useState } from "react";
import type { BirthProfile } from "mingyu-core";
import BirthForm from "@/components/birth/BirthForm";
import SummaryHeader from "@/components/kline/SummaryHeader";
import KlineChart from "@/components/kline/KlineChart";
import DimensionsChart from "@/components/kline/DimensionsChart";
import YearDetail from "@/components/kline/YearDetail";
import AiInterpret from "@/components/ai/AiInterpret";
import ScanOverlay from "@/components/common/ScanOverlay";
import CharsRise from "@/components/motion/CharsRise";
import { klineConfig } from "@/lib/config";
import { computeKLine } from "@/lib/kline/engine";
import type { KLineEngineResult, KLinePoint } from "@/lib/kline/types";

type Tab = "kline" | "dimensions";

function KlineClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [result, setResult] = useState<KLineEngineResult | null>(null);
  const [tab, setTab] = useState<Tab>("kline");
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  async function handleSubmit(p: BirthProfile) {
    setLoading(true);
    setError("");
    setSelectedAge(null);
    setProfile(p);
    try {
      const { calculateBaziFromBirthProfile } = await import("mingyu-core");
      const chart = calculateBaziFromBirthProfile(p);
      const r = computeKLine({ chart, years: klineConfig.years });
      setResult(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`排盘失败：${msg}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setProfile(null);
    setSelectedAge(null);
    setError("");
  }

  const selectedPoint = useMemo(() => {
    if (!result || selectedAge == null) return null;
    return result.points.find((p) => p.age === selectedAge) ?? null;
  }, [result, selectedAge]);

  /** AI 解读数据：摘要不传百年全量，只保留 摘要 + 大运分段 + 峰谷 + 当前年前后十年 */
  const aiData = useMemo(() => {
    if (!result) return null;
    const slim = (p: KLinePoint) => ({
      年份: p.year,
      虚岁: p.age,
      流年: p.ganZhi,
      天干十神: p.tenGod,
      地支十神: p.tenGodZhi,
      大运: p.daYun,
      综合分: p.score,
      六维: p.dimensionScores,
      断语: p.reason,
    });
    const birthYear = result.chart.solarDate.year;
    const currentAge = new Date().getFullYear() - birthYear + 1;
    const window = result.points
      .filter((p) => Math.abs(p.age - currentAge) <= 10)
      .map(slim);
    const peakPoint = result.points.find((p) => p.age === result.summary.peak.age);
    const valleyPoint = result.points.find((p) => p.age === result.summary.valley.age);
    return {
      命主: profile?.name || "匿名",
      四柱: `${result.chart.pillars.year.ganZhi} ${result.chart.pillars.month.ganZhi} ${result.chart.pillars.day.ganZhi} ${result.chart.pillars.hour.ganZhi}`,
      百年摘要: result.summary,
      大运分段: result.daYun,
      最高峰年: peakPoint ? slim(peakPoint) : result.summary.peak,
      最低谷年: valleyPoint ? slim(valleyPoint) : result.summary.valley,
      当前年龄前后十年: window,
    };
  }, [result, profile]);

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <header className="mb-8 text-center sm:mb-10">
          <div className="console-label mb-3">MINGXUAN // SYNTAX KLINE</div>
          <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
            <CharsRise text="人生K线" step={140} className="text-shimmer-gold" />
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
            传统八字 × 金融蜡烛图，将命主一生运势铺成 {klineConfig.years} 年 K 线图谱。
          </p>
        </header>
        <BirthForm
          title="录入命主资料"
          submitLabel={loading ? "排盘中…" : "生成K线"}
          loading={loading}
          onSubmit={handleSubmit}
        />
        {error && (
          <p className="rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-3 py-2 text-sm text-cinnabar-400">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-paper-500">
          人生K线为传统命理规则的量化演绎，仅供文化研究与娱乐参考，不构成人生决策依据。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="console-label mb-2">MINGXUAN // SYNTAX KLINE</div>
          <h1 className="title-ornament text-2xl font-bold text-gold-300 sm:text-3xl">
            <span className="text-shimmer-gold">人生K线</span>
          </h1>
          <p className="mt-2 text-xs text-paper-400">
            点击蜡烛查看单年详批；可滚动缩放查看局部大运。
          </p>
        </div>
        <button type="button" onClick={handleReset} className="btn-ghost text-xs">
          重新排盘
        </button>
      </header>

      <SummaryHeader chart={result.chart} summary={result.summary} name={profile?.name} />

      <section className="panel-console hud-frame anim-unroll relative space-y-4 p-5 sm:p-6">
        {/* 烛光氛围装饰：低透明度摇曳光晕，不干扰图表交互 */}
        <div
          aria-hidden
          className="anim-flicker pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full bg-gold-500/10 blur-2xl"
        />
        <div
          aria-hidden
          className="anim-flicker pointer-events-none absolute -left-6 top-1/3 h-24 w-24 rounded-full bg-cinnabar-500/[0.07] blur-2xl"
          style={{ animationDelay: "1.2s" }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="console-title text-lg">
            <span className="seq">01</span>百年K线图谱
          </h2>
          <div className="flex gap-2">
            {([
              { k: "kline" as const, l: "K线图" },
              { k: "dimensions" as const, l: "六维走势" },
            ]).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className={`tab-chip text-xs ${tab === t.k ? "is-active" : ""}`}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>
        {tab === "kline" ? (
          <div key="kline" className="anim-fade-in relative">
            <ScanOverlay />
            <KlineChart
              data={result}
              colorMode={klineConfig.colorMode}
              selectedAge={selectedAge ?? undefined}
              onSelectYear={setSelectedAge}
            />
          </div>
        ) : (
          <div key="dimensions" className="anim-fade-in relative">
            <ScanOverlay />
            <DimensionsChart data={result} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs text-paper-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-cinnabar-500" />
            阳线（开 ≤ 收）
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-jade-500" />
            阴线（开 &gt; 收）
          </span>
          <span className="console-label">
            配色 / {klineConfig.colorMode === "cn" ? "中式（红涨绿跌）" : "西式（绿涨红跌）"}
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="panel-console space-y-3 p-5 sm:p-6">
            <h2 className="console-title text-lg">
              <span className="seq">02</span>大运分阶段
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gold-500/15">
                    <th className="console-label px-2 py-2 text-left">大运</th>
                    <th className="console-label px-2 py-2 text-left">起岁</th>
                    <th className="console-label px-2 py-2 text-left">基线分</th>
                    <th className="console-label px-2 py-2 text-left">覆盖年份</th>
                  </tr>
                </thead>
                <tbody>
                  {result.daYun.map((d, i) => (
                    <tr
                      key={i}
                      className="anim-fade-up border-b border-gold-500/10 text-paper-200"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <td className="px-2 py-2 font-bold text-gold-300">{d.ganZhi}</td>
                      <td className="px-2 py-2">
                        <span className="console-value">{d.startAge}</span> 岁
                      </td>
                      <td className="console-value px-2 py-2">{d.baseline}</td>
                      <td className="console-value px-2 py-2 text-xs">
                        {d.startAge} – {d.endAge}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div>
          {selectedPoint ? (
            <YearDetail
              key={selectedPoint.age}
              point={selectedPoint}
              onClose={() => setSelectedAge(null)}
            />
          ) : (
            <div className="panel-console p-5 text-sm text-paper-400">
              <h3 className="console-title text-base">
                <span className="seq">03</span>单年详批
              </h3>
              <p className="mt-2">
                点击主图中的蜡烛查看该年十神、冲合刑害、六维分与断语。
              </p>
              <ul className="mt-3 space-y-1 text-xs text-paper-500">
                <li>· 阳线代表该年均分高于开盘；阴线代表低于开盘。</li>
                <li>· 大运段以淡色背景区分。</li>
                <li>· 滚动鼠标可缩放，底部滑块可拖动。</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {aiData && (
        <AiInterpret topic="人生百年运势K线" data={aiData} />
      )}

      <footer className="pt-4 text-center text-xs text-paper-500">
        人生K线为传统命理规则的量化演绎，仅供文化研究与娱乐参考，不构成人生决策依据。
      </footer>    </div>
  );
}

export default function KlinePage() {
  return (
    <Title title="人生K线">
      <KlineClient />
    </Title>
  );
}
