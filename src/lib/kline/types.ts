/**
 * 人生K线 · 类型定义
 *
 * 把八字命理结果转换为金融 K 线所蜡烛图所需的统一数据结构。
 * - KLinePoint: 单年一根 K 线，含开/收/高/低、score、六维小分与流年断语。
 * - DaYunSegment: 12 步大运分段（用于 markArea 着色）。
 * - SummaryStats: 摘要统计（均分/峰/谷）。
 * - RelationKind: 命局/岁/运之间的冲合刑害标签。
 */

import type { BaziChartResult } from "mingyu-core/bazi";

export type RelationKind =
  | "六冲"
  | "六合"
  | "三合"
  | "三会"
  | "三刑"
  | "六害"
  | "天克地冲"
  | "岁运并临"
  | "伏吟"
  | "反吟";

export type TenGodKey =
  | "比肩"
  | "劫财"
  | "食神"
  | "伤官"
  | "偏财"
  | "正财"
  | "七杀"
  | "正官"
  | "偏印"
  | "正印";

export type WuXing = "木" | "火" | "土" | "金" | "水";

export interface RelationFact {
  /** 关系类型 */
  kind: RelationKind;
  /** 涉及的对象（如"流年地支 午 与大运地支 子"） */
  between: string;
  /** 影响正负分（-6 ~ +6） */
  delta: number;
}

export interface DimensionScores {
  career: number; // 事业（官杀 + 食伤辅助）
  wealth: number; // 财富（正偏财）
  marriage: number; // 姻缘（财星对男/官星对女 + 配偶宫）
  health: number; // 健康（印星 + 调候 + 食伤泄秀）
  family: number; // 六亲（印比为主）
}

export interface KLinePoint {
  /** 索引年龄（虚岁），1 起 */
  age: number;
  /** 公历年 */
  year: number;
  /** 流年干支 */
  ganZhi: string;
  /** 流年天干十神 */
  tenGod: TenGodKey;
  /** 流年地支十神（取主气藏干） */
  tenGodZhi: TenGodKey;
  /** 所属大运干支 */
  daYun: string;
  /** 起始大运岁数 */
  daYunStartAge: number;
  /** 流年地支五行 */
  wuxing: WuXing;
  /** 冲合刑害关系列表 */
  relations: RelationFact[];
  /** K 线四值 */
  open: number;
  close: number;
  high: number;
  low: number;
  /** 综合均分 */
  score: number;
  /** 六维分 */
  dimensionScores: DimensionScores;
  /** 一句断语 */
  reason: string;
}

export interface DaYunSegment {
  /** 起始年龄 */
  startAge: number;
  /** 结束年龄（含） */
  endAge: number;
  /** 大运干支 */
  ganZhi: string;
  /** 大运十神 */
  tenGod: TenGodKey;
  /** 该大运的基线分 */
  baseline: number;
}

export interface SummaryStats {
  averageScore: number;
  peak: { age: number; year: number; score: number; ganZhi: string };
  valley: { age: number; year: number; score: number; ganZhi: string };
}

export interface KLineEngineInput {
  chart: BaziChartResult;
  /** 从出生年起算的年数，默认 100 */
  years: number;
}

export interface KLineEngineResult {
  points: KLinePoint[];
  daYun: DaYunSegment[];
  summary: SummaryStats;
  /** 排盘主体信息（方便 UI 复用） */
  chart: BaziChartResult;
}
