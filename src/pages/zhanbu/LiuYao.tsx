import Title from "@/components/Title";
import { useMemo, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateLiuyao } from "mingyu-core/divination/liuyao";
import type { LiuyaoData } from "mingyu-core";
import type {
  LiuyaoGenerationOptions,
  LiuyaoGenerationMethod,
} from "mingyu-core/divination/liuyao";

import QuestionInput from "@/components/divination/QuestionInput";
import MethodChips from "@/components/divination/MethodChips";
import LiuYaoThrow from "@/components/divination/LiuYaoThrow";
import GuaLines, { yaoArrayToLines } from "@/components/divination/GuaView";
import ResultCard from "@/components/divination/ResultCard";
import ErrorBox from "@/components/divination/ErrorBox";
import Disclaimer from "@/components/divination/Disclaimer";
import WuxingChar from "@/components/divination/WuxingChar";
import CharsRise from "@/components/motion/CharsRise";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { LIUYAO_EXPLAIN, explainOf } from "@/lib/explain-divination";

type Method = LiuyaoGenerationMethod;

const METHOD_OPTS: Array<{ value: Method; label: string; desc: string }> = [
  { value: "coins", label: "手摇三钱", desc: "逐爻投掷铜钱，可观动变轨迹" },
  { value: "time", label: "时间起卦", desc: "依起卦时辰推算六爻" },
  { value: "manual", label: "直接随机", desc: "由算法随机摇卦" },
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildDate(customDate: string): Date | undefined {
  if (!customDate) return undefined;
  const d = new Date(customDate);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function LiuYaoClient() {
  const [question, setQuestion] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [method, setMethod] = useState<Method>("coins");
  const [yaos, setYaos] = useState<number[]>([]);
  const [coinThrows, setCoinThrows] = useState<
    Array<{ coins: [2 | 3, 2 | 3, 2 | 3]; total: 6 | 7 | 8 | 9 }>
  >([]);
  const [data, setData] = useState<LiuyaoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready =
    (method === "coins" && yaos.length === 6) ||
    method === "time" ||
    method === "manual";

  const onDivine = () => {
    setError(null);
    setBusy(true);
    try {
      const date = buildDate(customDate);
      const options: LiuyaoGenerationOptions = { method };
      if (method === "coins" && coinThrows.length === 6) {
        // coins 方法：库自动由 coinThrows 推算六爻，禁止同时传 yaos
        options.coinThrows = coinThrows;
      } else if (method === "manual") {
        // 手工输入：库只接受 yaos
        options.yaos = yaos;
      }
      const result = generateLiuyao(date, options);
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
    setYaos([]);
    setCoinThrows([]);
    setQuestion("");
  };

  const throwBlock = useMemo(
    () => (
      <LiuYaoThrow
        yaos={yaos}
        setYaos={(v) => {
          setYaos(v);
          if (v.length === 6) {
            // 自动起卦：coins 方法只传 coinThrows，库自动由三钱推算六爻
            setTimeout(() => {
              setError(null);
              setBusy(true);
              try {
                const date = buildDate(customDate);
                const opts: LiuyaoGenerationOptions = {
                  method: "coins",
                  coinThrows,
                };
                setData(generateLiuyao(date, opts));
              } catch (e) {
                setError(e instanceof Error ? e.message : "起卦失败");
              } finally {
                setBusy(false);
              }
            }, 50);
          }
        }}
        coinThrows={coinThrows}
        setCoinThrows={setCoinThrows}
      />
    ),
    [yaos, coinThrows, customDate]
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="mb-2 pt-12 text-center">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // LIUYAO
        </div>
        <h1 className="title-ornament justify-center text-3xl font-bold text-gold-300">
          <CharsRise text="六爻纳甲" step={110} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-center text-sm text-paper-400">
          京房八宫 · 三钱起卦 · 用神生克
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
          if (v !== "coins") {
            setYaos([]);
            setCoinThrows([]);
          }
        }}
        options={METHOD_OPTS}
      />

      {method === "coins" && throwBlock}

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

      {data && <LiuYaoResult data={data} question={question} customDate={customDate} />}

      <Disclaimer />
    </div>
  );
}

function LiuYaoResult({
  data,
  question,
  customDate,
}: {
  data: LiuyaoData;
  question: string;
  customDate: string;
}) {
  const original = yaoArrayToLines(data.yaoArray);
  const changedLines = data.changingYaos.map((c) => c.isChanging);

  const changedHexName = data.changedName;

  // 变卦卦画：将动爻反转
  const changedArr = data.yaoArray.map((v) => (v === 6 ? 9 : v === 9 ? 6 : v));
  const changed = yaoArrayToLines(changedArr);

  const worldYao = data.worldAndResponse?.[0];
  const responseYao = data.worldAndResponse?.[1];

  const candidates = data.evidenceAnalysis?.candidates ?? [];
  const selected = data.evidenceAnalysis?.selectedCandidate ?? null;
  const structureFacts = data.evidenceAnalysis?.structureFacts ?? [];
  const timingSummary = data.evidenceAnalysis?.timingSummaryFact;
  const timingFacts = data.evidenceAnalysis?.timingFacts ?? [];

  const dateLabel = customDate
    ? customDate.replace("T", " ")
    : formatDate(new Date(data.timestamp));

  return (
    <>
      {/* 总览 */}
      <ResultCard
        title={`${data.originalName}${changedHexName ? ` → ${changedHexName}` : ""}`}
        subtitle={
          <>
            {question && <span className="mr-2">所问：{question}</span>}
            <span>起卦：{dateLabel}</span>
          </>
        }
        badge={
          <>
            <span className="rounded border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-300">
              {data.palace.name}宫 · {data.palace.wuxing}
              {data.palaceStage ? ` · ${data.palaceStage}` : ""}
            </span>
            {data.specialPattern && (
              <span className="rounded border border-cinnabar-500/40 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400">
                {data.specialPattern}
              </span>
            )}
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <HexagramPanel
            title="本卦"
            name={data.originalName}
            lines={original.lines}
            changing={changedLines}
            highlight="ben"
          />
          {changedHexName ? (
            <HexagramPanel
              title="变卦"
              name={changedHexName}
              lines={changed.lines}
              changing={[]}
              highlight="bian"
            />
          ) : (
            <div className="panel-console flex items-center justify-center p-6 text-sm text-paper-500">
              无动爻，本卦即终卦
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-paper-300 sm:grid-cols-4">
          <Info label="月建" value={data.ganzhi.month} />
          <Info label="日辰" value={data.ganzhi.day} highlight />
          <Info label="时支" value={data.ganzhi.hour} />
          <Info label="旬空" value={data.voidBranches.join(" ") || "—"} />
        </div>
      </ResultCard>

      {/* 装卦逐爻 */}
      <ResultCard
        title="装卦六爻"
        subtitle={`世爻 · 应爻标记。世：第${worldYao || "—"}爻，应：第${responseYao || "—"}爻`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="text-paper-400">
              <tr>
                <th className="py-1 text-left font-normal">爻</th>
                <th className="py-1 text-left font-normal">六神</th>
                <th className="py-1 text-left font-normal">六亲</th>
                <th className="py-1 text-left font-normal">纳甲</th>
                <th className="py-1 text-left font-normal">五行</th>
                <th className="py-1 text-left font-normal">动静</th>
                <th className="py-1 text-left font-normal">变爻</th>
                <th className="py-1 text-left font-normal">月令</th>
                <th className="py-1 text-left font-normal">备注</th>
              </tr>
            </thead>
            <tbody key={data.timestamp}>
              {[...data.yaosDetail]
                .map((d, i) => ({ d, originalPos: i }))
                .reverse()
                .map(({ d, originalPos }, rowIdx) => {
                  const pos = d.position;
                  const role =
                    pos === Number(worldYao)
                      ? "世"
                      : pos === Number(responseYao)
                        ? "应"
                        : "";
                  return (
                    <tr
                      key={originalPos}
                      className={`anim-fade-up border-t border-gold-500/10 ${d.isChanging ? "bg-cinnabar-500/5" : ""}`}
                      style={{ animationDelay: `${rowIdx * 70}ms` }}
                    >
                      <td className="py-1.5 pr-2 text-paper-200">
                        {pos}
                        {role && (
                          <span className="ml-1 rounded bg-gold-500/20 px-1 text-[10px] text-gold-300">
                            {role}
                          </span>
                        )}
                        {role && (
                          <TermTip
                            term={role === "世" ? "世爻" : "应爻"}
                            text={explainOf(LIUYAO_EXPLAIN, role === "世" ? "世爻" : "应爻")}
                          />
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-paper-100">
                        {d.sixGod ? (
                          <TermTip term={d.sixGod} text={explainOf(LIUYAO_EXPLAIN, d.sixGod)} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-paper-100">
                        <TermTip term={d.sixRelative} text={explainOf(LIUYAO_EXPLAIN, d.sixRelative)} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <WuxingChar char={d.najiaDizhi} className="text-base font-bold" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <span className="text-paper-300">{d.wuxing}</span>
                      </td>
                      <td className="py-1.5 pr-2">
                        {d.isChanging ? (
                          <span className="anim-flicker text-cinnabar-400">动</span>
                        ) : (
                          <span className="text-paper-500">静</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2">
                        {d.changedYao ? (
                          <span>
                            <WuxingChar char={d.changedYao.dizhi} className="font-bold" />
                            <span className="ml-1 text-paper-500">{d.changedYao.liuqin}</span>
                            {d.changeRelations && d.changeRelations.length > 0 && (
                              <span className="ml-1 text-[10px] text-paper-400">
                                {d.changeRelations.join("·")}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-paper-500">—</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-paper-400">
                        {d.seasonState ? (
                          <span
                            className={
                              d.seasonState === "旺" || d.seasonState === "相"
                                ? "text-jade-400"
                                : "text-paper-400"
                            }
                          >
                            {d.seasonState}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 text-[11px] text-paper-500">
                        {d.isVoid && <span className="mr-1">空</span>}
                        {d.isDayClash && <span className="mr-1">日冲</span>}
                        {d.isMonthBreak && <span className="mr-1">月破</span>}
                        {d.isRuMu && <span className="mr-1">入墓</span>}
                        {d.isSanxing && d.sanxingType && (
                          <span className="mr-1">三刑·{d.sanxingType}</span>
                        )}
                        {d.isLiuhe && d.liuhePartner && (
                          <span className="mr-1">六合·{d.liuhePartner}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </ResultCard>

      {/* 用神 */}
      {selected && (
        <ResultCard
          title="用神分析"
          subtitle={`主题：${data.evidenceAnalysis?.topic ?? "general"} · 选定候选：${selected.label}`}
        >
          <p className="text-sm leading-relaxed text-paper-200">{selected.reason}</p>
          {selected.relative && (
            <p className="mt-2 text-xs text-paper-400">
              <TermTip term="用神" text={explainOf(LIUYAO_EXPLAIN, "用神")} />
              {"："}
              {selected.relative}
              {selected.position ? ` · 第${selected.position}爻` : ""}
            </p>
          )}
        </ResultCard>
      )}

      {candidates.length > 0 && (
        <ResultCard title="用神候选" subtitle="按问题主题罗列可能的取用范围">
          <ul className="space-y-2 text-sm text-paper-300">
            {candidates.slice(0, 6).map((c) => (
              <li key={c.key} className="rounded border border-gold-500/15 bg-ink-900/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-paper-100">{c.label}</span>
                  <span
                    className={
                      c.status === "已匹配"
                        ? "text-[10px] text-jade-400"
                        : "text-[10px] text-paper-500"
                    }
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-paper-400">{c.reason}</p>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* 卦内结构 / 应期 */}
      {structureFacts.length > 0 && (
        <ResultCard title="卦内结构">
          <ul className="space-y-2 text-sm text-paper-300">
            {structureFacts.map((s) => (
              <li key={s.key} className="rounded border border-gold-500/15 bg-ink-900/40 p-2">
                <div className="font-bold text-paper-100">{s.kind}</div>
                <p className="mt-1 text-xs text-paper-400">{s.originalText}</p>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {timingFacts.length > 0 && (
        <ResultCard title="应期节奏" subtitle={timingSummary?.status}>
          <ul className="space-y-2 text-sm text-paper-300">
            {timingFacts.map((t) => (
              <li key={t.key} className="rounded border border-gold-500/15 bg-ink-900/40 p-2">
                <span className="font-bold text-paper-100">{t.type}</span>
                <p className="mt-1 text-xs text-paper-400">{t.promptText}</p>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* 三钱轨迹 */}
      {data.generation?.coinThrows && data.generation.coinThrows.length > 0 && (
        <ResultCard title="三钱投掷轨迹">
          <ol className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
            {data.generation.coinThrows.map((t, i) => (
              <li
                key={i}
                className="rounded border border-gold-500/15 bg-ink-900/40 p-2 text-center"
              >
                <div className="text-[10px] text-paper-500">第{i + 1}爻</div>
                <div className="mt-1 text-paper-100">
                  {t.coins.join(" · ")}
                </div>
                <div className="mt-1 font-bold text-gold-300">合 {t.total}</div>
              </li>
            ))}
          </ol>
        </ResultCard>
      )}

      {/* AI 白话解读 */}
      <div className="anim-fade-up">
        <AiInterpret topic="六爻卦" question={question || undefined} data={data} />
      </div>
    </>
  );
}

function HexagramPanel({
  title,
  name,
  lines,
  changing,
  highlight,
}: {
  title: string;
  name: string;
  lines: Array<"yang" | "yin">;
  changing: boolean[];
  highlight: "ben" | "hu" | "bian";
}) {
  return (
    <div className="panel-console hud-frame p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gold-300">{title}</h3>
        <span className="text-xs text-paper-400">{name}</span>
      </div>
      <GuaLines lines={lines} changing={changing} highlight={highlight} />
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
export default function LiuYaoPage() {
  return (
    <Title title="六爻纳甲">
      <LiuYaoClient />
    </Title>
  );
}
