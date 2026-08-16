import Title from "@/components/Title";
import { useState } from "react";
import OracleHeader, { OracleDisclaimer } from "@/components/oracle/OracleHeader";
import Section, { KeyValueGrid } from "@/components/oracle/Section";
import AiInterpret from "@/components/ai/AiInterpret";
import {
  drawLingqianStick,
  LINGQIAN_STICKS,
  type LingqianStick,
} from "@/components/oracle/lingqian-data";

const LEVEL_TONE: Record<LingqianStick["level"], { text: string; bg: string }> = {
  上上: { text: "text-gold-300", bg: "bg-gold-500/15 border-gold-500/50" },
  上吉: { text: "text-gold-300", bg: "bg-gold-500/10 border-gold-500/35" },
  中吉: { text: "text-paper-100", bg: "bg-jade-500/10 border-jade-500/30" },
  中平: { text: "text-paper-200", bg: "bg-paper-100/5 border-paper-100/20" },
  下下: { text: "text-cinnabar-400", bg: "bg-cinnabar-500/10 border-cinnabar-500/40" },
};

function LingqianClient() {
  const [stick, setStick] = useState<LingqianStick | null>(null);
  const [history, setHistory] = useState<ReadonlyArray<number>>([]);
  const [lookupInput, setLookupInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  /** 每次求签递增，重放签筒摇动动画 */
  const [shakeKey, setShakeKey] = useState(0);

  function drawOnce() {
    const s = drawLingqianStick();
    setShakeKey((k) => k + 1);
    setStick(s);
    setLookupError(null);
    setHistory((h) => [s.no, ...h.filter((n) => n !== s.no)].slice(0, 8));
  }

  function lookupByNumber() {
    setLookupError(null);
    const trimmed = lookupInput.trim();
    if (!trimmed) {
      setLookupError("请输入签号（1–92）");
      return;
    }
    const num = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(num) || num < 1 || num > LINGQIAN_STICKS.length) {
      setLookupError(`签号须在 1 到 ${LINGQIAN_STICKS.length} 之间`);
      return;
    }
    const found = LINGQIAN_STICKS.find((s) => s.no === num);
    if (!found) {
      setLookupError("未找到该签");
      return;
    }
    setStick(found);
    setHistory((h) => [found.no, ...h.filter((n) => n !== found.no)].slice(0, 8));
  }

  const tone = stick ? LEVEL_TONE[stick.level] : null;

  return (
    <>
      <OracleHeader
        title="三山国王灵签"
        subtitle="九十二支古典签诗示例。默念所问之事，由随机数等概率取出一支；签诗与判语供传统占卜文化体验，不构成吉凶结论、应期、人物判断或现实决策依据。"
        source="古典七言签诗示例（仅供文化体验，非任何庙宇官方签谱）"
        tags={["九十二签", "上上 / 上吉 / 中吉 / 中平 / 下下", "古典七言", "一签一案"]}
        moduleName="ORACLE-STICKS"
      />

      <section className="anim-fade-up panel-console hud-frame mx-auto mt-2 max-w-5xl px-5 py-4 sm:px-6" style={{ animationDelay: "180ms" }}>
        <div className="console-label mb-3 text-center">MINGXUAN // DRAW STICK</div>
        <p className="mb-3 text-center text-sm leading-relaxed text-paper-300">
          心诚则灵。默念所问，轻点下签筒，即得一签。
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {/* 签筒：点击求签时整体摇动一次（key 递增重放 anim-shake） */}
          <span
            key={shakeKey}
            className={shakeKey > 0 ? "anim-shake inline-block" : "inline-block"}
          >
            <button
              type="button"
              className="btn-gold px-8 py-3 text-base"
              onClick={drawOnce}
            >
              {stick ? "再抽一签" : "求签"}
            </button>
          </span>
          {stick && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setStick(null);
                setHistory([]);
                setLookupInput("");
                setLookupError(null);
              }}
            >
              清除
            </button>
          )}
        </div>
      </section>

      {/* 按签号查签 */}
      <section className="anim-fade-up panel-console hud-frame mx-auto mt-3 max-w-5xl px-5 py-4 sm:px-6" style={{ animationDelay: "280ms" }}>
        <div className="console-label mb-2">MINGXUAN // LOOKUP</div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:gap-3">
          <label className="flex-1">
            <span className="console-label mb-1 block">按签号查签</span>
            <input
              type="number"
              min={1}
              max={LINGQIAN_STICKS.length}
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") lookupByNumber();
              }}
              placeholder={`输入 1–${LINGQIAN_STICKS.length} 任意签号`}
              className="input-xuan w-full text-center font-mono"
            />
          </label>
          <button
            type="button"
            className="btn-ghost sm:w-32"
            onClick={lookupByNumber}
          >
            查询
          </button>
        </div>
        {lookupError && (
          <p className="mt-2 text-center text-xs text-cinnabar-400">{lookupError}</p>
        )}
      </section>

      {stick && tone && (
        <div className="mx-auto mt-6 max-w-5xl space-y-5 px-4 sm:px-6">
          {/* 签面主体：换签时按签号重放卷轴展开 */}
          <section key={stick.no} className={`anim-unroll panel-console hud-frame relative overflow-hidden border-2 ${tone.bg}`}>
            <div className="absolute right-4 top-4 rotate-12 select-none">
              <span className="anim-seal seal inline-block text-base" style={{ animationDelay: "480ms" }}>{stick.level}</span>
            </div>
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="mb-4 flex items-baseline gap-3">
                <span className="console-label">
                  第
                </span>
                <span className="text-3xl font-bold text-gold-300">{stick.no}</span>
                <span className="console-label">
                  签
                </span>
                <span className="ml-2 text-sm text-paper-400">· {stick.palace}</span>
              </div>

              {/* 签题 */}
              <p className="mb-4 text-center text-sm font-bold text-paper-100">
                【签题】{stick.summary}
              </p>

              {/* 签诗 · 竖排排版 */}
              <div className="my-5 flex justify-center">
                <div
                  className="writing-vertical flex flex-row-reverse items-stretch gap-6 rounded-lg border border-gold-500/15 bg-ink-950/40 px-6 py-6 sm:gap-8 sm:px-10 sm:py-8"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {stick.verse.map((line, i) => (
                    <p
                      key={i}
                      className={`anim-fade-right text-xl font-bold leading-loose sm:text-2xl ${tone.text}`}
                      style={{ fontFamily: "var(--font-song)", animationDelay: `${300 + i * 130}ms` }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-paper-500">
                签诗自右向左竖排阅读
              </p>

              {/* 解曰 / 断语 */}
              <div className="mt-6 border-t border-gold-500/20 pt-4">
                <p className="text-center text-sm font-bold text-paper-100">
                  【解曰】{stick.body.split("。")[0]}。
                </p>
                <p className="mt-3 text-justify text-sm leading-relaxed text-paper-300">
                  {stick.body}
                </p>
              </div>
            </div>
          </section>

          {/* 签面元信息 */}
          <Section seq="01" title="签面元信息" tone="paper" revealDelay={140}>
            <KeyValueGrid
              columns={4}
              items={[
                { label: "签号", value: stick.no },
                {
                  label: "等级",
                  value: stick.level,
                  tone: stick.level.startsWith("上")
                    ? "gold"
                    : stick.level === "中吉"
                      ? "default"
                      : stick.level === "中平"
                        ? "paper"
                        : "cinnabar",
                },
                { label: "宫位", value: stick.palace },
                { label: "全签数", value: LINGQIAN_STICKS.length },
              ]}
            />
          </Section>

          {history.length > 0 && (
            <Section seq="02" title="本会话签号" subtitle="最近 8 次，去重" revealDelay={220}>
              <div className="flex flex-wrap gap-2">
                {history.map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const found = LINGQIAN_STICKS.find((s) => s.no === n);
                      if (found) {
                        setStick(found);
                        setLookupInput(String(n));
                        setLookupError(null);
                      }
                    }}
                    className={`anim-pop rounded border px-2 py-1 text-xs transition-colors ${
                      n === stick.no
                        ? "border-gold-500 bg-gold-500/15 text-gold-300"
                        : "border-gold-500/30 bg-ink-900/30 text-paper-300 hover:border-gold-500/60"
                    }`}
                    style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
                  >
                    第 {n} 签
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* AI 白话解读 */}
          <div className="anim-fade-up">
            <AiInterpret
              topic="灵签签文"
              data={{
                no: stick.no,
                level: stick.level,
                palace: stick.palace,
                summary: stick.summary,
                verse: stick.verse,
                body: stick.body,
              }}
            />
          </div>
        </div>
      )}

      <OracleDisclaimer />
    </>
  );
}
export default function LingqianPage() {
  return (
    <Title title="三山国王灵签">
      <LingqianClient />
    </Title>
  );
}
