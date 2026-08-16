
import type { AstrolabeData } from "mingyu-core";
import TermTip from "@/components/common/TermTip";
import { ASTRO_EXPLAIN, explainOf } from "@/lib/explain";

export interface AstrolabeSummaryProps {
  data: AstrolabeData;
}

const SIGN_GLYPH: Record<string, string> = {
  白羊: "♈", 金牛: "♉", 双子: "♊", 巨蟹: "♋",
  狮子: "♌", 处女: "♍", 天秤: "♎", 天蝎: "♏",
  射手: "♐", 摩羯: "♑", 水瓶: "♒", 双鱼: "♓",
};

export default function AstrolabeSummary({ data }: AstrolabeSummaryProps) {
  const sun = data.planets.find((p) => p.name === "太阳");
  const moon = data.planets.find((p) => p.name === "月亮");
  const asc = data.angles.find((a) => a.name === "上升");
  const mc = data.angles.find((a) => a.name === "天顶");

  return (
    <div className="panel-console hud-frame grid gap-4 p-4 sm:p-5 sm:grid-cols-2">
      <div>
        <h3 className="console-title text-base">
          <span className="seq">01</span>本命信息
        </h3>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="console-label">姓名</dt>
          <dd className="text-paper-200">{data.birth.name || "—"}</dd>
          <dt className="console-label">性别</dt>
          <dd className="text-paper-200">{data.birth.gender}</dd>
          <dt className="console-label">时间</dt>
          <dd className="text-paper-200">{data.birth.dateTime}</dd>
          <dt className="console-label">地点</dt>
          <dd className="text-paper-200">
            {data.birth.location}
            {data.birth.latitude !== undefined && data.birth.longitude !== undefined && (
              <span className="ml-2 console-value text-xs">
                ({data.birth.latitude.toFixed(2)}, {data.birth.longitude.toFixed(2)})
              </span>
            )}
          </dd>
          <dt className="console-label">时区</dt>
          <dd className="text-paper-200">
            UTC{data.birth.timezone >= 0 ? "+" : ""}{data.birth.timezone}
            {data.birth.timeZoneId && (
              <span className="ml-2 text-xs text-paper-500">{data.birth.timeZoneId}</span>
            )}
          </dd>
        </dl>
      </div>

      <div>
        <h3 className="console-title text-base">
          <span className="seq">02</span>核心定位
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm">
          {sun && (
            <li className="anim-fade-left flex items-center gap-2" style={{ animationDelay: "150ms" }}>
              <span className="console-label">太阳</span>
              <span className="text-paper-200">{sun.label}</span>
              <span className="console-value text-gold-300">{sun.formatted}</span>
            </li>
          )}
          {moon && (
            <li className="anim-fade-left flex items-center gap-2" style={{ animationDelay: "240ms" }}>
              <span className="console-label">月亮</span>
              <span className="text-paper-200">{moon.label}</span>
              <span className="console-value text-gold-300">{moon.formatted}</span>
            </li>
          )}
          {asc && (
            <li className="anim-fade-left flex items-center gap-2" style={{ animationDelay: "330ms" }}>
              <TermTip term="上升" text={explainOf(ASTRO_EXPLAIN, "上升")} className="console-label" />
              <span className="text-paper-200">{asc.label}</span>
              <span className="console-value text-gold-300">{asc.formatted}</span>
            </li>
          )}
          {mc && (
            <li className="anim-fade-left flex items-center gap-2" style={{ animationDelay: "420ms" }}>
              <TermTip term="天顶" text={explainOf(ASTRO_EXPLAIN, "天顶")} className="console-label" />
              <span className="text-paper-200">{mc.label}</span>
              <span className="console-value text-gold-300">{mc.formatted}</span>
            </li>
          )}
        </ul>

        {data.birth.standardDateTime && data.birth.standardDateTime !== data.birth.dateTime && (
          <p className="mt-3 text-[11px] text-paper-500">
            <span className="console-label mr-1">标准时间</span>
            <span className="console-value">{data.birth.standardDateTime}</span>
          </p>
        )}
      </div>

      <div className="sm:col-span-2 border-t border-gold-500/15 pt-3">
        <h4 className="console-label mb-2">星曜符号速查</h4>
        <div className="mt-2 grid grid-cols-4 gap-x-2 gap-y-1 text-xs text-paper-500 sm:grid-cols-6">
          {Object.entries(SIGN_GLYPH).map(([name, glyph]) => (
            <span key={name} className="flex items-center gap-1">
              <span className="text-gold-300">{glyph}</span>
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}