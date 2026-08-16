import Title from "@/components/Title";
import { useState } from "react";
import { calculateWuyunLiuqi, type WuyunLiuqiResult } from "mingyu-core/wuyun-liuqi";
import OracleHeader, { OracleDisclaimer } from "@/components/oracle/OracleHeader";
import ActionBar from "@/components/oracle/ActionBar";
import Section, { KeyValueGrid } from "@/components/oracle/Section";
import Stagger from "@/components/motion/Stagger";
import { WUXING_COLORS, type WuXing } from "@/lib/wuxing";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { WUYUN_EXPLAIN, explainOf } from "@/lib/explain-divination";

const RELATION_LABEL: Record<string, string> = {
  同气: "同气",
  顺化: "顺化",
  天刑: "天刑",
  小逆: "小逆",
  不和: "不和",
  客生主: "客生主",
  主生客: "主生客",
  客克主: "客克客",
  主克客: "主克客",
};

const WX_TONE: Record<WuXing, string> = {
  木: "text-[color:var(--color-wuxing-mu)]",
  火: "text-[color:var(--color-wuxing-huo)]",
  土: "text-[color:var(--color-wuxing-tu)]",
  金: "text-[color:var(--color-wuxing-jin)]",
  水: "text-[color:var(--color-wuxing-shui)]",
};

function WuyunClient() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [result, setResult] = useState<WuyunLiuqiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const r = calculateWuyunLiuqi({ year });
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
        title="五运六气"
        subtitle="依《素问》天干化五运、地支配六气与吴谦《运气要诀》，排中运太过不及、五步主客运、司天在泉与六步主客气，审视一岁气运相临。"
        source="《素问》运气七篇 · 吴谦《运气要诀》"
        tags={["天干化运", "司天在泉", "主客六气", "天符 · 岁会", "同天符 · 同岁会"]}
        moduleName="WUYUN-LIUQI"
      />

      <ActionBar
        year={year}
        onYearChange={setYear}
        onSubmit={onSubmit}
        loading={loading}
        submitLabel="起五运六气"
      />

      {error && (
        <p className="mx-auto mt-4 max-w-5xl rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-400">
          {error}
        </p>
      )}

      {result && (
        <div className="mx-auto mt-6 max-w-5xl space-y-5 px-4 sm:px-6">
          <Section
            seq="01"
            title="年中气运"
            subtitle={`${result.input.yearGanZhi}年 · ${result.input.yearGanZhiSource}`}
            tone="gold"
          >
            <KeyValueGrid
              columns={4}
              items={[
                { label: "年干支", value: result.input.yearGanZhi, tone: "gold" },
                {
                  label: "中运",
                  value: `${result.annualMovement.element} · ${result.annualMovement.strength}`,
                },
                {
                  label: "音律",
                  value: `${result.annualMovement.toneName}（${result.annualMovement.tone}${result.annualMovement.toneStrength}）`,
                },
                { label: "中运依据", value: result.annualMovement.basis },
                {
                  label: "司天",
                  value: <span className="anim-seal inline-block">{result.sitian.name}</span>,
                  tone: "cinnabar",
                },
                {
                  label: "在泉",
                  value: <span className="anim-seal inline-block" style={{ animationDelay: "180ms" }}>{result.zaiquan.name}</span>,
                  tone: "paper",
                },
                {
                  label: "运气相临",
                  value: RELATION_LABEL[result.annualRelation.kind] ?? result.annualRelation.kind,
                },
                {
                  label: "年支",
                  value: result.input.yearGanZhi?.[1] ?? "—",
                },
              ]}
            />
          </Section>

          <Section seq="02" title="五步主运与客运" subtitle="主运恒定，客运随年干起算" revealDelay={80}>
            <div className="space-y-3">
              <Stagger step={100}>
                {result.movementSteps.map((s) => (
                  <div
                    key={s.order}
                    className="rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-2"
                  >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-paper-100">
                      {s.label}（{s.startBoundary.solarTerm}后第 {s.startBoundary.offsetDays} 日）
                    </span>
                    <span className="text-[11px] text-paper-500">
                      {RELATION_LABEL[s.hostGuestRelation.kind] ?? s.hostGuestRelation.kind}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="console-label">
                        <TermTip term="主运" text={explainOf(WUYUN_EXPLAIN, "主运")} />
                      </p>
                      <p className={`text-sm font-bold ${WX_TONE[s.hostMovement.element]}`}>
                        {s.hostMovement.element} · {s.hostMovement.tone}{s.hostMovement.toneStrength} · {s.hostMovement.climateQi}
                      </p>
                    </div>
                    <div>
                      <p className="console-label">
                        <TermTip term="客运" text={explainOf(WUYUN_EXPLAIN, "客运")} />
                      </p>
                      <p className={`text-sm font-bold ${WX_TONE[s.guestMovement.element]}`}>
                        {s.guestMovement.element} · {s.guestMovement.tone}{s.guestMovement.toneStrength} · {s.guestMovement.climateQi}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-paper-500">{s.periodRule}</p>
                  </div>
                ))}
              </Stagger>
            </div>
          </Section>

          <Section seq="03" title="六步主气与客气" subtitle="主气由厥阴起，客气随司天轮转" revealDelay={160}>
            <ol className="space-y-3">
              {result.qiSteps.map((s, i) => (
                <li
                  key={s.order}
                  className="anim-fade-up rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-paper-100">
                      {s.label} · {s.solarTerms.join(" / ")}
                    </span>
                    <span className="text-[11px] text-paper-500">
                      {RELATION_LABEL[s.hostGuestRelation.kind] ?? s.hostGuestRelation.kind}
                      {s.guestRole ? ` · ${s.guestRole}` : ""}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="console-label">
                        <TermTip term="主气" text={explainOf(WUYUN_EXPLAIN, "主气")} />
                      </p>
                      <p className="text-sm font-bold text-paper-100">
                        {s.hostQi.name}（{s.hostQi.qi}）
                      </p>
                    </div>
                    <div>
                      <p className="console-label">
                        <TermTip term="客气" text={explainOf(WUYUN_EXPLAIN, "客气")} />
                      </p>
                      <p className="text-sm font-bold text-paper-100">
                        {s.guestQi.name}（{s.guestQi.qi}）
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section seq="04" title="年分符合" subtitle="天符 / 岁会 / 太乙天符 / 同天符 / 同岁会" tone="cinnabar" revealDelay={240}>
            <ul className="space-y-2">
              {result.annualConformities.facts.map((f, i) => (
                <li
                  key={i}
                  className={`flex items-baseline gap-3 rounded-lg border px-3 py-2 ${
                    f.matched
                      ? "border-cinnabar-500/40 bg-cinnabar-500/10"
                      : "border-gold-500/15 bg-ink-900/30"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      f.matched ? "text-cinnabar-400" : "text-paper-300"
                    }`}
                  >
                    {f.name}
                  </span>
                  <span className="text-xs text-paper-400">{f.rule}</span>
                  <span className="ml-auto text-[11px] text-paper-500">{f.basis}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-paper-500">
              上述名录按六十甲子去重为 26 年；与《运气要诀》原文"二十八年"汇总数略有出入，按逐项定义为准。
            </p>
          </Section>

          <Section seq="05" title="计算链与限制" tone="paper" revealDelay={320}>
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

          {/* AI 白话解读：传核心气运字段，控制 data 体积 */}
          <div className="anim-fade-up">
            <AiInterpret
              topic="五运六气"
              data={{
                year: result.input.yearGanZhi,
                annualMovement: result.annualMovement,
                sitian: result.sitian,
                zaiquan: result.zaiquan,
                annualRelation: result.annualRelation,
                annualConformities: result.annualConformities,
              }}
            />
          </div>
        </div>
      )}

      <OracleDisclaimer />
    </>
  );
}

// 抑制未使用告警
void WUXING_COLORS;

export default function WuyunPage() {
  return (
    <Title title="五运六气">
      <WuyunClient />
    </Title>
  );
}
