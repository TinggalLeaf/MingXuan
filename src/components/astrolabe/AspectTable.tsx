
import type { AstrolabeData } from "mingyu-core";
import TermTip from "@/components/common/TermTip";
import { ASTRO_EXPLAIN, explainOf } from "@/lib/explain";

export interface AspectTableProps {
  data: AstrolabeData;
}

const CLOSENESS_COLOR: Record<string, string> = {
  紧密: "text-gold-300",
  中等: "text-paper-200",
  宽松: "text-paper-400",
};

export default function AspectTable({ data }: AspectTableProps) {
  if (data.aspects.length === 0) {
    return (
      <div className="panel-console p-4 sm:p-5">
        <h3 className="console-title mb-3 text-base">
          <span className="seq">04</span>相位表
        </h3>
        <p className="text-xs text-paper-500">当前容许度内未命中主要相位</p>
      </div>
    );
  }

  // Sort by tightness (closest first)
  const order = { 紧密: 0, 中等: 1, 宽松: 2 } as Record<string, number>;
  const sorted = [...data.aspects].sort((a, b) => {
    const ac = a.closeness ? order[a.closeness] ?? 9 : 9;
    const bc = b.closeness ? order[b.closeness] ?? 9 : 9;
    return ac - bc;
  });

  // 本盘出现的相位类型（去重，用于白话图例；放在表格外避免被滚动容器裁剪）
  const aspectTypes = [...new Set(sorted.map((a) => a.type).filter(Boolean))];

  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">04</span>相位表
        <span className="ml-2 console-value text-xs">共 {data.aspects.length} 组</span>
      </h3>
      {aspectTypes.length > 0 && (
        <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paper-400">
          <span className="console-label">本盘相位</span>
          {aspectTypes.map((t) => (
            <TermTip key={t} term={t} text={explainOf(ASTRO_EXPLAIN, t)} className="text-gold-300" />
          ))}
          <span className="text-[10px] text-paper-500">（悬浮/点击查看白话）</span>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold-500/30 text-paper-400">
              <th className="console-label py-2 pr-2 text-left">星体 A</th>
              <th className="console-label py-2 pr-2 text-left">相位</th>
              <th className="console-label py-2 pr-2 text-left">星体 B</th>
              <th className="console-label py-2 pr-2 text-left">精确角</th>
              <th className="console-label py-2 pr-2 text-left">实际角</th>
              <th className="console-label py-2 pr-2 text-left">容许度</th>
              <th className="console-label py-2 pr-2 text-left">紧密</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr
                key={i}
                className="anim-fade-up border-b border-gold-500/10 hover:bg-gold-500/5"
                style={{ animationDelay: `${Math.min(i * 45, 540)}ms` }}
              >
                <td className="py-1.5 pr-2 font-bold text-paper-200">{a.body1}</td>
                <td className="py-1.5 pr-2">
                  <span className="text-gold-300">{a.symbol}</span>
                  <span className="ml-1 text-xs text-paper-400">{a.type}</span>
                </td>
                <td className="py-1.5 pr-2 font-bold text-paper-200">{a.body2}</td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {typeof a.exactAngle === "number" ? `${a.exactAngle}°` : "—"}
                </td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {typeof a.actualAngle === "number" ? `${a.actualAngle.toFixed(2)}°` : "—"}
                </td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {a.orb.toFixed(2)}°
                  {a.allowedOrb !== undefined && (
                    <span className="text-paper-500 text-xs"> / {a.allowedOrb}°</span>
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  <span className={CLOSENESS_COLOR[a.closeness ?? ""] ?? "text-paper-300"}>
                    {a.closeness ?? "—"}
                  </span>
                  {a.isOutOfSign && (
                    <span className="ml-1 text-[10px] text-cinnabar-400">跨星座</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}