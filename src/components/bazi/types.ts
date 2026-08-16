/**
 * Local type helpers for the Bazi page.
 *
 * `mingyu-core/bazi` 只重新导出了少量顶层类型（`BaziChartResult`、`Pillar` 等），
 * 而 `LiunianInfo`、`LuckCycle`、`HiddenStems`、`SolarDateTimeInfo` 等类型未在
 * `dist/bazi/index.d.ts` 中 re-export，但 pages 组件需要它们。
 * 这里按 `baziTypes.d.ts` 中的定义镜像一份本地版本，避免依赖未公开的深层路径。
 */

export interface LiunianInfo {
  year: number;
  age: number;
  ganZhi: string;
  tenGod: string;
  tenGodZhi: string;
  xiaoyun?: XiaoyunInfo;
}

export interface XiaoyunInfo {
  ganZhi: string;
  tenGod: string;
  tenGodZhi: string;
}

export interface SolarDateTimeInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface LuckCycle {
  age: number;
  year: number;
  ganZhi: string;
  isXiaoyun: boolean;
  type: string;
  startSolarTime?: SolarDateTimeInfo;
  endSolarTime?: SolarDateTimeInfo;
  years: LiunianInfo[];
  resolvedYears?: LiunianInfo[];
}

export interface HiddenStems {
  year: string[];
  month: string[];
  day: string[];
  hour: string[];
}