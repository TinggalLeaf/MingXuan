
import type { QizhengStar } from "mingyu-core/qizheng";

export interface QizhengStarTableProps {
  stars: QizhengStar[];
}

const KIND_LABEL: Record<QizhengStar["kind"], string> = {
  七政: "七政",
  四余: "四余",
};

const PRECISION_COLOR: Record<QizhengStar["precisionClass"], string> = {
  现代天文计算: "text-jade-500",
  传统均速模型: "text-cinnabar-400",
};

function formatLon(lon: number): string {
  const norm = ((lon % 360) + 360) % 360;
  const deg = Math.floor(norm);
  const min = Math.floor((norm - deg) * 60);
  return `${deg}°${min.toString().padStart(2, "0")}′`;
}

export default function QizhengStarTable({ stars }: QizhengStarTableProps) {
  if (stars.length === 0) {
    return (
      <div className="panel-console p-4 text-sm text-paper-500">未返回星曜数据</div>
    );
  }

  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">02</span>十一星曜位置
        <span className="ml-2 console-value text-xs">共 {stars.length} 颗</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold-500/30 text-paper-400">
              <th className="console-label py-2 pr-2 text-left">类别</th>
              <th className="console-label py-2 pr-2 text-left">星曜</th>
              <th className="console-label py-2 pr-2 text-left">黄经</th>
              <th className="console-label py-2 pr-2 text-left">宿度</th>
              <th className="console-label py-2 pr-2 text-left">七政四余</th>
              <th className="console-label py-2 pr-2 text-left">落宫</th>
              <th className="console-label py-2 pr-2 text-left">状态</th>
              <th className="console-label py-2 pr-2 text-left">精度</th>
            </tr>
          </thead>
          <tbody>
            {stars.map((s, i) => (
              <tr
                key={s.name}
                className="anim-fade-up border-b border-gold-500/10 hover:bg-gold-500/5"
                style={{ animationDelay: `${Math.min(i * 45, 450)}ms` }}
              >
                <td className="py-1.5 pr-2">
                  <span className={s.kind === "七政" ? "text-gold-300 font-bold" : "text-cinnabar-400"}>
                    {KIND_LABEL[s.kind]}
                  </span>
                </td>
                <td className="py-1.5 pr-2 font-bold text-paper-200">{s.name}</td>
                <td className="py-1.5 pr-2 console-value text-paper-300">{formatLon(s.tropicalLongitude)}</td>
                <td className="py-1.5 pr-2 text-paper-300">
                  {s.xiu}
                  <span className="ml-1 console-value text-xs">{s.xiuDegree.toFixed(2)}°</span>
                </td>
                <td className="py-1.5 pr-2 text-paper-300">{s.sevenStar || "—"}</td>
                <td className="py-1.5 pr-2">
                  <span className="text-gold-300">{s.signBranch}</span>
                  <span className="ml-1 console-value text-xs">第 {s.palace} 宫</span>
                </td>
                <td className="py-1.5 pr-2 text-xs">
                  {s.retrograde ? (
                    <span className="seal">逆行</span>
                  ) : (
                    <span className="text-paper-500">顺行</span>
                  )}
                  {s.dignity && (
                    <span className="ml-1 text-paper-400">{s.dignity}</span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-xs">
                  <span className={PRECISION_COLOR[s.precisionClass]}>{s.precisionClass}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-paper-500">
        <span className="console-label mr-1">数据来源</span>
        {Array.from(new Set(stars.map((s) => s.sourceLabel))).join("、")}
      </p>
    </div>
  );
}