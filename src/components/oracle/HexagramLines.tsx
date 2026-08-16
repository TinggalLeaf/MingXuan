/** 本地 className 合并器，避免引入额外依赖。 */
function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * 把八卦名映射到自下而上的三条爻（1=阳爻, 0=阴爻）。
 * 阳爻：实心长条；阴爻：上下两段，中间断开。
 * 来自《周易》通行八卦符号：乾☰/兑☱/离☲/震☳/巽☴/坎☵/艮☶/坤☷。
 */
const TRIGRAM_LINES: Record<string, [number, number, number]> = {
  乾: [1, 1, 1],
  兑: [1, 1, 0],
  离: [1, 0, 1],
  震: [1, 0, 0],
  巽: [0, 1, 1],
  坎: [0, 1, 0],
  艮: [0, 0, 1],
  坤: [0, 0, 0],
};

export interface HexagramLinesProps {
  /** 上卦名（经卦名）。 */
  upper: string;
  /** 下卦名（经卦名）。 */
  lower: string;
  /** 整体尺寸（像素宽）。默认 96。 */
  size?: number;
  /** 强调色（金色 / 朱砂 / 默认金）。 */
  tone?: "gold" | "cinnabar" | "paper";
  className?: string;
  /** 竖排反转：自上而下绘制（默认自下而上为传统）。 */
  reversed?: boolean;
  /** 逐爻生长入场（hex-line + animation-delay，默认 true）。 */
  animate?: boolean;
}

/**
 * 以阴阳爻横条绘制一个完整六爻卦。
 * 行 1 为初爻（最下），行 6 为上爻（最上）。
 */
export default function HexagramLines({
  upper,
  lower,
  size = 96,
  tone = "gold",
  className,
  reversed = false,
  animate = true,
}: HexagramLinesProps) {
  const upperLines = TRIGRAM_LINES[upper];
  const lowerLines = TRIGRAM_LINES[lower];

  if (!upperLines || !lowerLines) {
    // 防御：未知卦名时降级显示提示
    return (
      <div
        className={cn(
          "flex h-24 w-24 items-center justify-center rounded border border-gold-700/30 text-xs text-paper-500",
          className,
        )}
        style={{ width: size, height: size }}
      >
        未知卦象
      </div>
    );
  }

  // 上卦在上：自上而下顺序为 [上爻, 五爻, 四爻]
  // 下卦在下：自上而下顺序为 [三爻, 二爻, 初爻]
  // 我们需要按"自下而上"渲染，因此完整数组为 [...下卦数组, ...上卦数组] (初爻→上爻)
  const all = [...lowerLines, ...upperLines]; // 索引 0=初爻, 5=上爻
  const order = reversed ? [...all].reverse() : all;

  const stroke =
    tone === "cinnabar"
      ? "bg-cinnabar-400"
      : tone === "paper"
        ? "bg-paper-200"
        : "bg-gold-400";
  const gap = tone === "cinnabar" ? "bg-cinnabar-400/40" : "bg-gold-400/30";

  return (
    <div
      className={cn("flex flex-col-reverse justify-between", className)}
      style={{ width: size, height: size * 0.95 }}
      aria-label={`卦象：${upper}上${lower}下`}
    >
      {order.map((isYang, idx) => (
        <div
          key={idx}
          className={cn(
            "flex h-[12%] items-center justify-center gap-[6%]",
            animate && "hex-line",
          )}
          style={animate ? { animationDelay: `${idx * 90}ms` } : undefined}
        >
          {isYang ? (
            <span
              className={cn("block rounded-sm", stroke)}
              style={{ width: "100%", height: "55%" }}
            />
          ) : (
            <span
              className={cn("flex w-full items-center justify-between", "h-[55%]")}
            >
              <span
                className={cn("block rounded-sm", stroke)}
                style={{ width: "44%", height: "100%" }}
              />
              <span
                className={cn("block rounded-sm", stroke)}
                style={{ width: "44%", height: "100%" }}
              />
            </span>
          )}
          {/* 视觉空白“爻位间隙”，无功能 */}
          {idx < order.length - 1 && (
            <span className={cn("sr-only")}>{gap}</span>
          )}
        </div>
      ))}
    </div>
  );
}