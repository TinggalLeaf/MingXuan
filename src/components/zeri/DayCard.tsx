import type { AlmanacDayCandidate } from "mingyu-core";

export type DayStatus = "可用候选" | "条件候选" | "慎用候选";

const STATUS_STYLE: Record<
  DayStatus,
  { wrap: string; chip: string; label: string }
> = {
  可用候选: {
    wrap: "border-jade-400/30 bg-jade-500/5",
    chip: "bg-jade-500/20 text-jade-400 border-jade-400/40",
    label: "可用",
  },
  条件候选: {
    wrap: "border-gold-500/30 bg-gold-500/5",
    chip: "bg-gold-500/20 text-gold-300 border-gold-500/40",
    label: "条件",
  },
  慎用候选: {
    wrap: "border-cinnabar-500/30 bg-cinnabar-500/5",
    chip: "bg-cinnabar-500/20 text-cinnabar-400 border-cinnabar-500/40",
    label: "慎用",
  },
};

export interface DayCardProps {
  day: AlmanacDayCandidate;
  status: DayStatus;
  showHours?: boolean;
}

export default function DayCard({ day, status, showHours = true }: DayCardProps) {
  const style = STATUS_STYLE[status];

  return (
    <div className={`panel-console ${style.wrap} rounded-xl border p-4 sm:p-5`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-lg font-bold text-paper-50">
            {day.date}
            <span className="ml-2 text-xs font-normal text-paper-400">{day.weekday}</span>
          </h4>
          <p className="mt-0.5 text-xs text-paper-300">
            农历 {day.lunarDate} · {day.zodiac}年 · 干支 {day.ganzhi.year} / {day.ganzhi.month} / {day.ganzhi.day}
          </p>
        </div>
        <span
          className={`console-value inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${style.chip}`}
        >
          {style.label}
        </span>
      </header>

      <p className="mt-2 text-xs text-paper-300">
        <span className="console-label mr-1">建除</span>
        <span className="text-gold-300">{day.dayOfficer}</span>
        <span className="console-label ml-2 mr-1">十二神</span>
        <span className="text-gold-300">{day.twelveStar}</span>
        <span className="console-label ml-2 mr-1">二十八宿</span>
        <span className="text-gold-300">{day.twentyEightStar}</span>
        <span className="console-label ml-2 mr-1">九星</span>
        <span className="text-gold-300">{day.nineStar}</span>
      </p>
      <p className="mt-1 text-xs text-paper-400">
        <span className="console-label mr-1">冲煞</span>
        <span className="text-cinnabar-400">{day.clash}</span>
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-jade-400/20 bg-ink-900/60 p-2">
          <h5 className="console-label text-jade-400">宜 · RECOMMEND</h5>
          <p className="mt-1 text-xs leading-relaxed text-paper-200">
            {day.recommends.length > 0 ? day.recommends.join(" · ") : "—"}
          </p>
        </div>
        <div className="rounded-md border border-cinnabar-500/20 bg-ink-900/60 p-2">
          <h5 className="console-label text-cinnabar-400">忌 · AVOID</h5>
          <p className="mt-1 text-xs leading-relaxed text-paper-200">
            {day.avoids.length > 0 ? day.avoids.join(" · ") : "—"}
          </p>
        </div>
      </div>

      {day.gods.length > 0 && (
        <p className="mt-2 text-[11px] text-paper-400">
          <span className="console-label mr-1">神煞</span>
          {day.gods.join(" · ")}
        </p>
      )}

      {day.pengZu && (
        <p className="mt-1 text-[11px] text-paper-500">
          <span className="console-label mr-1">彭祖百忌</span>
          {day.pengZu}
        </p>
      )}

      {day.participantNotes.length > 0 && (
        <p className="mt-1 text-[11px] text-paper-400">
          <span className="console-label mr-1">参与人</span>
          {day.participantNotes.join(" · ")}
        </p>
      )}

      {day.cautions.length > 0 && (
        <p className="mt-1 text-[11px] text-cinnabar-400">
          <span className="console-label mr-1 text-cinnabar-400">慎用提示</span>
          {day.cautions.join(" · ")}
        </p>
      )}

      {showHours && day.hours && day.hours.length > 0 && (
        <details className="mt-3 group">
          <summary className="console-label cursor-pointer text-gold-300 hover:text-gold-400">
            ▸ 可用时辰（{day.hours.length}）
          </summary>
          <ul className="mt-2 space-y-1.5">
            {day.hours.map((h, idx) => (
              <li
                key={`${h.name}-${idx}`}
                className="rounded-md border border-ink-600 bg-ink-900/60 px-2 py-1.5 text-[11px]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-bold text-paper-100">
                    {h.name} · {h.range} · {h.ganzhi}
                  </span>
                  <span className="console-label text-paper-400">十二神 · {h.twelveStar}</span>
                </div>
                {h.highlights.length > 0 && (
                  <p className="mt-0.5 text-jade-400">{h.highlights.join(" · ")}</p>
                )}
                {h.cautions.length > 0 && (
                  <p className="mt-0.5 text-cinnabar-400">{h.cautions.join(" · ")}</p>
                )}
                {h.participantNotes.length > 0 && (
                  <p className="mt-0.5 text-paper-400">
                    <span className="console-label mr-1">参与人</span>
                    {h.participantNotes.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}