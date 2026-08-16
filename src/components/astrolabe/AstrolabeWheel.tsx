
import type { AstrolabeData, AstrolabePoint } from "mingyu-core";

export interface AstrolabeWheelProps {
  data: AstrolabeData;
}

const SIGN_ORDER = [
  "白羊", "金牛", "双子", "巨蟹",
  "狮子", "处女", "天秤", "天蝎",
  "射手", "摩羯", "水瓶", "双鱼",
] as const;

const SIGN_GLYPH: Record<string, string> = {
  白羊: "♈", 金牛: "♉", 双子: "♊", 巨蟹: "♋",
  狮子: "♌", 处女: "♍", 天秤: "♎", 天蝎: "♏",
  射手: "♐", 摩羯: "♑", 水瓶: "♒", 双鱼: "♓",
};

/** 把黄道经度（0–360）映射到 SVG 角度。
 *  传统占星盘 ASC 在左侧（9 点），MC 在上（12 点），DESC 在右（3 点），IC 在下（6 点）。
 *  黄道自 ASC 起逆时针进入白羊 → 金牛 → … → 双鱼。
 *  SVG 屏幕坐标 y 轴朝下，因此"白羊"放左侧 180°，"巨蟹"放上方 270°。
 *  注意 SVG 中 0° = (1, 0) 右，90° = (0, 1) 下，270° = (0, -1) 上。
 */
function lonToAngle(lon: number): number {
  const norm = ((lon % 360) + 360) % 360;
  return (180 + norm) % 360;
}

function polar(r: number, angleDeg: number, cx: number, cy: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 170;
const R_SIGN = 145;
const R_DEG = 125;
const R_HOUSE = 105;
const R_PLANET = 78;

export default function AstrolabeWheel({ data }: AstrolabeWheelProps) {
  // 12 宫位：按 ASC 起点切分，每 30° 一宫
  const ascPoint = data.angles.find((a) => a.name === "上升");
  const ascLon = ascPoint?.longitude ?? 0;
  const ascAngle = lonToAngle(ascLon);

  // 行星位置（去重 name，按黄经排序）
  const planets: AstrolabePoint[] = [...data.planets].sort((a, b) => a.longitude - b.longitude);

  // 相位连线（容许度内主相位）
  const aspectLines: Array<{ a: AstrolabePoint; b: AstrolabePoint; type: string }> = [];
  for (const aspect of data.aspects) {
    const pa = planets.find((p) => p.name === aspect.body1);
    const pb = planets.find((p) => p.name === aspect.body2);
    if (pa && pb) aspectLines.push({ a: pa, b: pb, type: aspect.symbol });
  }

  return (
    <div className="panel-console hud-frame relative overflow-hidden p-3 sm:p-4">
      {/* 背景缓转装饰环（低透明度，纯装饰） */}
      <div
        aria-hidden
        className="anim-spin-slow pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-gold-500/10"
      />
      <div
        aria-hidden
        className="anim-spin-slow pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-500/8 [animation-direction:reverse]"
      />
      <h3 className="console-title relative mb-2 text-base">
        <span className="seq">WHL</span>本命盘
      </h3>
      <div className="anim-scale-in relative overflow-hidden">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block h-auto w-full max-w-[420px]"
          aria-label="西洋星盘"
        >
          {/* 外圈 */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="rgba(201,164,92,0.45)" strokeWidth="1.2" />
          <circle cx={CX} cy={CY} r={R_SIGN} fill="none" stroke="rgba(201,164,92,0.25)" strokeWidth="0.8" />
          <circle cx={CX} cy={CY} r={R_DEG} fill="none" stroke="rgba(201,164,92,0.18)" strokeWidth="0.6" />
          <circle cx={CX} cy={CY} r={R_HOUSE} fill="none" stroke="rgba(201,164,92,0.18)" strokeWidth="0.6" />
          <circle cx={CX} cy={CY} r={R_PLANET} fill="none" stroke="rgba(201,164,92,0.35)" strokeWidth="0.6" />

          {/* 12 星座扇形背景 */}
          {SIGN_ORDER.map((sign, i) => {
            const start = (ascAngle + i * 30 - 15 + 360) % 360;
            const end = (start + 30) % 360;
            const a1 = polar(R_OUTER, start, CX, CY);
            const a2 = polar(R_OUTER, end, CX, CY);
            const a3 = polar(R_SIGN, end, CX, CY);
            const a4 = polar(R_SIGN, start, CX, CY);
            const large = 0;
            return (
              <path
                key={sign}
                d={`M ${a1[0]} ${a1[1]} A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${a2[0]} ${a2[1]} L ${a3[0]} ${a3[1]} A ${R_SIGN} ${R_SIGN} 0 ${large} 0 ${a4[0]} ${a4[1]} Z`}
                fill={i % 2 === 0 ? "rgba(31,27,20,0.55)" : "rgba(18,16,12,0.7)"}
                stroke="rgba(201,164,92,0.18)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* 星座符号（每个宫位中线） */}
          {SIGN_ORDER.map((sign, i) => {
            const mid = (ascAngle + i * 30 + 360) % 360;
            const [x, y] = polar((R_OUTER + R_SIGN) / 2, mid, CX, CY);
            return (
              <text
                key={sign}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="16"
                fill="#e8cf9a"
              >
                {SIGN_GLYPH[sign]}
              </text>
            );
          })}

          {/* 12 宫位切线（基于 ASC 起点） */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (ascAngle + i * 30 + 360) % 360;
            const [x1, y1] = polar(R_HOUSE, angle, CX, CY);
            const [x2, y2] = polar(R_OUTER, angle, CX, CY);
            return (
              <line
                key={`h${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(217,184,118,0.45)"
                strokeWidth={i === 0 || i === 3 || i === 6 || i === 9 ? 1.4 : 0.6}
              />
            );
          })}

          {/* 宫位数字标签 */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (ascAngle + i * 30 + 360) % 360;
            const [x, y] = polar((R_HOUSE + R_SIGN) / 2, angle, CX, CY);
            return (
              <text
                key={`hn${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fill="#97865e"
              >
                {i + 1}
              </text>
            );
          })}

          {/* 角度刻度（每 5°） */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i * 5) % 360;
            const [x1, y1] = polar(R_DEG, angle, CX, CY);
            const [x2, y2] = polar(R_DEG + (i % 6 === 0 ? 6 : 3), angle, CX, CY);
            return (
              <line
                key={`tick${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(201,164,92,0.25)"
                strokeWidth={i % 6 === 0 ? 0.9 : 0.4}
              />
            );
          })}

          {/* ASC/MC 标记 */}
          {data.angles.map((a) => {
            const angle = lonToAngle(a.longitude);
            const [x1, y1] = polar(R_HOUSE, angle, CX, CY);
            const [x2, y2] = polar(R_OUTER + 6, angle, CX, CY);
            const isAxis = a.name === "上升" || a.name === "天顶";
            return (
              <g key={a.name}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isAxis ? "#c8402a" : "#97865e"}
                  strokeWidth={isAxis ? 1.5 : 1}
                />
                <text
                  x={polar(R_OUTER + 18, angle, CX, CY)[0]}
                  y={polar(R_OUTER + 18, angle, CX, CY)[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fill={isAxis ? "#e05a3a" : "#b8a67a"}
                  fontWeight={isAxis ? 700 : 500}
                >
                  {a.name}
                </text>
              </g>
            );
          })}

          {/* 相位连线 */}
          {aspectLines.map((line, idx) => {
            const a1 = polar(R_PLANET, lonToAngle(line.a.longitude), CX, CY);
            const a2 = polar(R_PLANET, lonToAngle(line.b.longitude), CX, CY);
            return (
              <line
                key={`asp${idx}`}
                x1={a1[0]}
                y1={a1[1]}
                x2={a2[0]}
                y2={a2[1]}
                stroke="rgba(217,184,118,0.4)"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* 行星符号 */}
          {planets.map((p, i) => {
            const angle = lonToAngle(p.longitude);
            // 防止重叠：相同角度附近向上偏移
            const offset = planets.findIndex(
              (q, j) => j !== i && Math.abs(((q.longitude - p.longitude + 540) % 360) - 180) < 8,
            ) >= 0 ? (i % 2 === 0 ? -6 : 6) : 0;
            const [x, y] = polar(R_PLANET + offset, angle, CX, CY);
            return (
              <g key={p.name}>
                <circle cx={x} cy={y} r="6" fill="rgba(43,37,25,0.85)" stroke="#c9a45c" strokeWidth="0.6" />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fontWeight={700}
                  fill={p.retrograde ? "#e05a3a" : "#faf6ec"}
                >
                  {p.label || p.name}
                </text>
              </g>
            );
          })}

          {/* 中央信息 */}
          <text x={CX} y={CY - 18} textAnchor="middle" fontSize="11" fill="#d9b876" fontWeight={700}>
            ASC {ascPoint?.formatted ?? "—"}
          </text>
          <text x={CX} y={CY} textAnchor="middle" fontSize="10" fill="#b8a67a">
            宫位制 Placidus
          </text>
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="#b8a67a">
            星体 {planets.length} · 相位 {data.aspects.length}
          </text>
        </svg>
      </div>
      <p className="mt-2 text-center text-[10px] text-paper-500">
        黄道从 ASC 起逆绘 · 红色为四轴 · 虚线为相位 · 红色字为逆行
      </p>
    </div>
  );
}