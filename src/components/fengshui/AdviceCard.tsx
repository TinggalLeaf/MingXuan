
import type { ResidentialFengshuiResult } from "mingyu-core/residential-fengshui";

/**
 * 综合建议卡：展示两套体系的协同点、冲突点与现实建议。
 */
export default function AdviceCard({
  result,
}: {
  result: ResidentialFengshuiResult | null;
}) {
  if (!result) return null;

  return (
    <div className="panel-console anim-unroll space-y-5 p-5 sm:p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="console-title text-lg">
          <span className="seq">01</span>综合提示
        </h3>
        <span className="rounded-full border border-gold-500/30 px-2 py-0.5 text-[11px] text-gold-300">
          {result.inputSummary.xuankongStatus}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="console-label">宅主资料</dt>
          <dd className="mt-0.5 text-base text-paper-50">
            {result.inputSummary.hasPerson ? "已提供" : "未提供"}
          </dd>
        </div>
        <div>
          <dt className="console-label">山向资料</dt>
          <dd className="mt-0.5 text-base text-paper-50">
            {result.inputSummary.hasHouseOrientation ? "已提供" : "未提供"}
          </dd>
        </div>
        <div>
          <dt className="console-label">宅运年</dt>
          <dd className="mt-0.5 console-value text-base text-paper-50">
            {result.inputSummary.houseYear ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="console-label">坐向摘要</dt>
          <dd className="mt-0.5 text-base text-paper-50">
            {result.inputSummary.orientationText || "—"}
          </dd>
        </div>
      </dl>

      {result.agreements.length > 0 && (
        <section>
          <h4 className="console-title mb-2 text-sm">
            <span className="seq">02</span>八宅 × 玄空 · 协同点
          </h4>
          <ul className="space-y-2 text-xs text-paper-200">
            {result.agreements.map((a: ResidentialFengshuiResult["agreements"][number], idx: number) => (
              <li
                key={idx}
                className={`anim-fade-up rounded-md border px-3 py-2 ${
                  a.level === "一致关注"
                    ? "border-jade-400/30 bg-jade-500/5"
                    : "border-gold-500/20 bg-ink-900/60"
                }`}
                style={{ animationDelay: `${Math.min(200 + idx * 90, 650)}ms` }}
              >
                <span className="font-bold text-gold-300">{a.title}</span>
                <span className="ml-2 text-paper-400">{a.level}</span>
                <p className="mt-0.5 leading-relaxed text-paper-300">{a.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.advice.length > 0 && (
        <section>
          <h4 className="console-title mb-2 text-sm">
            <span className="seq">03</span>现实建议
          </h4>
          <ul className="space-y-1.5 text-xs leading-relaxed text-paper-200">
            {result.advice.map((s: string, idx: number) => (
              <li
                key={idx}
                className="anim-fade-left flex gap-2"
                style={{ animationDelay: `${Math.min(300 + idx * 80, 700)}ms` }}
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-paper-500">
        {result.prompt}
      </p>
    </div>
  );
}