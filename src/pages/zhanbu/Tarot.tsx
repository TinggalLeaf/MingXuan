import Title from "@/components/Title";
import { useEffect, useState } from "react";
import {
  drawTarotSpread,
  tarotSpreads,
  analyzeTarotEvidence,
  type TarotEvidenceAnalysis,
} from "mingyu-core/divination/tarot";
import type { TarotData, TarotSpreadType } from "mingyu-core";
import OracleHeader, { OracleDisclaimer } from "@/components/oracle/OracleHeader";
import Section, { NumberedList } from "@/components/oracle/Section";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { TAROT_EXPLAIN, explainOf } from "@/lib/explain-divination";

const SPREAD_KEYS = Object.keys(tarotSpreads) as TarotSpreadType[];

const ELEMENT_TONE: Record<string, string> = {
  火: "text-cinnabar-400 border-cinnabar-500/40",
  水: "text-[color:var(--color-wuxing-shui)] border-[color:var(--color-wuxing-shui)]/40",
  风: "text-[color:var(--color-wuxing-mu)] border-[color:var(--color-wuxing-mu)]/40",
  土: "text-[color:var(--color-wuxing-tu)] border-[color:var(--color-wuxing-tu)]/40",
  // 大阿卡纳无单元素，按"核心课题"展示
  核心: "text-gold-300 border-gold-500/40",
};

function TarotClient() {
  const [spread, setSpread] = useState<TarotSpreadType>("three");
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<TarotData | null>(null);
  const [evidence, setEvidence] = useState<TarotEvidenceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 每次抽牌递增，用于重置入场/翻牌动画 */
  const [drawSeq, setDrawSeq] = useState(0);
  /** 牌背落入完成后置 true，触发逐张翻牌 */
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFlipped(false);
    // 等最后一张牌背落入（i*150 + 650ms 动画时长）后再逐张翻开
    const t = setTimeout(
      () => setFlipped(true),
      450 + data.cards.length * 150,
    );
    return () => clearTimeout(t);
  }, [data, drawSeq]);

  function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const d = drawTarotSpread(spread);
      setDrawSeq((s) => s + 1);
      setData(d);
      try {
        setEvidence(analyzeTarotEvidence(d));
      } catch {
        setEvidence(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "抽牌失败");
    } finally {
      setLoading(false);
    }
  }

  const spreadMeta = tarotSpreads[spread];

  return (
    <>
      <OracleHeader
        title="塔罗牌"
        subtitle="韦特体系。Fisher-Yates 洗牌后依牌位顺序抽顶牌，正逆位由独立随机数确定。牌阵、正逆位、牌序、元素互参与主题聚合皆为事实陈述，不作吉凶结论。"
        source="Rider-Waite-Smith · A. E. Waite《The Pictorial Key to the Tarot》"
        tags={[
          "单牌",
          "三牌",
          "爱情牌阵",
          "事业牌阵",
          "凯尔特十字",
          "心轮牌阵",
          "身心灵牌阵",
          "马蹄牌阵",
          "年度牌阵",
          "决策牌阵",
        ]}
        moduleName="TAROT"
      />

      <section className="anim-fade-up panel-console hud-frame mx-auto mt-2 max-w-5xl px-5 py-4 sm:px-6" style={{ animationDelay: "180ms" }}>
        <div className="console-label mb-3">MINGXUAN // DRAW PARAMS</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="console-label mb-1 block">牌阵</span>
            <select
              className="input-xuan w-full"
              value={spread}
              onChange={(e) => setSpread(e.target.value as TarotSpreadType)}
            >
              {SPREAD_KEYS.map((k) => (
                <option key={k} value={k}>
                  {tarotSpreads[k].name}（{tarotSpreads[k].cardCount} 张）
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="console-label mb-1 block">问题（选填）</span>
            <input
              className="input-xuan w-full"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="一事一占，心诚则灵"
            />
          </label>
          <button
            type="button"
            className="btn-gold sm:w-44"
            disabled={loading}
            onClick={onSubmit}
          >
            {loading ? "抽牌中…" : "抽牌"}
          </button>
        </div>
      </section>

      {error && (
        <p className="mx-auto mt-4 max-w-5xl rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-400">
          {error}
        </p>
      )}

      {data && (
        <div className="mx-auto mt-6 max-w-5xl space-y-5 px-4 sm:px-6">
          <Section
            seq="01"
            title="牌阵"
            subtitle={`${spreadMeta.name} · ${data.cards.length} 张`}
            tone="gold"
          >
            <p className="mb-2">
              <span className="hud-chip">{spreadMeta.name}</span>
            </p>
            <p className="text-sm text-paper-300">{spreadMeta.description}</p>
          </Section>

          <Section seq="02" title="牌面与牌位" subtitle="正位 / 逆位" revealDelay={80}>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(data.cards.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {data.cards.map((c, i) => {
                const reversed = c.reversed ?? false;
                const tone =
                  ELEMENT_TONE[c.element ?? ""] ??
                  (c.archetype ? ELEMENT_TONE["核心"] : "text-paper-100 border-gold-500/30");
                return (
                  <div
                    key={`${drawSeq}-${i}`}
                    className={`anim-fade-down hud-frame flex flex-col items-center rounded-lg border bg-ink-900/30 p-3 ${tone}`}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <span className="console-label">
                      {c.position}
                    </span>
                    {/* 翻转动画放外层容器，逆位 rotate-180 放内层，避免 transform 冲突 */}
                    <div
                      className={flipped ? "anim-flip-in" : ""}
                      style={flipped ? { animationDelay: `${i * 150}ms` } : undefined}
                    >
                      <div
                        className={`my-2 flex h-28 w-20 items-center justify-center rounded border border-current bg-ink-950/60 text-center text-sm font-bold leading-tight ${tone} ${
                          flipped && reversed ? "rotate-180" : ""
                        }`}
                      >
                        {flipped ? (
                          <TermTip term={c.name} text={explainOf(TAROT_EXPLAIN, c.name)} />
                        ) : (
                          <span className="text-2xl text-gold-500/50">✦</span>
                        )}
                      </div>
                    </div>
                    {flipped && (
                      <>
                        <span
                          className="anim-fade-in text-[11px] text-paper-400"
                          style={{ animationDelay: `${i * 150 + 300}ms` }}
                        >
                          <TermTip
                            term={reversed ? "逆位" : "正位"}
                            text={explainOf(TAROT_EXPLAIN, reversed ? "逆位" : "正位")}
                          />
                        </span>
                        {c.keywords && c.keywords.length > 0 && (
                          <p className="mt-1 flex flex-wrap justify-center gap-1">
                            {c.keywords.slice(0, 3).map((k, ki) => (
                              <span
                                key={k}
                                className="anim-pop rounded border border-gold-500/25 px-1 text-[10px] leading-tight text-paper-400"
                                style={{ animationDelay: `${i * 150 + 350 + ki * 90}ms` }}
                              >
                                {k}
                              </span>
                            ))}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-paper-500">
              牌阵覆盖与抽牌来源见下方"反证"一节。
            </p>
          </Section>

          {evidence && (
            <>
              <Section seq="03" title="证据摘要" tone="paper" revealDelay={160}>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Stat label="牌面事实" value={evidence.summaryFact.cardFactCount} delay={0} />
                  <Stat label="牌序关系" value={evidence.summaryFact.sequenceFactCount} delay={90} />
                  <Stat label="元素互参" value={evidence.summaryFact.elementInteractionFactCount} delay={180} />
                  <Stat label="主题聚合" value={evidence.summaryFact.themeFactCount} delay={270} />
                </div>
                {evidence.recurringThemes && evidence.recurringThemes.length > 0 && (
                  <p className="mt-3 text-xs text-paper-300">
                    <span className="console-label">重复主题：</span><span className="text-gold-300">{evidence.recurringThemes.join("、")}</span>
                  </p>
                )}
              </Section>

              {evidence.counterEvidenceFacts && evidence.counterEvidenceFacts.length > 0 && (
                <Section
                  seq="04"
                  title="反证：逆位解释约束"
                  tone="cinnabar"
                  revealDelay={240}
                >
                  <NumberedList
                    items={evidence.counterEvidenceFacts.map((f) => ({
                      title: `${f.position} · ${f.card}（${f.orientation}）`,
                      body: f.detail,
                    }))}
                  />
                </Section>
              )}

              {evidence.elementInteractionFacts && evidence.elementInteractionFacts.length > 0 && (
                <Section seq="05" title="相邻元素互参" tone="paper" revealDelay={320}>
                  <NumberedList
                    items={evidence.elementInteractionFacts.map((f) => ({
                      title: `${f.fromPosition} → ${f.toPosition}`,
                      subtitle: `${f.fromCard}（${f.fromElement}）↔ ${f.toCard}（${f.toElement}）`,
                      body: `${RELATION_LABEL[f.relation] ?? f.relation} · ${f.orientationConstraint}`,
                    }))}
                  />
                </Section>
              )}

              {evidence.limitations && evidence.limitations.length > 0 && (
                <Section seq="06" title="边界说明">
                  <ul className="list-disc space-y-1 pl-5 text-xs text-paper-400">
                    {evidence.limitations.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}

          {/* AI 白话解读 */}
          <div className="anim-fade-up">
            <AiInterpret
              topic="塔罗牌阵"
              question={question || undefined}
              data={{
                spread: spreadMeta.name,
                cards: data.cards.map((c) => ({
                  position: c.position,
                  name: c.name,
                  reversed: c.reversed ?? false,
                  element: c.element,
                  keywords: c.keywords,
                })),
              }}
            />
          </div>
        </div>
      )}

      <OracleDisclaimer />
    </>
  );
}

const RELATION_LABEL: Record<string, string> = {
  同类强化: "同类强化",
  相互助长: "相互助长",
  相互制约: "相互制约",
  中性并置: "中性并置",
  核心课题介入: "核心课题介入",
  资料不足: "资料不足",
};

function Stat({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  return (
    <div className="anim-pop rounded border border-gold-500/15 bg-ink-900/30 p-3 text-center" style={{ animationDelay: `${delay}ms` }}>
      <p className="console-label">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gold-300">{value}</p>
    </div>
  );
}

export default function TarotPage() {
  return (
    <Title title="塔罗牌">
      <TarotClient />
    </Title>
  );
}
