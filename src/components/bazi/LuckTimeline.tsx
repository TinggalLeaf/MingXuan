
import { useMemo, useState } from "react";
import type { BaziChartResult } from "mingyu-core/bazi";
import type { LiunianInfo, LuckCycle } from "./types";
import { charWuxingClass } from "@/lib/wuxing";

interface LuckTimelineProps {
  chart: BaziChartResult;
  /** 当前年龄（用于高亮当前大运） */
  currentAge?: number;
}

/** 当前年龄 = 大运起始年龄 + 1（首运为 0 起步）—— 选最贴近当前真实年龄的步数 */
function findCurrentCycleIdx(cycles: LuckCycle[], currentAge: number): number {
  if (cycles.length === 0) return -1;
  let best = -1;
  let bestDelta = Infinity;
  cycles.forEach((c, i) => {
    const center = c.age + 5;
    const d = Math.abs(center - currentAge);
    if (d < bestDelta) {
      bestDelta = d;
      best = i;
    }
  });
  return best;
}

export default function LuckTimeline({ chart, currentAge }: LuckTimelineProps) {
  const cycles = chart.luckInfo?.cycles ?? [];
  const [openIdx, setOpenIdx] = useState<number>(-1);

  const currentIdx = useMemo(
    () => (currentAge !== undefined ? findCurrentCycleIdx(cycles, currentAge) : -1),
    [cycles, currentAge]
  );

  if (cycles.length === 0) {
    return (
      <section className="panel-console p-4 sm:p-6">
        <h2 className="console-title mb-3 text-base">
          <span className="seq">04</span>大运流年
        </h2>
        <p className="text-sm text-paper-400">当前盘无大运数据。</p>
      </section>
    );
  }

  return (
    <section className="panel-console p-4 sm:p-6">
      <h2 className="console-title mb-3 text-base">
        <span className="seq">04</span>大运流年
      </h2>

      <div className="mb-3 grid grid-cols-2 gap-3 text-[11px] text-paper-400 sm:grid-cols-4">
        <div>
          <div className="console-label">起运</div>
          <div className="mt-0.5 console-value text-paper-200">{chart.luckInfo.startInfo || "—"}</div>
        </div>
        <div>
          <div className="console-label">交运</div>
          <div className="mt-0.5 console-value text-paper-200">{chart.luckInfo.handoverInfo || "—"}</div>
        </div>
        <div>
          <div className="console-label">大运数</div>
          <div className="mt-0.5 console-value text-paper-200">{cycles.length} 步</div>
        </div>
        <div>
          <div className="console-label">高亮</div>
          <div className="mt-0.5 text-gold-300">
            {currentIdx >= 0 ? `第 ${currentIdx + 1} 步` : "需当前年龄"}
          </div>
        </div>
      </div>

      {/* 时间线：横向滚动 */}
      <div className="overflow-x-auto pb-2">
        <ol className="flex min-w-max items-stretch gap-2">
          {cycles.map((c, i) => {
            const isCurrent = i === currentIdx;
            const isOpen = openIdx === i;
            return (
              <li
                key={`${c.age}-${c.ganZhi}-${i}`}
                className={`anim-fade-right flex w-32 shrink-0 flex-col rounded-lg border p-2 transition-all ${
                  isCurrent
                    ? "border-gold-500/70 bg-gold-500/10 shadow-[var(--shadow-glow-gold)]"
                    : "border-gold-500/15 bg-ink-900/40"
                }`}
                style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}
              >
                <div className="flex items-center justify-between text-[10px] text-paper-500">
                  <span className="console-label">第 {String(i + 1).padStart(2, "0")} 步</span>
                  {isCurrent && <span className="console-value rounded bg-gold-500/80 px-1 text-[9px] font-bold text-ink-950">当前</span>}
                </div>

                <div className="mt-1 flex items-center justify-center gap-1">
                  <span className={`gz-char text-xl ${charWuxingClass(c.ganZhi?.[0] ?? "")}`}>
                    {c.ganZhi?.[0] ?? "—"}
                  </span>
                  <span className={`gz-char text-xl ${charWuxingClass(c.ganZhi?.[1] ?? "")}`}>
                    {c.ganZhi?.[1] ?? "—"}
                  </span>
                </div>

                <div className="mt-1 text-center text-[11px] text-paper-300">
                  <span className="console-value">{c.age}</span>–<span className="console-value">{c.age + 9}</span> 岁
                </div>
                <div className="text-center text-[10px] text-paper-500">
                  {c.year}–{c.year + 9}
                </div>
                <div className="mt-1 text-center text-[11px] text-gold-400">
                  {c.type || (c.isXiaoyun ? "小运" : "大运")}
                </div>

                <button
                  type="button"
                  className="mt-2 rounded border border-gold-500/30 px-1.5 py-0.5 text-[10px] text-gold-300 hover:bg-gold-500/10"
                  onClick={() => setOpenIdx(isOpen ? -1 : i)}
                >
                  {isOpen ? "收起流年" : `查看 ${(c.years?.length ?? 0) || (c.resolvedYears?.length ?? 0) || 10} 流年`}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 展开：流年 */}
      {openIdx >= 0 && cycles[openIdx] && (
        <LiuianList cycle={cycles[openIdx]} />
      )}
    </section>
  );
}

function LiuianList({ cycle }: { cycle: LuckCycle }) {
  const liunians: LiunianInfo[] = cycle.resolvedYears?.length
    ? cycle.resolvedYears
    : cycle.years?.length
    ? cycle.years
    : Array.from({ length: 10 }, (_, i) => {
        // 兜底：当核心库未提供时，按 10 年空白占位（避免空白页面）
        return {
          year: (cycle.year ?? 0) + i,
          age: (cycle.age ?? 0) + i,
          ganZhi: "—",
          tenGod: "",
          tenGodZhi: "",
        } satisfies LiunianInfo;
      });

  return (
    <div className="anim-unroll mt-4 rounded-lg border border-gold-500/15 bg-ink-900/30 p-3">
      <div className="mb-2 text-xs tracking-widest text-paper-400">
        {cycle.ganZhi} · 流年（{cycle.age}–{cycle.age + liunians.length - 1} 岁）
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {liunians.map((ln, idx) => (
          <div
            key={`${ln.year}-${idx}`}
            className="anim-fade-up rounded border border-gold-500/15 bg-ink-800/40 p-2 text-center"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-center gap-0.5">
              <span className={`text-base font-bold ${charWuxingClass(ln.ganZhi?.[0] ?? "")}`}>
                {ln.ganZhi?.[0] ?? "—"}
              </span>
              <span className={`text-base font-bold ${charWuxingClass(ln.ganZhi?.[1] ?? "")}`}>
                {ln.ganZhi?.[1] ?? "—"}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-paper-400">
              {ln.year} · {ln.age}岁
            </div>
            <div className="mt-0.5 text-[10px] text-gold-400">
              {ln.tenGod || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}