
import type { AstrolabeData } from "mingyu-core";

export interface PlanetTableProps {
  data: AstrolabeData;
}

const SIGN_GLYPH: Record<string, string> = {
  白羊: "♈", 金牛: "♉", 双子: "♊", 巨蟹: "♋",
  狮子: "♌", 处女: "♍", 天秤: "♎", 天蝎: "♏",
  射手: "♐", 摩羯: "♑", 水瓶: "♒", 双鱼: "♓",
};

export default function PlanetTable({ data }: PlanetTableProps) {
  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">02</span>行星位置
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold-500/30 text-paper-400">
              <th className="console-label py-2 pr-2 text-left">星体</th>
              <th className="console-label py-2 pr-2 text-left">星座</th>
              <th className="console-label py-2 pr-2 text-left">度数</th>
              <th className="console-label py-2 pr-2 text-left">宫位</th>
              <th className="console-label py-2 pr-2 text-left">状态</th>
            </tr>
          </thead>
          <tbody>
            {data.planets.map((p, i) => (
              <tr
                key={p.name}
                className="anim-fade-up border-b border-gold-500/10 hover:bg-gold-500/5"
                style={{ animationDelay: `${Math.min(i * 45, 450)}ms` }}
              >
                <td className="py-1.5 pr-2 font-bold text-paper-200">{p.label || p.name}</td>
                <td className="py-1.5 pr-2 text-gold-300">
                  <span className="mr-1">{SIGN_GLYPH[p.sign] ?? ""}</span>
                  {p.sign}
                </td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {p.degree}°{p.minute.toString().padStart(2, "0")}′
                </td>
                <td className="py-1.5 pr-2 text-paper-300">第 <span className="console-value">{p.house}</span> 宫</td>
                <td className="py-1.5 pr-2">
                  {p.retrograde ? (
                    <span className="seal text-[10px]">逆行</span>
                  ) : (
                    <span className="text-paper-500 text-xs">顺行</span>
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