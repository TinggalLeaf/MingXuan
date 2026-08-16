/** 五行工具：干支 → 五行 → 颜色类名 */

export type WuXing = "木" | "火" | "土" | "金" | "水";

const GAN_WUXING: Record<string, WuXing> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

const ZHI_WUXING: Record<string, WuXing> = {
  寅: "木", 卯: "木", 巳: "火", 午: "火", 辰: "土", 戌: "土",
  丑: "土", 未: "土", 申: "金", 酉: "金", 子: "水", 亥: "水",
};

export function ganWuXing(gan: string): WuXing | undefined {
  return GAN_WUXING[gan];
}

export function zhiWuXing(zhi: string): WuXing | undefined {
  return ZHI_WUXING[zhi];
}

/** 任意干支字 → 五行 */
export function charWuXing(char: string): WuXing | undefined {
  return GAN_WUXING[char] ?? ZHI_WUXING[char];
}

/** 五行 → Tailwind 文字色类（见 globals.css .wx-*） */
export function wuxingTextClass(wx: WuXing | undefined): string {
  switch (wx) {
    case "木": return "wx-mu";
    case "火": return "wx-huo";
    case "土": return "wx-tu";
    case "金": return "wx-jin";
    case "水": return "wx-shui";
    default: return "";
  }
}

/** 干支字 → 五行文字色类 */
export function charWuxingClass(char: string): string {
  return wuxingTextClass(charWuXing(char));
}

/** 五行 → 十六进制色值（图表用） */
export const WUXING_COLORS: Record<WuXing, string> = {
  木: "#4a7c59",
  火: "#c0392b",
  土: "#b8860b",
  金: "#d4af37",
  水: "#3a6ea5",
};

export const WUXING_LIST: WuXing[] = ["木", "火", "土", "金", "水"];

/** 阴阳 */
export function ganYinYang(gan: string): "阳" | "阴" | undefined {
  const idx = "甲乙丙丁戊己庚辛壬癸".indexOf(gan);
  if (idx < 0) return undefined;
  return idx % 2 === 0 ? "阳" : "阴";
}
