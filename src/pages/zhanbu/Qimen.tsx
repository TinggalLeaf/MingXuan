import Title from "@/components/Title";
import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateQimen } from "mingyu-core/divination/qimen";
import type { QimenMethod } from "mingyu-core/divination/qimen";
import type { QimenScope, QimenData } from "mingyu-core";

/** 定局方法类型，mingyu-core 未导出，从实现源码对照固定取值 */
type QimenJuMethod = "chaibu" | "zhirun";

import QuestionInput from "@/components/divination/QuestionInput";
import MethodChips from "@/components/divination/MethodChips";
import ResultCard from "@/components/divination/ResultCard";
import ErrorBox from "@/components/divination/ErrorBox";
import Disclaimer from "@/components/divination/Disclaimer";
import CharsRise from "@/components/motion/CharsRise";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { QIMEN_EXPLAIN, explainOf } from "@/lib/explain-divination";

type Method = QimenMethod;
type Scope = QimenScope;
type Ju = QimenJuMethod;

const METHOD_OPTS: Array<{ value: Method; label: string; desc: string }> = [
  { value: "zhuanpan", label: "转盘法", desc: "九星随时干转（默认）" },
  { value: "feipan", label: "飞盘法", desc: "地盘不动天盘飞布" },
];

const SCOPE_OPTS: Array<{ value: Scope; label: string; desc: string }> = [
  { value: "hour", label: "时家", desc: "精确到时辰（默认）" },
  { value: "day", label: "日家", desc: "一日大势" },
  { value: "month", label: "月家", desc: "一月运势" },
  { value: "year", label: "年家", desc: "一年大势" },
];

const JU_OPTS: Array<{ value: Ju; label: string; desc: string }> = [
  { value: "chaibu", label: "拆补法", desc: "按节气定局（默认）" },
  { value: "zhirun", label: "置闰法", desc: "超神接气·置闰" },
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

/** 洛书九宫排布：1-9 按 (col,row) 索引 */
const PALACE_POS: Record<number, [number, number]> = {
  4: [0, 0], // 东南
  9: [1, 0],
  2: [2, 0],
  3: [0, 1],
  5: [1, 1],
  7: [2, 1],
  8: [0, 2],
  1: [1, 2],
  6: [2, 2],
};

/** 洛书序：中→乾→兑→艮→离→坎→坤→震→巽（用于九宫格入场级联） */
const LUOSHU_ORDER: Record<number, number> = {
  5: 0, // 中
  6: 1, // 乾
  7: 2, // 兑
  8: 3, // 艮
  9: 4, // 离
  1: 5, // 坎
  2: 6, // 坤
  3: 7, // 震
  4: 8, // 巽
};

function QimenClient() {
  const [question, setQuestion] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [method, setMethod] = useState<Method>("zhuanpan");
  const [scope, setScope] = useState<Scope>("hour");
  const [juMethod, setJuMethod] = useState<Ju>("chaibu");
  const [data, setData] = useState<QimenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onDivine = () => {
    setError(null);
    setBusy(true);
    try {
      const date = buildDate(customDate);
      const result = generateQimen(date, method, scope, juMethod);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "排盘失败，请重试");
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    setData(null);
    setError(null);
    setQuestion("");
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="mb-2 pt-12 text-center">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // QIMEN
        </div>
        <h1 className="title-ornament justify-center text-3xl font-bold text-gold-300">
          <CharsRise text="奇门遁甲" step={110} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-center text-sm text-paper-400">
          九宫四盘 · 值符值使 · 格局应期
        </p>
      </header>

      <QuestionInput
        question={question}
        setQuestion={setQuestion}
        customDate={customDate}
        setCustomDate={setCustomDate}
      />

      <MethodChips<Method>
        label="排盘方法"
        value={method}
        onChange={setMethod}
        options={METHOD_OPTS}
      />

      <MethodChips<Scope>
        label="排盘级别"
        value={scope}
        onChange={setScope}
        options={SCOPE_OPTS}
      />

      <MethodChips<Ju>
        label="定局方法"
        value={juMethod}
        onChange={setJuMethod}
        options={JU_OPTS}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-gold"
          onClick={onDivine}
          disabled={busy}
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "排盘中…" : data ? "重新排盘" : "起局"}
        </button>
        {data && (
          <button type="button" className="btn-ghost text-sm" onClick={onReset}>
            <RefreshCw className="h-4 w-4" />
            再占一局
          </button>
        )}
      </div>

      {error && <ErrorBox message={error} />}

      {data && <QimenResult data={data} question={question} customDate={customDate} />}

      <Disclaimer />
    </div>
  );
}

function QimenResult({
  data,
  question,
  customDate,
}: {
  data: QimenData;
  question: string;
  customDate: string;
}) {
  const dateLabel = customDate
    ? customDate.replace("T", " ")
    : formatDate(new Date(data.timestamp));

  const byGong: Record<number, typeof data.jiuGongGe[number]> = {};
  for (const g of data.jiuGongGe) byGong[g.gong] = g;

  const voidPalaces = new Set((data.voidPalaces ?? []).map((v) => v.palace));
  const horsePalace = data.horseStar?.palace;

  return (
    <>
      <ResultCard
        title={`${data.isYangDun ? "阳遁" : "阴遁"} ${data.juShu}局 · ${scopeLabel(data.scope)}奇门`}
        subtitle={
          <>
            {question && <span className="mr-2">所问：{question}</span>}
            <span>排盘：{dateLabel}</span>
          </>
        }
        badge={
          <>
            <span className="anim-seal inline-block rounded border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-300">
              <TermTip term="值符" text={explainOf(QIMEN_EXPLAIN, "值符")} />
              {"："}
              {data.zhiFu}
            </span>
            <span
              className="anim-seal inline-block rounded border border-cinnabar-500/40 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400"
              style={{ animationDelay: "180ms" }}
            >
              <TermTip term="值使" text={explainOf(QIMEN_EXPLAIN, "值使")} />
              {"："}
              {data.zhiShi}
            </span>
            <span className="rounded border border-paper-500/30 bg-ink-900/40 px-2 py-0.5 text-[11px] text-paper-300">
              {data.method ?? "zhuanpan"} · {data.juMethod ?? "chaibu"}
            </span>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Info label="节气" value={data.timeInfo?.juTerm ?? data.timeInfo?.solarTerm ?? "—"} />
          <Info label="四柱" value={`${data.ganzhi.year} ${data.ganzhi.month} ${data.ganzhi.day} ${data.ganzhi.hour}`} highlight />
          <Info label="旬空" value={(data.voidBranches ?? []).join(" ") || "—"} />
        </div>
      </ResultCard>

      {/* 九宫格 */}
      <ResultCard title="九宫四盘" subtitle="天盘、地盘、九星、八门、八神">
        <div
          key={data.timestamp}
          className="hud-frame hud-scan relative grid grid-cols-3 gap-1 rounded-xl border border-gold-500/20 bg-ink-950 p-2 sm:gap-2 sm:p-3"
        >
          {Array.from({ length: 9 }).map((_, idx) => {
            const gong = Object.keys(PALACE_POS).find(
              (k) =>
                PALACE_POS[Number(k)][0] === idx % 3 &&
                PALACE_POS[Number(k)][1] === Math.floor(idx / 3)
            );
            const gongNum = gong ? Number(gong) : 5;
            const cell = byGong[gongNum];
            const isVoid = voidPalaces.has(gongNum);
            const isHorse = horsePalace === gongNum;
            return (
              <PalaceCell
                key={idx}
                cell={cell}
                isVoid={isVoid}
                isHorse={isHorse}
                delay={(LUOSHU_ORDER[gongNum] ?? idx) * 70}
              />
            );
          })}
        </div>
      </ResultCard>

      {/* 格局标签 */}
      {(data.patternTags?.length ?? 0) > 0 && (
        <ResultCard title="基础格局标签">
          <div className="flex flex-wrap gap-2">
            {data.patternTags!.map((t, ti) => (
              <span
                key={t}
                className="anim-pop rounded border border-gold-500/30 bg-gold-500/10 px-2 py-1 text-xs text-gold-300"
                style={{ animationDelay: `${ti * 80}ms` }}
              >
                {t}
              </span>
            ))}
          </div>
          {(data.patternDetails?.length ?? 0) > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-paper-300">
              {data.patternDetails!.map((p, i) => (
                <li key={i} className="rounded bg-ink-900/40 p-2">
                  <span className="font-bold text-gold-300">{p.tag}</span>
                  <span className="ml-2 text-paper-300">{p.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </ResultCard>
      )}

      {/* 经典格局 */}
      {(data.classicPatterns?.length ?? 0) > 0 && (
        <ResultCard title="经典格局">
          <ul className="space-y-2 text-sm">
            {data.classicPatterns!.map((p, i) => (
              <li
                key={i}
                className={`rounded border p-3 ${
                  p.type === "good"
                    ? "border-jade-400/40 bg-jade-400/5"
                    : p.type === "bad"
                      ? "border-cinnabar-500/40 bg-cinnabar-500/5"
                      : "border-gold-500/30 bg-ink-900/40"
                }`}
              >
                <div className="font-bold text-paper-100">{p.name}</div>
                <p className="mt-1 text-xs text-paper-300">{p.summary}</p>
                {p.palaces && p.palaces.length > 0 && (
                  <div className="mt-1 text-[11px] text-paper-500">
                    涉及宫位：{p.palaces.join("、")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* 方位建议 */}
      {data.directions && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {(data.directions.goodDirections ?? []).length > 0 && (
            <ResultCard title="利于方位">
              <ul className="space-y-2 text-sm">
                {data.directions.goodDirections.map((d, i) => (
                  <li key={i} className="rounded border border-jade-400/30 bg-ink-900/40 p-2">
                    <div className="font-bold text-jade-400">
                      {d.gong}宫 {d.name}（{d.direction}）· {d.use}
                    </div>
                    <p className="mt-1 text-[11px] text-paper-400">
                      {d.reasons.join("；")}
                    </p>
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}
          {(data.directions.avoidDirections ?? []).length > 0 && (
            <ResultCard title="避忌方位">
              <ul className="space-y-2 text-sm">
                {data.directions.avoidDirections.map((d, i) => (
                  <li key={i} className="rounded border border-cinnabar-500/30 bg-ink-900/40 p-2">
                    <div className="font-bold text-cinnabar-400">
                      {d.gong}宫 {d.name}（{d.direction}）· {d.use}
                    </div>
                    <p className="mt-1 text-[11px] text-paper-400">
                      {d.reasons.join("；")}
                    </p>
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}
        </div>
      )}

      {/* 应期 */}
      {data.yingQi && (
        <ResultCard
          title="应期节奏"
          subtitle={`节奏：${data.yingQi.rhythm ?? "—"}`}
        >
          <p className="text-sm leading-relaxed text-paper-200">{data.yingQi.description}</p>
          {data.yingQi.triggerConditions && data.yingQi.triggerConditions.length > 0 && (
            <div className="mt-2">
              <h3 className="mb-1 text-xs tracking-widest text-paper-400">触发条件</h3>
              <ul className="space-y-1 text-xs text-paper-300">
                {data.yingQi.triggerConditions.map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </div>
          )}
        </ResultCard>
      )}
      {/* AI 白话解读：只传核心字段摘要，控制 data 体积 */}
      <div className="anim-fade-up">
        <AiInterpret
          topic="奇门遁甲局"
          question={question || undefined}
          data={{
            scope: scopeLabel(data.scope),
            yinYang: data.isYangDun ? "阳遁" : "阴遁",
            juShu: data.juShu,
            zhiFu: data.zhiFu,
            zhiShi: data.zhiShi,
            ganzhi: data.ganzhi,
            jiuGongGe: data.jiuGongGe,
            patternTags: data.patternTags,
            classicPatterns: data.classicPatterns,
            directions: data.directions,
            yingQi: data.yingQi,
          }}
        />
      </div>
    </>
  );
}

function PalaceCell({
  cell,
  isVoid,
  isHorse,
  delay = 0,
}: {
  cell:
    | {
        gong: number;
        name: string;
        direction: string;
        element: string;
        tianPan: { star: string; stem: string };
        diPan: { stem: string };
        renPan: { door: string };
        shenPan: { god: string };
      }
    | undefined;
  isVoid: boolean;
  isHorse: boolean;
  /** 入场级联延迟（ms，按洛书序） */
  delay?: number;
}) {
  if (!cell) {
    return (
      <div
        className="anim-scale-in aspect-square rounded-lg border border-dashed border-gold-500/15 bg-ink-900/30 p-2 text-center text-[10px] text-paper-500"
        style={{ animationDelay: `${delay}ms` }}
      >
        中宫寄宫
      </div>
    );
  }
  return (
    <div
      className={`anim-scale-in aspect-square rounded-lg border p-1.5 sm:p-2 ${
        cell.gong === 5
          ? "border-gold-500/40 bg-gold-500/10"
          : "border-gold-500/20 bg-ink-900/60"
      } relative overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute right-1 top-1 text-[10px] font-bold text-gold-300">
        {cell.gong} · {cell.name}
      </div>
      <div className="absolute left-1 top-1 text-[10px] text-paper-500">
        {cell.direction}
      </div>
      {isVoid && (
        <span className="absolute right-1 top-4 text-[9px] text-cinnabar-400">空</span>
      )}
      {isHorse && (
        <span className="absolute right-1 top-4 text-[9px] text-jade-400">马</span>
      )}
      <div className="mt-4 space-y-1 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-paper-500">天盘</span>
          <span className="font-bold text-paper-100">
            {cell.tianPan.stem} ·{" "}
            <TermTip term={cell.tianPan.star} text={explainOf(QIMEN_EXPLAIN, cell.tianPan.star)} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-paper-500">地盘</span>
          <span className="font-bold text-paper-200">{cell.diPan.stem}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-paper-500">八门</span>
          <span className="font-bold text-jade-400">
            <TermTip term={cell.renPan.door} text={explainOf(QIMEN_EXPLAIN, cell.renPan.door)} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-paper-500">八神</span>
          <span className="font-bold text-cinnabar-400">
            <TermTip term={cell.shenPan.god} text={explainOf(QIMEN_EXPLAIN, cell.shenPan.god)} />
          </span>
        </div>
      </div>
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
        className={`mt-0.5 text-sm font-bold ${highlight ? "text-gold-300" : "text-paper-100"}`}
      >
        {value}
      </div>
    </div>
  );
}

function scopeLabel(s?: QimenScope): string {
  switch (s) {
    case "hour":
      return "时家";
    case "day":
      return "日家";
    case "month":
      return "月家";
    case "year":
      return "年家";
    default:
      return "时家";
  }
}
export default function QimenPage() {
  return (
    <Title title="奇门遁甲">
      <QimenClient />
    </Title>
  );
}
