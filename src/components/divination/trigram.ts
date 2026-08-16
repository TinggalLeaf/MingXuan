/**
 * 八卦 → 三爻线数组（初爻到三爻）
 */
const TRIGRAM_LINES: Record<string, Array<"yang" | "yin">> = {
  乾: ["yang", "yang", "yang"],
  兑: ["yang", "yang", "yin"],
  离: ["yang", "yin", "yang"],
  震: ["yang", "yin", "yin"],
  巽: ["yin", "yang", "yang"],
  坎: ["yin", "yang", "yin"],
  艮: ["yin", "yin", "yang"],
  坤: ["yin", "yin", "yin"],
};

/** 由上卦+下卦名（六爻卦）得到六爻线（初爻到上爻） */
export function hexLinesFromTrigrams(
  upper: string,
  lower: string
): Array<"yang" | "yin"> {
  const u = TRIGRAM_LINES[upper];
  const l = TRIGRAM_LINES[lower];
  if (!u || !l) return ["yang", "yang", "yang", "yang", "yang", "yang"];
  return [...l, ...u]; // 初爻到上爻：下卦在下
}

/** 由六爻线数组得到上卦、下卦名（用于互卦等场景） */
export function trigramsFromLines(lines: Array<"yang" | "yin">): { upper: string; lower: string } {
  const lower3 = lines.slice(0, 3).join("");
  const upper3 = lines.slice(3, 6).join("");
  const inv: Record<string, string> = {
    "yang,yang,yang": "乾",
    "yang,yang,yin": "兑",
    "yang,yin,yang": "离",
    "yang,yin,yin": "震",
    "yin,yang,yang": "巽",
    "yin,yang,yin": "坎",
    "yin,yin,yang": "艮",
    "yin,yin,yin": "坤",
  };
  return {
    lower: inv[lower3] ?? "?",
    upper: inv[upper3] ?? "?",
  };
}