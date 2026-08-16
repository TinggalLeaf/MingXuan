
import type { IztroAstrolabe } from "mingyu-core";

export interface DecadalListProps {
  astrolabe: IztroAstrolabe;
}

/**
 * 大限列表：紫微每十年换运一次，按出生后起运年龄依序排。
 * iztro 的 decadalList() 返回按起运先后排列的 12 个大限。
 */
export default function DecadalList({ astrolabe }: DecadalListProps) {
  let list: ReturnType<IztroAstrolabe["decadalList"]> = [];
  try {
    list = astrolabe.decadalList();
  } catch {
    list = [];
  }
  if (list.length === 0) {
    return (
      <p className="rounded-lg border border-gold-500/15 p-3 text-xs text-paper-500">
        未能生成大限列表
      </p>
    );
  }

  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">02</span>大限流年
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-gold-500/30 text-paper-400">
              <th className="console-label py-2 pr-2 text-left">序</th>
              <th className="console-label py-2 pr-2 text-left">大限宫位</th>
              <th className="console-label py-2 pr-2 text-left">干支</th>
              <th className="console-label py-2 pr-2 text-left">虚岁区间</th>
              <th className="console-label py-2 pr-2 text-left">年份</th>
              <th className="console-label py-2 pr-2 text-left">四化</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d, i) => (
              <tr
                key={i}
                className="anim-fade-up border-b border-gold-500/10 hover:bg-gold-500/5"
                style={{ animationDelay: `${Math.min(i * 45, 495)}ms` }}
              >
                <td className="py-1.5 pr-2 console-value text-paper-500">{String(i + 1).padStart(2, "0")}</td>
                <td className="py-1.5 pr-2 font-bold text-gold-300">{d.palaceName}</td>
                <td className="py-1.5 pr-2 gz-char text-[14px] text-paper-200">
                  {d.heavenlyStem}
                  {d.earthlyBranch}
                </td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {d.ageRange[0]}–{d.ageRange[1]} 岁
                </td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {d.yearRange[0]}–{d.yearRange[1]}
                </td>
                <td className="py-1.5 pr-2 text-paper-300">
                  {d.mutagen && d.mutagen.length > 0 ? d.mutagen.join(" · ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}