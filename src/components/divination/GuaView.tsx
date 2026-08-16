import type { CSSProperties } from "react";

interface GuaLinesProps {
  /** 自下而上六爻（索引 0 = 初爻） */
  lines: Array<"yang" | "yin">;
  /** 每一爻位置是否动爻 */
  changing?: boolean[];
  /** 高亮爻（互卦/变卦时区分） */
  highlight?: "ben" | "hu" | "bian";
  /** 紧凑模式（去掉文字） */
  compact?: boolean;
  className?: string;
}

/**
 * 用 div 横条绘制六爻。阳爻一整条；阴爻中间断开。
 * 动爻在爻的左侧加红色短标记。
 */
export default function GuaLines({
  lines,
  changing,
  highlight = "ben",
  compact = false,
  className = "",
}: GuaLinesProps) {
  // 数组按自上而下展示（六爻卦画传统：上爻在上，初爻在下）
  const reversed = [...lines].reverse();
  const highlightColor =
    highlight === "ben"
      ? "var(--color-paper-100)"
      : highlight === "hu"
        ? "var(--color-jade-400)"
        : "var(--color-cinnabar-400)";

  const style: CSSProperties = {
    color: highlightColor,
  };

  // 卦象变化时通过 key 重挂载，让逐爻生长动效重播
  const seed = `${lines.join("")}|${(changing ?? []).join("")}|${highlight}`;

  return (
    <div
      key={seed}
      className={`flex flex-col items-stretch gap-1.5 ${className}`}
      style={style}
    >
      {reversed.map((yao, displayIdx) => {
        const realPos = 6 - displayIdx;
        const isChanging = changing?.[realPos - 1] ?? false;
        // 初爻（realPos=1）先出，逐爻向上生长
        const lineDelay = `${(realPos - 1) * 90}ms`;
        return (
          <div key={displayIdx} className="flex items-center gap-2">
            {isChanging && (
              <span
                className="anim-flicker inline-block h-3 w-1 rounded-sm"
                style={{ backgroundColor: "var(--color-cinnabar-500)" }}
                title="动爻"
              />
            )}
            <div className="flex flex-1 items-center gap-1">
              {yao === "yang" ? (
                <div
                  className="hex-line h-2 flex-1 rounded-sm"
                  style={{ backgroundColor: highlightColor, animationDelay: lineDelay }}
                />
              ) : (
                <>
                  <div
                    className="hex-line h-2 flex-1 rounded-sm"
                    style={{ backgroundColor: highlightColor, animationDelay: lineDelay }}
                  />
                  <div className="w-2" />
                  <div
                    className="hex-line h-2 flex-1 rounded-sm"
                    style={{ backgroundColor: highlightColor, animationDelay: lineDelay }}
                  />
                </>
              )}
            </div>
            {!compact && (
              <span className="console-value w-3 text-right text-[10px]">{realPos}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 由六爻爻值数组（6/7/8/9）转换为阴阳与动爻
 * 6=老阴(动)、7=少阳、8=少阴、9=老阳(动)
 */
export function yaoArrayToLines(yaoArray: number[]): { lines: Array<"yang" | "yin">; changing: boolean[] } {
  const lines: Array<"yang" | "yin"> = [];
  const changing: boolean[] = [];
  for (const v of yaoArray) {
    if (v === 7 || v === 9) lines.push("yang");
    else lines.push("yin");
    changing.push(v === 6 || v === 9);
  }
  return { lines, changing };
}