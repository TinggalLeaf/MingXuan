
import type { QizhengPositionSource } from "mingyu-core/qizheng";

export interface QizhengSourcesProps {
  sources: QizhengPositionSource[];
}

const PRECISION_COLOR: Record<QizhengPositionSource["precisionClass"], string> = {
  现代天文计算: "text-jade-500",
  传统均速模型: "text-cinnabar-400",
};

export default function QizhengSources({ sources }: QizhengSourcesProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">05</span>位置来源标注
      </h3>
      <ul className="space-y-3">
        {sources.map((s, sIdx) => (
          <li
            key={s.id}
            className="anim-fade-up rounded-lg border border-gold-500/15 p-3"
            style={{ animationDelay: `${Math.min(sIdx * 90, 540)}ms` }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-bold text-gold-300">{s.provider}</span>
              <span className={`text-xs ${PRECISION_COLOR[s.precisionClass]}`}>
                {s.precisionClass}
              </span>
            </div>
            <p className="mt-1 text-xs text-paper-400">
              <span className="console-label mr-1">模型</span>{s.calculation} ·
              <span className="console-label ml-2 mr-1">坐标</span>{s.coordinate}
            </p>
            <p className="mt-1 text-xs text-paper-300">
              <span className="console-label mr-1">包含对象</span>{s.objects.join("、")}
            </p>
            {s.limitations && s.limitations.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-paper-500">
                {s.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}