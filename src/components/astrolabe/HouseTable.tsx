
import type { AstrolabeData } from "mingyu-core";

export interface HouseTableProps {
  data: AstrolabeData;
}

const SIGN_GLYPH: Record<string, string> = {
  白羊: "♈", 金牛: "♉", 双子: "♊", 巨蟹: "♋",
  狮子: "♌", 处女: "♍", 天秤: "♎", 天蝎: "♏",
  射手: "♐", 摩羯: "♑", 水瓶: "♒", 双鱼: "♓",
};

const HOUSE_THEMES = [
  "命宫（自我）",
  "财帛（资源）",
  "兄弟（沟通）",
  "田宅（家庭）",
  "子女（创作）",
  "奴仆（服务）",
  "夫妻（关系）",
  "疾厄（健康）",
  "迁移（远方）",
  "官禄（事业）",
  "福德（精神）",
  "玄秘（潜意识）",
];

export default function HouseTable({ data }: HouseTableProps) {
  // Sort houses by house number (1-12)
  const sorted = [...data.houses].sort((a, b) => a.house - b.house);

  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">03</span>十二宫位
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold-500/30 text-paper-400">
              <th className="console-label py-2 pr-2 text-left">宫</th>
              <th className="console-label py-2 pr-2 text-left">主题</th>
              <th className="console-label py-2 pr-2 text-left">星座</th>
              <th className="console-label py-2 pr-2 text-left">度数</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h, i) => (
              <tr
                key={h.name}
                className="anim-fade-up border-b border-gold-500/10 hover:bg-gold-500/5"
                style={{ animationDelay: `${Math.min(i * 45, 495)}ms` }}
              >
                <td className="py-1.5 pr-2 font-bold text-gold-300">{h.name}</td>
                <td className="py-1.5 pr-2 text-paper-400 text-xs">
                  {HOUSE_THEMES[h.house - 1] ?? ""}
                </td>
                <td className="py-1.5 pr-2 text-paper-200">
                  <span className="mr-1">{SIGN_GLYPH[h.sign] ?? ""}</span>
                  {h.sign}
                </td>
                <td className="py-1.5 pr-2 console-value text-paper-300">
                  {h.degree}°{h.minute.toString().padStart(2, "0")}′
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}