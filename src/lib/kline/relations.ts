/**
 * 人生K线 · 命局/岁/运关系判定
 *
 * 提供：
 *  - 地支六冲 / 三合 / 六合 / 三会 / 三刑 / 六害 / 天克地冲 / 岁运并临
 * 判定。
 *
 * 参考经典：
 *   - 六冲：子午、丑未、寅申、卯酉、辰戌、巳亥
 *   - 六合：子丑、寅亥、卯戌、辰酉、巳申、午未
 *   - 三合：申子辰（合水局）、亥卯未（合木局）、寅午戌（合火局）、巳酉丑（合金局）
 *   - 三会：亥子丑（会水）、寅卯辰（会木）、巳午未（会火）、申酉戌（会金）
 *   - 三刑：寅巳申（无恩之刑）、丑戌未（恃势之刑）、子卯（无礼之刑）、
 *          辰午酉亥（自刑）
 *   - 六害：子未、丑午、寅巳、卯辰、申亥、酉戌
 *
 * 这些规则用于 K 线引擎给单根流年 K 线一个 ±2~6 的关系加成/减成。
 */

import type { RelationKind } from "./types";

// 用 string[][] 而非元组数组，避免 TS 对异构元组长度的挑剔。
const SIX_CHONG: string[][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];

const LIU_HE: string[][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];

const SAN_HE: string[][] = [
  ["申", "子", "辰"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"],
];

const SAN_HUI: string[][] = [
  ["亥", "子", "丑"], ["寅", "卯", "辰"], ["巳", "午", "未"], ["申", "酉", "戌"],
];

const SAN_XING: string[][] = [
  ["寅", "巳", "申"], ["丑", "戌", "未"], ["子", "卯"],
];
const ZI_XING: string[] = ["辰", "午", "酉", "亥"];

const LIU_HAI: string[][] = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];

const TIAN_GAN_KE: ReadonlySet<string> = new Set([
  "甲庚", "庚甲",
  "乙辛", "辛乙",
  "丙壬", "壬丙",
  "丁癸", "癸丁",
  "戊乙", "乙戊",
  "己甲", "甲己",
]);

/** 判定两条地支对之间的关系类型（不含天克地冲与岁运并临）。 */
export function branchRelation(a: string, b: string): RelationKind | null {
  if (!a || !b || a === b) return null;
  for (const pair of SIX_CHONG) {
    if (a === pair[0] && b === pair[1]) return "六冲";
    if (a === pair[1] && b === pair[0]) return "六冲";
  }
  for (const pair of LIU_HE) {
    if (a === pair[0] && b === pair[1]) return "六合";
    if (a === pair[1] && b === pair[0]) return "六合";
  }
  for (const pair of LIU_HAI) {
    if (a === pair[0] && b === pair[1]) return "六害";
    if (a === pair[1] && b === pair[0]) return "六害";
  }
  for (const triple of SAN_XING) {
    if (triple.includes(a) && triple.includes(b) && a !== b) return "三刑";
  }
  if (ZI_XING.includes(a) && a === b) return "三刑";
  return null;
}

/**
 * 检查三个地支是否构成三合局（例如 流年地支 与 大运地支 + 命局地支 三凑齐）。
 * 入参允许任意顺序，返回是否成局 + 涉及的三支列表。
 */
export function detectSanHe(branchList: string[]): { hit: boolean; triple?: string[] } {
  const set = new Set(branchList);
  for (const triple of SAN_HE) {
    if (triple.every((b) => set.has(b))) {
      return { hit: true, triple: [...triple] };
    }
  }
  return { hit: false };
}

/** 三会局：四个地支同方。 */
export function detectSanHui(branchList: string[]): { hit: boolean; triple?: string[] } {
  const set = new Set(branchList);
  for (const triple of SAN_HUI) {
    if (triple.every((b) => set.has(b))) {
      return { hit: true, triple: [...triple] };
    }
  }
  return { hit: false };
}

/** 天克地冲：天干相克 且 地支相冲。 */
export function isTianKeDiChong(ganA: string, zhiA: string, ganB: string, zhiB: string): boolean {
  if (!branchRelation(zhiA, zhiB)) return false;
  return TIAN_GAN_KE.has(ganA + ganB);
}
