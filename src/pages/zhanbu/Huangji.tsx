import Title from "@/components/Title";
import { useEffect, useState } from "react";
import { calculateHuangjiJingshi, type HuangjiJingshiResult } from "mingyu-core/huangji-jingshi";
import OracleHeader, { OracleDisclaimer } from "@/components/oracle/OracleHeader";
import ActionBar from "@/components/oracle/ActionBar";
import Section, { KeyValueGrid, NumberedList } from "@/components/oracle/Section";
import HexagramLines from "@/components/oracle/HexagramLines";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { HUANGJI_EXPLAIN, explainOf } from "@/lib/explain-divination";

function HuangjiClient() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [result, setResult] = useState<HuangjiJingshiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const r = calculateHuangjiJingshi({ year });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "推演失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <OracleHeader
        title="皇极经世"
        subtitle="以《皇极经世》元会运世周期定位年所处之层级，配以先天六十四卦圆图统卦、会卦、运卦、十年卦与值年卦，呈现世运大势。"
        source="《皇极经世》· 蔡元定《皇极经世指要》"
        tags={["元会运世", "先天圆图", "值年卦", "会卦 · 运卦", "互综错卦"]}
        moduleName="HUANGJI"
      />

      <ActionBar
        year={year}
        onYearChange={setYear}
        onSubmit={onSubmit}
        loading={loading}
        submitLabel="起皇极盘"
        yearRange={{ min: -70000, max: 2100 }}
      />

      {error && (
        <p className="mx-auto mt-4 max-w-5xl rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-400">
          {error}
        </p>
      )}

      {result && (
        <div className="mx-auto mt-6 max-w-5xl space-y-5 px-4 sm:px-6">
          <Section seq="01" title="层级定位" subtitle={`${result.input.calendar}`}>
            <KeyValueGrid
              columns={4}
              items={[
                { label: "目标年", value: result.input.year, tone: "gold" },
                {
                  label: "元",
                  value: `${result.position.yuan.indexFromEpoch} · ${result.position.yuan.startYear}–${result.position.yuan.endYear}`,
                },
                {
                  label: "会",
                  value: `${result.position.hui.indexInYuan + 1} · ${result.position.hui.startYear}–${result.position.hui.endYear}`,
                },
                {
                  label: "运",
                  value: `${result.position.yun.indexInHui + 1}/${result.position.hui.indexInYuan * 30 + (result.position.yun.indexInHui ?? 0) + 1}`,
                },
                {
                  label: "世",
                  value: `${result.position.shi.indexInYun + 1}/${result.position.yun.indexInYuan * 12 + (result.position.shi.indexInYun ?? 0) + 1}`,
                },
                {
                  label: "年坐标",
                  value: result.position.year.coordinate,
                },
                {
                  label: "模式",
                  value: result.input.mode,
                },
                {
                  label: "纪元年",
                  value: result.input.epochYear,
                },
              ]}
            />

            {/* 元会运世层级链：逐级自左入场，进度条挂载后生长 */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                { name: "元", range: result.position.yuan, prog: result.progress.yuan },
                { name: "会", range: result.position.hui, prog: result.progress.hui },
                { name: "运", range: result.position.yun, prog: result.progress.yun },
                { name: "世", range: result.position.shi, prog: result.progress.shi },
              ] as const).map((n, i) => {
                const total = n.prog.completedYears + n.prog.remainingYearsAfterCurrent + 1;
                const pct = Math.max(
                  0,
                  Math.min(100, ((n.prog.completedYears + 1) / Math.max(total, 1)) * 100),
                );
                return (
                  <div
                    key={n.name}
                    className="anim-fade-right rounded-lg border border-gold-500/15 bg-ink-900/30 p-3"
                    style={{ animationDelay: `${i * 140}ms` }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-gold-300">
                        <TermTip term={n.name} text={explainOf(HUANGJI_EXPLAIN, n.name)} />
                      </span>
                      <span className="text-[10px] text-paper-500">
                        {n.range.startYear}–{n.range.endYear}
                      </span>
                    </div>
                    <GrowBar pct={pct} delay={200 + i * 140} />
                    <p className="mt-1.5 text-[10px] text-paper-500">
                      第 <span className="console-value">{n.prog.completedYears + 1}</span> / <span className="console-value">{total}</span> 年
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>

          {result.forecast && (
            <Section
              seq="02"
              title="值年卦系"
              subtitle={`${result.forecast.hexagrams.annual.ganzhi}年 · ${result.forecast.hexagrams.annual.name}`}
              tone="cinnabar"
              revealDelay={120}
            >
              <div className="anim-unroll grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="flex justify-center sm:justify-start">
                  <HexagramLines
                    upper={result.forecast.hexagrams.annual.upper}
                    lower={result.forecast.hexagrams.annual.lower}
                    size={120}
                    tone="gold"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-paper-200">
                    <span className="text-gold-300">卦辞：</span>
                    {result.forecast.hexagrams.annual.judgment}
                  </p>
                  <p className="text-sm font-bold text-paper-100">
                    {result.forecast.reading.headline}
                  </p>
                  <p className="text-xs text-paper-400">
                    {result.forecast.reading.cycleContext}
                  </p>
                  <p className="text-xs text-paper-400">
                    {result.forecast.reading.annualFocus}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PeriodHexCard title="会卦（统卦）" h={result.forecast.hexagrams.governing} delay={0} />
                <PeriodHexCard title="运卦" h={result.forecast.hexagrams.yun} delay={100} />
                <PeriodHexCard title="六十年卦" h={result.forecast.hexagrams.sixtyYear} delay={200} />
                <PeriodHexCard title="十年卦" h={result.forecast.hexagrams.decade} delay={300} />
              </div>

              <div className="mt-5">
                <p className="console-label mb-2">
                  相关卦象
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <RelatedCard label="互卦" h={result.forecast.relatedHexagrams.mutual} delay={0} />
                  <RelatedCard label="综卦（反卦）" h={result.forecast.relatedHexagrams.opposite} delay={110} />
                  <RelatedCard label="错卦" h={result.forecast.relatedHexagrams.reversed} delay={220} />
                </div>
              </div>
            </Section>
          )}

          <Section seq="03" title="解释顺序" subtitle="按层次推演的解读次序" revealDelay={200}>
            {result.forecast?.reading.interpretationOrder &&
            result.forecast.reading.interpretationOrder.length > 0 ? (
              <NumberedList
                items={result.forecast.reading.interpretationOrder.map((s, i) => ({
                  title: `第 ${i + 1} 步`,
                  body: s,
                }))}
              />
            ) : (
              <p className="text-sm text-paper-500">（无）</p>
            )}
          </Section>

          <Section seq="04" title="计算链与限制" tone="paper" revealDelay={280}>
            <details className="text-sm text-paper-400" open>
              <summary className="cursor-pointer text-paper-300">计算步骤</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
                {result.calculationChain.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            </details>
            {result.limitations && result.limitations.length > 0 && (
              <details className="mt-3 text-sm text-paper-400">
                <summary className="cursor-pointer text-paper-300">边界说明</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {result.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}
          </Section>

          {/* AI 白话解读：只传核心推演结果，控制 data 体积 */}
          <div className="anim-fade-up">
            <AiInterpret
              topic="皇极经世推演"
              data={{
                year: result.input.year,
                calendar: result.input.calendar,
                position: result.position,
                progress: result.progress,
                forecast: result.forecast,
              }}
            />
          </div>
        </div>
      )}

      <OracleDisclaimer />
    </>
  );
}

interface PeriodHex {
  hexagram: {
    name: string;
    shortName?: string;
    symbol?: string;
    upper: string;
    lower: string;
    judgment: string;
  };
  startYear: number;
  endYear: number;
  durationYears: number;
}

function PeriodHexCard({ title, h, delay = 0 }: { title: string; h: PeriodHex; delay?: number }) {
  return (
    <div className="anim-fade-up rounded-lg border border-gold-500/15 bg-ink-900/30 p-3" style={{ animationDelay: `${delay}ms` }}>
      <p className="console-label">
        {title}
      </p>
      <p className="mt-1 text-base font-bold text-gold-300">
        {h.hexagram.name}
        <span className="ml-2 text-xs font-normal text-paper-400">
          {h.hexagram.upper}上{h.hexagram.lower}下
        </span>
      </p>
      <p className="mt-1 text-[11px] text-paper-400">
        {h.startYear}–{h.endYear}（{h.durationYears} 年）
      </p>
      <p className="mt-2 text-xs text-paper-300 line-clamp-3">
        {h.hexagram.judgment}
      </p>
    </div>
  );
}

function RelatedCard({ label, h, delay = 0 }: { label: string; h: { name: string; upper: string; lower: string; judgment: string }; delay?: number }) {
  return (
    <div className="anim-fade-up rounded-lg border border-gold-500/15 bg-ink-900/30 p-3" style={{ animationDelay: `${delay}ms` }}>
      <p className="console-label">{label}</p>
      <p className="mt-1 text-base font-bold text-paper-100">{h.name}</p>
      <p className="mt-1 text-[11px] text-paper-400">
        {h.upper}上{h.lower}下
      </p>
      <p className="mt-2 text-xs text-paper-400 line-clamp-3">{h.judgment}</p>
    </div>
  );
}

/** 进度条：挂载后宽度从 0 生长到目标百分比（只 transition width）。 */
function GrowBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 60 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-950/70">
      <div
        className="h-full rounded-full bg-gold-500/70 transition-[width] duration-700 ease-out"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export default function HuangjiPage() {
  return (
    <Title title="皇极经世">
      <HuangjiClient />
    </Title>
  );
}
