/**
 * 合盘模块共享工具：
 * - 天干五合 / 地支六合 / 六冲 / 三合 / 三会 查表
 * - 纳音查表
 * - 五行计数（干 + 支 + 藏干）
 * - 跨盘命中标记
 */

import { WUXING_LIST, charWuxingClass } from "@/lib/wuxing";
import type { WuXing } from "@/lib/wuxing";

/** 天干五合（成化局） */
export const STEM_FIVE_COMBOS: ReadonlyArray<readonly [string, string, WuXing]> = [
  ["甲", "己", "土"],
  ["乙", "庚", "金"],
  ["丙", "辛", "水"],
  ["丁", "壬", "木"],
  ["戊", "癸", "火"],
];

/** 地支六合 */
export const BRANCH_SIX_COMBOS: ReadonlyArray<readonly [string, string, WuXing]> = [
  ["子", "丑", "土"],
  ["寅", "亥", "木"],
  ["卯", "戌", "火"],
  ["辰", "酉", "金"],
  ["巳", "申", "水"],
  ["午", "未", "土"],
];

/** 地支六冲 */
export const BRANCH_SIX_CLASHES: ReadonlyArray<readonly [string, string]> = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
];

/** 地支三合局 */
export const BRANCH_THREE_HARMONIES: ReadonlyArray<readonly [string, string, string, WuXing]> = [
  ["申", "子", "辰", "水"],
  ["亥", "卯", "未", "木"],
  ["寅", "午", "戌", "火"],
  ["巳", "酉", "丑", "金"],
];

/** 地支三会局（按方位） */
export const BRANCH_THREE_MEETINGS: ReadonlyArray<readonly [string, string, string, WuXing]> = [
  ["亥", "子", "丑", "水"],
  ["寅", "卯", "辰", "木"],
  ["巳", "午", "未", "火"],
  ["申", "酉", "戌", "金"],
];

/** 地支六害 */
export const BRANCH_SIX_HARMS: ReadonlyArray<readonly [string, string]> = [
  ["子", "未"],
  ["丑", "午"],
  ["寅", "巳"],
  ["卯", "辰"],
  ["申", "亥"],
  ["酉", "戌"],
];

/** 纳音六十组（30 种） */
const NAYIN_TABLE: ReadonlyArray<readonly [string, string]> = (() => {
  const stems = "甲乙丙丁戊己庚辛壬癸";
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  // 60 甲子按两两一组共享纳音
  const groups: Array<[string, string, string]> = [
    ["甲子", "乙丑", "海中金"],
    ["丙寅", "丁卯", "炉中火"],
    ["戊辰", "己巳", "大林木"],
    ["庚午", "辛未", "路旁土"],
    ["壬申", "癸酉", "剑锋金"],
    ["甲戌", "乙亥", "山头火"],
    ["丙子", "丁丑", "涧下水"],
    ["戊寅", "己卯", "城头土"],
    ["庚辰", "辛巳", "白蜡金"],
    ["壬午", "癸未", "杨柳木"],
    ["甲申", "乙酉", "泉中水"],
    ["丙戌", "丁亥", "屋上土"],
    ["戊子", "己丑", "霹雳火"],
    ["庚寅", "辛卯", "松柏木"],
    ["壬辰", "癸巳", "长流水"],
    ["甲午", "乙未", "沙中金"],
    ["丙申", "丁酉", "山下火"],
    ["戊戌", "己亥", "平地木"],
    ["庚子", "辛丑", "壁上土"],
    ["壬寅", "癸卯", "金箔金"],
    ["甲辰", "乙巳", "覆灯火"],
    ["丙午", "丁未", "天河水"],
    ["戊申", "己酉", "大驿土"],
    ["庚戌", "辛亥", "钗钏金"],
    ["壬子", "癸丑", "桑柘木"],
    ["甲寅", "乙卯", "大溪水"],
    ["丙辰", "丁巳", "沙中土"],
    ["戊午", "己未", "天上火"],
    ["庚申", "辛酉", "石榴木"],
    ["壬戌", "癸亥", "大海水"],
  ];
  const out: Array<[string, string]> = [];
  for (const [a, b, name] of groups) {
    out.push([a, name]);
    out.push([b, name]);
  }
  // 防止 60 表被改坏：取 out 长度
  if (out.length !== 60) {
    throw new Error(`nayin table size mismatch: ${out.length}`);
  }
  void stems;
  void branches;
  return out;
})();

const NAYIN_MAP: Map<string, string> = new Map(NAYIN_TABLE.map(([k, v]) => [k, v]));

/** 由干支查纳音；查不到返回 "—" */
export function lookupNayin(ganZhi: string): string {
  return NAYIN_MAP.get(ganZhi) ?? "—";
}

export function stemFiveComboOf(a: string, b: string): { other: string; element: WuXing } | null {
  for (const [x, y, el] of STEM_FIVE_COMBOS) {
    if ((a === x && b === y) || (a === y && b === x)) {
      return { other: a === x ? y : x, element: el };
    }
  }
  return null;
}

export function branchSixComboOf(a: string, b: string): { other: string; element: WuXing } | null {
  for (const [x, y, el] of BRANCH_SIX_COMBOS) {
    if ((a === x && b === y) || (a === y && b === x)) {
      return { other: a === x ? y : x, element: el };
    }
  }
  return null;
}

export function branchClashOf(a: string, b: string): boolean {
  return BRANCH_SIX_CLASHES.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

export function branchHarmOf(a: string, b: string): boolean {
  return BRANCH_SIX_HARMS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** 生肖（年支 → 动物） */
const ZODIAC: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔",
  辰: "龙", 巳: "蛇", 午: "马", 未: "羊",
  申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

export function zodiacOf(branch: string): string {
  return ZODIAC[branch] ?? branch;
}

/** 五行计数：对四柱的天干、地支（本气与藏干）加权计数 */
export function countWuxing(
  pillars: { gan: string; zhi: string }[],
  hiddenStems: { year: string[]; month: string[]; day: string[]; hour: string[] },
): Record<WuXing, number> {
  const counts: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const positions: Array<keyof typeof hiddenStems> = ["year", "month", "day", "hour"];
  pillars.forEach((p, i) => {
    const wxGan = charWuxingClass(p.gan);
    if (wxGan) counts[wxGan as WuXing] += 2; // 天干权重高
    const wxZhi = charWuxingClass(p.zhi);
    if (wxZhi) counts[wxZhi as WuXing] += 1;
    // 藏干
    const hides = hiddenStems[positions[i]] ?? [];
    for (const h of hides) {
      const wx = charWuxingClass(h);
      if (wx) counts[wx as WuXing] += 1;
    }
  });
  return counts;
}

export { WUXING_LIST, charWuxingClass };
