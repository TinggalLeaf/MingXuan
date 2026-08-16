import Title from "@/components/Title";
import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateMeihua } from "mingyu-core/divination/meihua";
import type { MeihuaData, MeihuaDivinationMethod } from "mingyu-core";

import QuestionInput from "@/components/divination/QuestionInput";
import MethodChips from "@/components/divination/MethodChips";
import GuaLines from "@/components/divination/GuaView";
import ResultCard from "@/components/divination/ResultCard";
import ErrorBox from "@/components/divination/ErrorBox";
import Disclaimer from "@/components/divination/Disclaimer";
import CharsRise from "@/components/motion/CharsRise";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { MEIHUA_EXPLAIN, explainOf } from "@/lib/explain-divination";

type Method = MeihuaDivinationMethod;

const METHOD_OPTS: Array<{ value: Method; label: string; desc: string }> = [
  { value: "time", label: "时间起卦", desc: "依当前时辰取数（默认）" },
  { value: "number", label: "数字起卦", desc: "由两个数字取上、下卦" },
  { value: "random", label: "随机起卦", desc: "随机数生成卦象" },
];

function buildDate(customDate: string): Date | undefined {
  if (!customDate) return undefined;
  const d = new Date(customDate);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MeihuaClient() {
  const [question, setQuestion] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [method, setMethod] = useState<Method>("time");
  const [number, setNumber] = useState("");
  const [data, setData] = useState<MeihuaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onDivine = () => {
    setError(null);
    setBusy(true);
    try {
      const date = buildDate(customDate);
      let settings: { method: Method; number?: number } | undefined = { method };
      if (method === "number") {
        const num = Number(number);
        if (!Number.isFinite(num) || num <= 0) {
          throw new Error("请输入正整数");
        }
        settings = { method: "number", number: num };
      } else if (method === "random") {
        settings = { method: "random" };
      }
      const result = generateMeihua(date, settings);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "起卦失败，请重试");
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    setData(null);
    setError(null);
    setQuestion("");
    setNumber("");
  };

  const ready = method === "time" || method === "random" || (method === "number" && number.length > 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="mb-2 pt-12 text-center">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // MEIHUA
        </div>
        <h1 className="title-ornament justify-center text-3xl font-bold text-gold-300">
          <CharsRise text="梅花易数" step={110} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-center text-sm text-paper-400">
          邵雍心易 · 体用生克 · 互变参断
        </p>
      </header>

      <QuestionInput
        question={question}
        setQuestion={setQuestion}
        customDate={customDate}
        setCustomDate={setCustomDate}
      />

      <MethodChips<Method>
        label="起卦方式"
        value={method}
        onChange={(v) => {
          setMethod(v);
          setData(null);
        }}
        options={METHOD_OPTS}
      />

      {method === "number" && (
        <section className="panel-console hud-frame p-4 sm:p-6">
          <label className="text-xs tracking-widest text-paper-400">
            任意正整数（用于数字起卦）
          </label>
          <input
            type="number"
            min={1}
            className="input-xuan mt-2 w-full text-sm"
            placeholder="例：123"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-gold"
          onClick={onDivine}
          disabled={!ready || busy}
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "排盘中…" : data ? "重新排盘" : "起卦"}
        </button>
        {data && (
          <button type="button" className="btn-ghost text-sm" onClick={onReset}>
            <RefreshCw className="h-4 w-4" />
            再占一卦
          </button>
        )}
      </div>

      {error && <ErrorBox message={error} />}

      {data && <MeihuaResult data={data} question={question} customDate={customDate} />}

      <Disclaimer />
    </div>
  );
}

function MeihuaResult({
  data,
  question,
  customDate,
}: {
  data: MeihuaData;
  question: string;
  customDate: string;
}) {
  const main = data.mainHexagram;
  const inter = data.interHexagram;
  const changed = data.changedHexagram;

  const dateLabel = customDate
    ? customDate.replace("T", " ")
    : formatDate(new Date(data.timestamp));

  return (
    <>
      <ResultCard
        title={`${main.name}${changed ? ` → ${changed.name}` : ""}`}
        subtitle={
          <>
            {question && <span className="mr-2">所问：{question}</span>}
            <span>起卦：{dateLabel}</span>
          </>
        }
        badge={
          <>
            <span className="anim-pop rounded border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-300">
              <TermTip term="体卦" text={explainOf(MEIHUA_EXPLAIN, "体卦")} />
              {" · "}
              {data.tiGua.name}（{data.tiGua.element}）
            </span>
            <span
              className="anim-pop rounded border border-cinnabar-500/40 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400"
              style={{ animationDelay: "140ms" }}
            >
              <TermTip term="用卦" text={explainOf(MEIHUA_EXPLAIN, "用卦")} />
              {" · "}
              {data.yongGua.name}（{data.yongGua.element}）
            </span>
          </>
        }
      >
        <div key={data.timestamp} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GuaPanel
            title="本卦（事之始）"
            hexagram={main}
            highlight="ben"
            delay={0}
            tiYong={tiYongForTrigram(main.upper, main.lower, data)}
          />
          {inter && (
            <GuaPanel
              title="互卦（事之中）"
              hexagram={inter}
              highlight="hu"
              delay={200}
            />
          )}
          {changed && (
            <GuaPanel
              title="变卦（事之终）"
              hexagram={changed}
              highlight="bian"
              delay={400}
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-paper-300 sm:grid-cols-4">
          <Info label="月建" value={data.ganzhi.month} />
          <Info label="日辰" value={data.ganzhi.day} highlight />
          <Info label="时支" value={data.ganzhi.hour} />
          <Info label="体卦五行" value={data.tiGua.element} />
        </div>
      </ResultCard>

      <ResultCard title="体用分析" subtitle="以体卦为我、用卦为事；五行生克定吉凶">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="体用关系" value={data.analysis.tiYongRelation} />
          <Field label="体卦月令" value={data.analysis.tiSeasonState} />
          <Field label="用卦月令" value={data.analysis.yongSeasonState} />
          <Field label="变卦关系" value={data.analysis.changedRelation} />
          <Field label="变后体用" value={data.analysis.changedTiYongRelation} />
          <Field label="互体关系" value={data.analysis.inter1Relation} />
          <Field label="互用关系" value={data.analysis.inter2Relation} />
          {data.analysis.monthBranch && (
            <Field label="月建" value={data.analysis.monthBranch} />
          )}
        </div>

        <div className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-sm leading-relaxed text-paper-200">
          {data.analysis.tiYongRaw ?? derivedTiYongSummary(data)}
        </div>

        {data.analysis.yingQi && data.analysis.yingQi.length > 0 && (
          <div className="mt-3">
            <h3 className="mb-1 text-xs tracking-widest text-paper-400">应期参考</h3>
            <ul className="space-y-1 text-sm text-paper-200">
              {data.analysis.yingQi.map((y, i) => (
                <li key={i}>· {y}</li>
              ))}
            </ul>
          </div>
        )}
      </ResultCard>

      {data.evidenceAnalysis?.stages && data.evidenceAnalysis.stages.length > 0 && (
        <ResultCard title="三阶段证据链">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            {data.evidenceAnalysis.stages.map((s) => (
              <div key={s.key} className="rounded border border-gold-500/15 bg-ink-900/40 p-3">
                <div className="mb-1 text-paper-400">{s.label} · {s.hexagram}</div>
                <div className="text-paper-100">体 {s.ti.name}（{s.ti.element}）· 用 {s.yong.name}（{s.yong.element}）</div>
                <div className="mt-1 text-[11px] text-paper-300">{s.relation}</div>
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {/* AI 白话解读 */}
      <div className="anim-fade-up">
        <AiInterpret topic="梅花易数卦" question={question || undefined} data={data} />
      </div>
    </>
  );
}

function GuaPanel({
  title,
  hexagram,
  highlight,
  tiYong,
  delay = 0,
}: {
  title: string;
  hexagram: {
    name: string;
    upper: string;
    lower: string;
    description: string;
    yaoCi?: string[];
  };
  highlight: "ben" | "hu" | "bian";
  tiYong?: string;
  /** 入场级联延迟（ms） */
  delay?: number;
}) {
  const lines = useHexLines(hexagram.upper, hexagram.lower);
  return (
    <div
      className="panel-console hud-frame anim-fade-up p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gold-300">{title}</h3>
        {tiYong && (
          <span
            className={`anim-pop rounded px-1.5 py-0.5 text-[10px] ${
              tiYong.includes("体")
                ? "bg-gold-500/20 text-gold-300"
                : "bg-cinnabar-500/20 text-cinnabar-400"
            }`}
            style={{ animationDelay: `${delay + 350}ms` }}
          >
            <TermTip term={tiYong} text={explainOf(MEIHUA_EXPLAIN, tiYong)} />
          </span>
        )}
      </div>
      <div className="mb-2 text-center text-xs text-paper-200">
        <div className="text-base font-bold">{hexagram.name}</div>
        <div className="text-[11px] text-paper-400">
          {hexagram.upper}上 {hexagram.lower}下
        </div>
      </div>
      <GuaLines lines={lines} changing={[]} highlight={highlight} compact />
      <p className="mt-3 text-[11px] leading-relaxed text-paper-400">
        {hexagram.description}
      </p>
      {hexagram.yaoCi && hexagram.yaoCi.length > 0 && (
        <details className="mt-2 text-[11px] text-paper-400">
          <summary className="cursor-pointer text-paper-300">六爻辞</summary>
          <ul className="mt-1 space-y-1">
            {hexagram.yaoCi.map((c, i) => (
              <li key={i}>
                {i + 1}：{c}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-2 text-center">
      <div className="text-[10px] tracking-widest text-paper-500">{label}</div>
      <div
        className={`mt-0.5 text-base font-bold ${highlight ? "text-gold-300" : "text-paper-100"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gold-500/15 bg-ink-900/40 p-2">
      <div className="text-[10px] tracking-widest text-paper-500">{label}</div>
      <div className="mt-1 text-sm text-paper-100">{value}</div>
    </div>
  );
}

function derivedTiYongSummary(data: MeihuaData): string {
  const a = data.analysis;
  return `${data.tiGua.name}（${data.tiGua.element}）与 ${data.yongGua.name}（${data.yongGua.element}）呈「${a.tiYongRelation}」；体卦月令${a.tiSeasonState}，用卦月令${a.yongSeasonState}。变卦「${a.changedRelation}」，变后体用「${a.changedTiYongRelation}」。`;
}

function useHexLines(upper: string, lower: string): Array<"yang" | "yin"> {
  const uMap: Record<string, Array<"yang" | "yin">> = {
    乾: ["yang", "yang", "yang"],
    兑: ["yang", "yang", "yin"],
    离: ["yang", "yin", "yang"],
    震: ["yang", "yin", "yin"],
    巽: ["yin", "yang", "yang"],
    坎: ["yin", "yang", "yin"],
    艮: ["yin", "yin", "yang"],
    坤: ["yin", "yin", "yin"],
  };
  const l = uMap[lower] ?? ["yang", "yang", "yang"];
  const u = uMap[upper] ?? ["yang", "yang", "yang"];
  return [...l, ...u];
}

function tiYongForTrigram(
  upper: string,
  lower: string,
  data: MeihuaData
): string | undefined {
  const composed = `${upper}${lower}`;
  const tiComposed = `${data.tiGua.name}`;
  const yongComposed = `${data.yongGua.name}`;
  if (composed === tiComposed) return "体卦";
  if (composed === yongComposed) return "用卦";
  return undefined;
}
export default function MeihuaPage() {
  return (
    <Title title="梅花易数">
      <MeihuaClient />
    </Title>
  );
}
