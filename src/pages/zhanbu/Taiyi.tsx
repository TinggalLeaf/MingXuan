import Title from "@/components/Title";
import { useState } from "react";
import { generateTaiyi, type TaiyiResult } from "mingyu-core/taiyi";
import OracleHeader, { OracleDisclaimer } from "@/components/oracle/OracleHeader";
import ActionBar from "@/components/oracle/ActionBar";
import Section, { KeyValueGrid, NumberedList } from "@/components/oracle/Section";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { TAIYI_EXPLAIN, explainOf } from "@/lib/explain-divination";

const SCOPE_OPTIONS: ReadonlyArray<{ value: "year" | "month" | "day" | "hour"; label: string }> = [
  { value: "year", label: "年家" },
  { value: "month", label: "月家" },
  { value: "day", label: "日家" },
  { value: "hour", label: "时家" },
];

function TaiyiClient() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [scope, setScope] = useState<"year" | "month" | "day" | "hour">("year");
  const [result, setResult] = useState<TaiyiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const r = generateTaiyi({ year, scope });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "排盘失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <OracleHeader
        title="太乙神数"
        subtitle="以《太乙统宗》积年法起卦，列太乙、文昌、始击、计神四目与主客定算于十六神盘，按积年定位审视世运走向。"
        source="《太乙统宗》七十二局立成"
        tags={["年计", "月计", "日计", "时计", "十六神", "主客定算"]}
        moduleName="TAIYI"
      />

      <ActionBar
        year={year}
        onYearChange={setYear}
        onSubmit={onSubmit}
        loading={loading}
        submitLabel="起太乙盘"
        extra={
          <div className="flex items-center gap-2 text-sm text-paper-300">
            <span className="shrink-0">级别</span>
            <select
              className="input-xuan w-28 text-center"
              value={scope}
              onChange={(e) => setScope(e.target.value as "year" | "month" | "day" | "hour")}
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        }
      />

      {error && (
        <p className="mx-auto mt-4 max-w-5xl rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-400">
          {error}
        </p>
      )}

      {result && (
        <div className="mx-auto mt-6 max-w-5xl space-y-5 px-4 sm:px-6">
          <Section seq="01" title="盘面概要" subtitle={`${result.ganZhi} · ${result.accumulatedLabel} ${result.accumulatedValue}`}>
            <KeyValueGrid
              columns={4}
              items={[
                { label: "级别", value: result.scope === "year" ? "年家" : result.scope === "month" ? "月家" : result.scope === "day" ? "日家" : "时家" },
                { label: "阴阳遁", value: result.yinYang, tone: result.yinYang === "阳遁" ? "gold" : "paper" },
                { label: "局数", value: `${result.bureau} 局` },
                { label: "积年", value: result.entryYears },
                { label: "干支", value: result.ganZhi },
                { label: "太乙位", value: result.taiyiPosition, tone: "gold" },
                { label: "文昌位", value: result.wenChangPosition },
                { label: "始击位", value: result.shiJiPosition },
              ]}
            />
          </Section>

          <Section seq="02" title="主客定算" subtitle="主算 · 客算 · 定算" revealDelay={80}>
            <KeyValueGrid
              columns={3}
              items={[
                { label: "主算", value: <span className="anim-pop inline-block" style={{ animationDelay: "150ms" }}>{result.lordCount}</span>, tone: "gold" },
                { label: "客算", value: <span className="anim-pop inline-block" style={{ animationDelay: "270ms" }}>{result.guestCount}</span>, tone: "cinnabar" },
                { label: "定算", value: <span className="anim-pop inline-block" style={{ animationDelay: "390ms" }}>{result.setCount}</span>, tone: "paper" },
                { label: "主将宫", value: result.lordGeneral },
                { label: "主参宫", value: result.lordAssistant },
                { label: "客将宫", value: result.guestGeneral },
                { label: "客参宫", value: result.guestAssistant },
                { label: "定将宫", value: result.setGeneral },
                { label: "定参宫", value: result.setAssistant },
              ]}
            />
            <p className="mt-3 text-[11px] text-paper-500">
              主客定算仅用于比较三方盘面条件，不单独证明现实胜负、行动成败、吉凶比例或人物强弱。
            </p>
          </Section>

          <Section seq="03" title="十六神落宫" subtitle="按地支宫位索引" tone="paper" revealDelay={160}>
            <div className="hud-frame relative grid grid-cols-2 gap-2 rounded-lg p-2 sm:grid-cols-3 lg:grid-cols-4">
              {result.sixteenGods.map((g, i) => {
                const isCore =
                  g.branch === result.taiyiPosition ||
                  g.branch === result.wenChangPosition ||
                  g.branch === result.shiJiPosition ||
                  g.branch === result.jiShenPosition;
                const isTaiyi = g.branch === result.taiyiPosition;
                return (
                  <div
                    key={i}
                    className={`anim-scale-in flex items-baseline justify-between rounded border px-3 py-2 text-sm ${
                      isCore
                        ? "border-gold-500/60 bg-gold-500/10"
                        : "border-gold-500/15 bg-ink-900/30"
                    } ${isTaiyi ? "anim-glow" : ""}`}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <span className="console-value">
                      {g.branch}
                    </span>
                    <span
                      className={`font-bold ${
                        isCore ? "text-gold-300" : "text-paper-100"
                      }`}
                    >
                      {g.god}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-paper-500">
              标金者为四目所落之宫：
              <TermTip term="太乙" text={explainOf(TAIYI_EXPLAIN, "太乙")} /> /{" "}
              <TermTip term="文昌" text={explainOf(TAIYI_EXPLAIN, "文昌")} /> /{" "}
              <TermTip term="始击" text={explainOf(TAIYI_EXPLAIN, "始击")} /> /{" "}
              <TermTip term="计神" text={explainOf(TAIYI_EXPLAIN, "计神")} />。
            </p>
          </Section>

          {result.judgments && result.judgments.length > 0 && (
            <Section seq="04" title="算法判断" subtitle="传统定式提示" tone="cinnabar" revealDelay={240}>
              <NumberedList
                items={result.judgments.map((j, i) => ({
                  title: `第 ${i + 1} 条`,
                  body: j,
                }))}
              />
            </Section>
          )}

          <Section seq="05" title="模型说明" subtitle={result.model.name} revealDelay={320}>
            <KeyValueGrid
              columns={2}
              items={[
                { label: "流派", value: result.model.precision },
                { label: "支持范围", value: result.model.supportedScopes.join(" / ") },
              ]}
            />
            {result.model.sources.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-paper-400">
                {result.model.sources.map((s, i) => (
                  <li key={i}>
                    · {s.title} —— {s.evidence}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* AI 白话解读 */}
          <div className="anim-fade-up">
            <AiInterpret topic="太乙神数" data={result} />
          </div>
        </div>
      )}

      <OracleDisclaimer />
    </>
  );
}

export default function TaiyiPage() {
  return (
    <Title title="太乙神数">
      <TaiyiClient />
    </Title>
  );
}
