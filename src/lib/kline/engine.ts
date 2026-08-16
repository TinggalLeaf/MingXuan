/**
 * 人生K线 · 运势算法引擎
 *
 * 设计原则：
 *   1. 确定性（同一输入永远同一输出，无随机数）
 *   2. 可解释（每根 K 线的开/收/高低都来自命理规则，可在 reason 字段追溯）
 *   3. 透明（基线、关系加成、六维分均按经典规则映射，分数有界 0~100）
 *
 * 算法骨架：
 *   - 大运定基调 baseline（30~80）
 *   - 流年十神给出 -20 ~ +20 调整
 *   - 流年与命局/大运的冲合刑害再叠加 ±2~6
 *   - K 线 OHLC 由流年调整 + 上年收盘滚动而成
 *   - score = (open + close + high + low) / 4
 *   - 六维分按十神吉凶每年 0~100
 */

import type { BaziChartResult } from "mingyu-core/bazi";
import { getTenGod } from "mingyu-core/bazi";
import { RELATION_DELTA, TEN_GOD_PHRASES, RELATION_PHRASES } from "./phrases";
import {
  branchRelation,
  detectSanHe,
  detectSanHui,
  isTianKeDiChong,
} from "./relations";
import type {
  DaYunSegment,
  DimensionScores,
  KLineEngineInput,
  KLineEngineResult,
  KLinePoint,
  RelationFact,
  SummaryStats,
  TenGodKey,
  WuXing,
} from "./types";

/**
 * mingyu-core 顶层未公开导出 LuckCycle / LiunianInfo 等深度类型；
 * 这里在引擎内按 baziTypes.d.ts 镜像一份，避免依赖未公开的深层路径。
 */
interface XiaoyunInfo {
  ganZhi: string;
  tenGod: string;
  tenGodZhi: string;
}
interface LiunianInfoMirror {
  year: number;
  age: number;
  ganZhi: string;
  tenGod: string;
  tenGodZhi: string;
  xiaoyun?: XiaoyunInfo;
}
interface LuckCycleMirror {
  age: number;
  year: number;
  ganZhi: string;
  isXiaoyun: boolean;
  type: string;
  years: LiunianInfoMirror[];
}

const VALID_TEN_GODS: TenGodKey[] = [
  "比肩", "劫财", "食神", "伤官", "偏财", "正财",
  "七杀", "正官", "偏印", "正印",
];

function asTenGod(s: string): TenGodKey {
  for (const k of VALID_TEN_GODS) {
    if (s === k || s.startsWith(k)) return k;
  }
  return "比肩";
}

function getGanWuXing(gan: string): WuXing {
  switch (gan) {
    case "甲": case "乙": return "木";
    case "丙": case "丁": return "火";
    case "戊": case "己": return "土";
    case "庚": case "辛": return "金";
    case "壬": case "癸": return "水";
    default: return "土";
  }
}

function getZhiWuXing(zhi: string): WuXing {
  switch (zhi) {
    case "寅": case "卯": return "木";
    case "巳": case "午": return "火";
    case "辰": case "戌": case "丑": case "未": return "土";
    case "申": case "酉": return "金";
    case "子": case "亥": return "水";
    default: return "土";
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 根据十神吉凶给出流年加减分。
 * - 财官印食 偏吉：±10~20
 * - 比劫伤杀 偏凶：-15~+5
 * 最终映射 [-20, +20]
 */
function tenGodDelta(tg: TenGodKey): number {
  switch (tg) {
    case "正官": return 14;
    case "七杀": return 4;
    case "正印": return 15;
    case "偏印": return 6;
    case "正财": return 13;
    case "偏财": return 11;
    case "食神": return 10;
    case "伤官": return -2;
    case "比肩": return 2;
    case "劫财": return -8;
    default: return 0;
  }
}

/**
 * 大运基线：
 *   - 用神/喜神五行 对应的十神 70±
 *   - 闲神 / 中性 50
 *   - 忌神 35±
 *   - 凶神（仇神）25±
 */
function daYunBaseline(
  daYunGanZhi: string,
  usefulGod: string,
  avoidGod: string,
): { baseline: number; tenor: TenGodKey } {
  const gan = daYunGanZhi.charAt(0);
  const wx = getGanWuXing(gan);
  const useful = usefulGod || "";
  const avoid = avoidGod || "";
  const isUseful = useful.includes(wx);
  const isAvoid = avoid.includes(wx);

  let baseline = 50;
  if (isUseful) baseline = 70;
  else if (isAvoid) baseline = 32;

  const zhi = daYunGanZhi.charAt(1);
  if (["辰", "戌", "丑", "未"].includes(zhi)) baseline += 2;

  return { baseline, tenor: "比肩" };
}

/** 六维评分（0~100）。 */
function dimensionScores(
  tg: TenGodKey,
  daYunBase: number,
  yearDelta: number,
): DimensionScores {
  const yearAvg = clamp(daYunBase + yearDelta, 5, 98);

  const weights: Record<TenGodKey, DimensionScores> = {
    正官: { career: 92, wealth: 58, marriage: 60, health: 60, family: 60 },
    七杀: { career: 80, wealth: 55, marriage: 40, health: 48, family: 45 },
    正印: { career: 60, wealth: 55, marriage: 65, health: 88, family: 90 },
    偏印: { career: 62, wealth: 52, marriage: 55, health: 70, family: 78 },
    正财: { career: 60, wealth: 92, marriage: 85, health: 55, family: 65 },
    偏财: { career: 62, wealth: 88, marriage: 65, health: 55, family: 60 },
    食神: { career: 78, wealth: 70, marriage: 72, health: 60, family: 68 },
    伤官: { career: 72, wealth: 65, marriage: 50, health: 50, family: 55 },
    比肩: { career: 60, wealth: 60, marriage: 58, health: 70, family: 78 },
    劫财: { career: 50, wealth: 45, marriage: 48, health: 60, family: 65 },
  };
  const w = weights[tg];
  const adj = yearAvg - 60;
  return {
    career: clamp(w.career + adj * 0.3, 0, 100),
    wealth: clamp(w.wealth + adj * 0.35, 0, 100),
    marriage: clamp(w.marriage + adj * 0.25, 0, 100),
    health: clamp(w.health + adj * 0.2, 0, 100),
    family: clamp(w.family + adj * 0.25, 0, 100),
  };
}

/** 找该流年所属大运段（基于 luckInfo.cycles）。 */
function findDaYunForAge(cycles: LuckCycleMirror[], age: number): LuckCycleMirror | undefined {
  for (const c of cycles) {
    const endAge = c.age + 9;
    if (age >= c.age && age <= endAge) return c;
  }
  return cycles[0];
}

/**
 * 检测流年 vs 命局四柱 与 大运 的关系。
 * 命局地支 = 年/月/日/时四柱的地支。
 */
function detectYearRelations(
  liuGan: string,
  liuZhi: string,
  chart: BaziChartResult,
  daYunGanZhi: string,
): RelationFact[] {
  const facts: RelationFact[] = [];
  const natalZhis = [
    chart.pillars.year.zhi,
    chart.pillars.month.zhi,
    chart.pillars.day.zhi,
    chart.pillars.hour.zhi,
  ];

  for (const nz of natalZhis) {
    const rel = branchRelation(liuZhi, nz);
    if (rel) {
      facts.push({
        kind: rel,
        between: `流年 ${liuZhi} 与命局 ${nz}`,
        delta: RELATION_DELTA[rel],
      });
    }
  }

  const branchPool = [liuZhi, daYunGanZhi.charAt(1), ...natalZhis];
  const sanHe = detectSanHe(branchPool);
  if (sanHe.hit && sanHe.triple) {
    facts.push({
      kind: "三合",
      between: `${sanHe.triple.join("、")} 三合成局`,
      delta: RELATION_DELTA["三合"],
    });
  }
  const sanHui = detectSanHui(branchPool);
  if (sanHui.hit && sanHui.triple) {
    facts.push({
      kind: "三会",
      between: `${sanHui.triple.join("、")} 三会成方`,
      delta: RELATION_DELTA["三会"],
    });
  }

  const daYunGan = daYunGanZhi.charAt(0);
  const daYunZhi = daYunGanZhi.charAt(1);
  if (isTianKeDiChong(liuGan, liuZhi, daYunGan, daYunZhi)) {
    facts.push({
      kind: "天克地冲",
      between: `流年 ${liuGan}${liuZhi} 与大运 ${daYunGan}${daYunZhi}`,
      delta: RELATION_DELTA["天克地冲"],
    });
  }

  if (liuGan === daYunGan && liuZhi === daYunZhi) {
    facts.push({
      kind: "岁运并临",
      between: `流年 ${liuGan}${liuZhi} 与大运 ${daYunGanZhi} 并临`,
      delta: RELATION_DELTA["岁运并临"],
    });
  }

  return facts;
}

function pickPhrase(pool: Record<string, string[]>, key: string, seed: number): string {
  const arr = pool[key];
  if (!arr || arr.length === 0) return "";
  return arr[seed % arr.length];
}

function buildReason(
  liuGanZhi: string,
  tg: TenGodKey,
  relations: RelationFact[],
  seed: number,
): string {
  const tenGodLine = pickPhrase(TEN_GOD_PHRASES as unknown as Record<string, string[]>, tg as string, seed);
  if (relations.length === 0) {
    return `【${liuGanZhi}流年】${tenGodLine}`;
  }
  const r = relations[0];
  const relLine = pickPhrase(RELATION_PHRASES as unknown as Record<string, string[]>, r.kind as string, seed + 1);
  return `【${liuGanZhi}流年】${tenGodLine}；${relLine}`;
}

/** 引擎主入口 */
export function computeKLine(input: KLineEngineInput): KLineEngineResult {
  const { chart, years } = input;
  const cycles = (chart.luckInfo?.cycles ?? []) as unknown as LuckCycleMirror[];
  const usefulGod = chart.analysis?.usefulGod?.useful ?? "";
  const avoidGod = chart.analysis?.usefulGod?.avoid ?? "";

  const startYear = chart.solarDate.year;
  const startAge = 1;

  const daYun: DaYunSegment[] = cycles.slice(0, 12).map((c: LuckCycleMirror) => {
    const startAgeC = c.age;
    const { baseline } = daYunBaseline(c.ganZhi, usefulGod, avoidGod);
    return {
      startAge: startAgeC,
      endAge: startAgeC + 9,
      ganZhi: c.ganZhi,
      tenGod: asTenGod(c.ganZhi),
      baseline,
    };
  });

  const firstCycle = cycles[0];
  const liunianList: LiunianInfoMirror[] | undefined = firstCycle?.years;
  const dayMaster = chart.dayMaster.gan;

  const HEAVENLY = "甲乙丙丁戊己庚辛壬癸";
  const EARTHLY = "子丑寅卯辰巳午未申酉戌亥";
  const HIDDEN_MAIN: Record<string, string> = {
    子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙",
    午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬",
  };

  const points: KLinePoint[] = [];
  let prevClose = 50;

  for (let i = 0; i < years; i++) {
    const age = startAge + i;
    const year = startYear + i;

    const ln = liunianList?.[i];
    let liuGan: string;
    let liuZhi: string;
    if (ln) {
      liuGan = ln.ganZhi.charAt(0);
      liuZhi = ln.ganZhi.charAt(1);
    } else {
      const baseGz = chart.pillars.year.ganZhi;
      const bi = HEAVENLY.indexOf(baseGz.charAt(0));
      const zi = EARTHLY.indexOf(baseGz.charAt(1));
      if (bi < 0 || zi < 0) {
        liuGan = "甲"; liuZhi = "子";
      } else {
        liuGan = HEAVENLY[(bi + i) % 10];
        liuZhi = EARTHLY[(zi + i) % 12];
      }
    }
    const liuGanZhi = liuGan + liuZhi;

    const tenGod = asTenGod(getTenGod(liuGan, dayMaster));
    const main = HIDDEN_MAIN[liuZhi] ?? "甲";
    const tgZhi = asTenGod(getTenGod(main, dayMaster));

    const dy = findDaYunForAge(cycles, age) ?? cycles[0];
    const daYunGanZhi = dy?.ganZhi ?? "";
    const daYunBase = daYunBaseline(daYunGanZhi, usefulGod, avoidGod).baseline;

    const tgDelta = tenGodDelta(tenGod);
    const relations = detectYearRelations(liuGan, liuZhi, chart, daYunGanZhi);
    const relDelta = relations.reduce((s, r) => s + r.delta, 0);

    const open = prevClose;
    const close = clamp(open + tgDelta * 0.5 + relDelta * 0.5, 5, 98);
    const relationCount = relations.filter((r) => r.delta < 0).length;
    const amplitude = 4 + relationCount * 2;
    const high = clamp(Math.max(open, close) + amplitude * 0.5, 0, 100);
    const low = clamp(Math.min(open, close) - amplitude * 0.5, 0, 100);

    const score = round1((open + close + high + low) / 4);
    const dims = dimensionScores(tenGod, daYunBase, tgDelta + relDelta);
    const reason = buildReason(liuGanZhi, tenGod, relations, i);

    const point: KLinePoint = {
      age,
      year,
      ganZhi: liuGanZhi,
      tenGod,
      tenGodZhi: tgZhi,
      daYun: daYunGanZhi,
      daYunStartAge: dy?.age ?? 0,
      wuxing: getZhiWuXing(liuZhi),
      relations,
      open: round1(open),
      close: round1(close),
      high: round1(high),
      low: round1(low),
      score,
      dimensionScores: {
        career: round1(dims.career),
        wealth: round1(dims.wealth),
        marriage: round1(dims.marriage),
        health: round1(dims.health),
        family: round1(dims.family),
      },
      reason,
    };
    points.push(point);
    prevClose = close;
  }

  const scores = points.map((p) => p.score);
  const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
  let peakIdx = 0;
  let valleyIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].score > points[peakIdx].score) peakIdx = i;
    if (points[i].score < points[valleyIdx].score) valleyIdx = i;
  }
  const peak = points[peakIdx];
  const valley = points[valleyIdx];
  const summary: SummaryStats = {
    averageScore: round1(avg),
    peak: {
      age: peak.age,
      year: peak.year,
      score: peak.score,
      ganZhi: peak.ganZhi,
    },
    valley: {
      age: valley.age,
      year: valley.year,
      score: valley.score,
      ganZhi: valley.ganZhi,
    },
  };

  return {
    points,
    daYun,
    summary,
    chart,
  };
}
