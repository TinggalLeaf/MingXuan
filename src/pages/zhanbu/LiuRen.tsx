import Title from "@/components/Title";
import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateLiuren } from "mingyu-core/divination/liuren";
import type { LiurenData } from "mingyu-core";

import QuestionInput from "@/components/divination/QuestionInput";
import ResultCard from "@/components/divination/ResultCard";
import ErrorBox from "@/components/divination/ErrorBox";
import Disclaimer from "@/components/divination/Disclaimer";
import WuxingChar from "@/components/divination/WuxingChar";
import CharsRise from "@/components/motion/CharsRise";
import AiInterpret from "@/components/ai/AiInterpret";
import TermTip from "@/components/common/TermTip";
import { LIUREN_EXPLAIN, explainOf } from "@/lib/explain-divination";

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

const TWELVE_BRANCHES = [
  "子", "丑", "寅", "卯", "辰", "巳",
  "午", "未", "申", "酉", "戌", "亥",
];

function LiuRenClient() {
  const [question, setQuestion] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [data, setData] = useState<LiurenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onDivine = () => {
    setError(null);
    setBusy(true);
    try {
      const date = buildDate(customDate);
      const result = generateLiuren(date);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "起课失败，请重试");
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
          MINGXUAN // LIUREN
        </div>
        <h1 className="title-ornament justify-center text-3xl font-bold text-gold-300">
          <CharsRise text="大六壬" step={130} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-center text-sm text-paper-400">
          月将贵人 · 四课三传 · 十二天将
        </p>
      </header>

      <QuestionInput
        question={question}
        setQuestion={setQuestion}
        customDate={customDate}
        setCustomDate={setCustomDate}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-gold"
          onClick={onDivine}
          disabled={busy}
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "起课中…" : data ? "重新起课" : "起课"}
        </button>
        {data && (
          <button type="button" className="btn-ghost text-sm" onClick={onReset}>
            <RefreshCw className="h-4 w-4" />
            再占一课
          </button>
        )}
      </div>

      {error && <ErrorBox message={error} />}

      {data && <LiuRenResult data={data} question={question} customDate={customDate} />}

      <Disclaimer />
    </div>
  );
}

function LiuRenResult({
  data,
  question,
  customDate,
}: {
  data: LiurenData;
  question: string;
  customDate: string;
}) {
  const dateLabel = customDate
    ? customDate.replace("T", " ")
    : formatDate(new Date(data.timestamp));

  return (
    <>
      <ResultCard
        title={`${data.monthLeader}月将 · ${data.dayNight ?? "—"}`}
        subtitle={
          <>
            {question && <span className="mr-2">所问：{question}</span>}
            <span>起课：{dateLabel}</span>
          </>
        }
        badge={
          <>
            <span className="anim-pop rounded border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-300">
              <TermTip term="月将" text={explainOf(LIUREN_EXPLAIN, "月将")} /> {data.monthLeader}
            </span>
            {data.noblemanBranch && (
              <span
                className="anim-pop rounded border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-300"
                style={{ animationDelay: "140ms" }}
              >
                <TermTip term="贵人" text={explainOf(LIUREN_EXPLAIN, "贵人")} />临 {data.noblemanBranch}
              </span>
            )}
            {data.xunKong && data.xunKong.length > 0 && (
              <span className="rounded border border-cinnabar-500/40 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400">
                旬空 {data.xunKong.join(" ")}
              </span>
            )}
            {data.transmissionRule && (
              <span className="rounded border border-paper-500/30 bg-ink-900/40 px-2 py-0.5 text-[11px] text-paper-300">
                {data.transmissionRule}
              </span>
            )}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-2 text-xs text-paper-300 sm:grid-cols-4">
          <Info label="占时" value={data.divinationBranch} highlight />
          <Info label="日干" value={data.ganzhi.day.slice(0, 1)} />
          <Info label="日支" value={data.ganzhi.day.slice(1, 2)} />
          <Info label="月建" value={data.ganzhi.month} />
        </div>
      </ResultCard>

      {/* 四课 */}
      <ResultCard title="四课" subtitle="一课至四课：上神下神与天将">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="text-paper-400">
              <tr>
                <th className="py-1 text-left font-normal">课序</th>
                <th className="py-1 text-left font-normal">上神（天盘）</th>
                <th className="py-1 text-left font-normal">下神（地盘）</th>
                <th className="py-1 text-left font-normal">天将</th>
                <th className="py-1 text-left font-normal">关系</th>
                <th className="py-1 text-left font-normal">备注</th>
              </tr>
            </thead>
            <tbody key={data.timestamp}>
              {data.fourLessons.map((l, li) => (
                <tr
                  key={l.name}
                  className="anim-fade-up border-t border-gold-500/10"
                  style={{ animationDelay: `${li * 80}ms` }}
                >
                  <td className="py-1.5 pr-2 font-bold text-gold-300">{l.name}</td>
                  <td className="py-1.5 pr-2">
                    <WuxingChar char={l.upper} className="text-base font-bold" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <WuxingChar char={l.lower} className="text-base font-bold" />
                  </td>
                  <td className="py-1.5 pr-2 text-cinnabar-400">
                    <TermTip term={l.god} text={explainOf(LIUREN_EXPLAIN, l.god)} />
                  </td>
                  <td className="py-1.5 pr-2 text-paper-300">{l.relation}</td>
                  <td className="py-1.5 text-[11px] text-paper-500">{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.lessonSummary && (
          <p className="mt-3 text-xs leading-relaxed text-paper-300">{data.lessonSummary}</p>
        )}
      </ResultCard>

      {/* 三传 */}
      <ResultCard
        title="三传"
        subtitle={`${data.transmissionRule ?? "—"} · ${data.transmissionPattern ?? ""}`}
      >
        <div key={data.timestamp} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.threeTransmissions.map((t, ti) => (
            <div
              key={t.stage}
              className={`anim-fade-up hud-frame rounded-lg border p-3 ${
                t.stage === "初传"
                  ? "border-gold-500/40 bg-gold-500/5"
                  : t.stage === "中传"
                    ? "border-jade-400/40 bg-jade-400/5"
                    : "border-cinnabar-500/40 bg-cinnabar-500/5"
              }`}
              style={{ animationDelay: `${ti * 150}ms` }}
            >
              <div className="text-xs tracking-widest text-paper-400">
                <TermTip term={t.stage} text={explainOf(LIUREN_EXPLAIN, t.stage)} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <WuxingChar char={t.branch} className="gz-char" />
                <span className="text-sm text-paper-300">{t.wuxing ?? ""}</span>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-paper-500">天将：</span>
                <span className="text-cinnabar-400">
                  <TermTip term={t.god} text={explainOf(LIUREN_EXPLAIN, t.god)} />
                </span>
              </div>
              <div className="mt-1 text-xs text-paper-300">{t.relation}</div>
              {t.seasonState && (
                <div className="mt-1 text-[11px] text-paper-500">
                  月令：{t.seasonState}
                  {t.isVoid && <span className="ml-2 text-cinnabar-400">空亡</span>}
                </div>
              )}
              {t.dayRelation && (
                <div className="mt-1 text-[11px] text-paper-500">日辰：{t.dayRelation}</div>
              )}
              {t.note && <p className="mt-1 text-[11px] text-paper-400">{t.note}</p>}
            </div>
          ))}
        </div>
        {data.transmissionSummary && (
          <p className="mt-3 text-xs leading-relaxed text-paper-300">
            {data.transmissionSummary}
          </p>
        )}
      </ResultCard>

      {/* 天盘 / 地盘 */}
      <ResultCard title="天盘地盘" subtitle="地盘十二支固定；天盘每宫加月将顺布">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-paper-400">
              <tr>
                <th className="py-1 text-left font-normal">地支</th>
                {TWELVE_BRANCHES.map((b) => (
                  <th key={b} className="px-1 py-1 text-center font-normal">
                    <WuxingChar char={b} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gold-500/10">
                <td className="py-1 text-paper-400">地盘</td>
                {TWELVE_BRANCHES.map((b) => (
                  <td key={b} className="py-1 text-center text-paper-200">
                    <WuxingChar char={b} />
                  </td>
                ))}
              </tr>
              <tr className="border-t border-gold-500/10">
                <td className="py-1 text-paper-400">天盘支</td>
                {TWELVE_BRANCHES.map((_, i) => {
                  const cell = data.heavenlyPlate[i];
                  return (
                    <td key={i} className="py-1 text-center">
                      <WuxingChar char={cell.branch} />
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-gold-500/10">
                <td className="py-1 text-paper-400">天盘将</td>
                {TWELVE_BRANCHES.map((_, i) => (
                  <td key={i} className="py-1 text-center text-[11px] text-cinnabar-400">
                    {data.heavenlyPlate[i].god}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </ResultCard>

      {/* 课体 / 经典规则 */}
      {(data.guaTi?.length ?? 0) > 0 && (
        <ResultCard title="课体">
          <div className="flex flex-wrap gap-2">
            {(data.guaTi ?? []).map((g) => (
              <span
                key={g}
                className="rounded border border-gold-500/30 bg-gold-500/10 px-2 py-1 text-xs text-gold-300"
              >
                {g}
              </span>
            ))}
          </div>
        </ResultCard>
      )}

      {(data.classicalRules?.length ?? 0) > 0 && (
        <ResultCard title="经典规则">
          <ul className="space-y-2 text-sm">
            {data.classicalRules!.map((r, i) => (
              <li key={i} className="rounded border border-gold-500/15 bg-ink-900/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-paper-100">{r.rule}</span>
                  <span className="text-[10px] text-paper-500">{r.category}</span>
                </div>
                <p className="mt-1 text-xs text-paper-300">{r.summary}</p>
                <p className="mt-1 text-[10px] text-paper-500">来源：{r.source}</p>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* 神煞 */}
      {(data.shenShaFacts?.length ?? 0) > 0 && (
        <ResultCard title="神煞">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {data.shenShaFacts!.map((s, i) => (
              <div key={i} className="rounded border border-gold-500/15 bg-ink-900/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-paper-100">
                    {s.name}
                    {s.targetType === "天干" || s.targetType === "地支" ? (
                      <WuxingChar char={s.target} className="ml-2 text-base" />
                    ) : null}
                  </span>
                  <span className="text-[10px] text-paper-500">{s.basis}</span>
                </div>
                <p className="mt-1 text-[11px] text-paper-400">{s.rule}</p>
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {data.shenShaSummary && data.shenShaSummary.length > 0 && (
        <ResultCard title="神煞汇总">
          <ul className="space-y-1 text-xs text-paper-300">
            {data.shenShaSummary.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* AI 白话解读 */}
      <div className="anim-fade-up">
        <AiInterpret topic="大六壬课" question={question || undefined} data={data} />
      </div>
    </>
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
export default function LiuRenPage() {
  return (
    <Title title="大六壬">
      <LiuRenClient />
    </Title>
  );
}
