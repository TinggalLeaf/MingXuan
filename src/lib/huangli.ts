/**
 * 黄历宜忌 · 本地数据服务
 *
 * 数据源：https://www.huangli123.net/huangli/yyyy-mm-dd.html
 * 抓取由 Rust 后端 `huangli_lookup` 完成（绕过 CORS），返回结构化 JSON。
 *
 * 字段完整覆盖原页所有板块：
 *   干支时辰、八字、纳音、五行、节气、值神、十二神、六耀、神煞、宜忌、
 *   财/喜/福/贵/胎神方位、相冲、吉凶时、神煞、空亡、九宫飞星、星宿、
 *   河图洛书、卦象、农历信息、嫁娶表、犯太岁表、十二时辰完整明细、五行旺衰...
 */

export interface HuangliHour {
  /** 时辰名（子/丑/.../亥） */
  shichen: string;
  /** 时段（如 23:00-00:59） */
  timeRange: string;
  /** 干支（如 壬子） */
  ganzhi: string;
  /** 星神（截路/玉堂/天牢/玄武...） */
  starGod: string;
  /** 正冲（与哪个时辰相冲） */
  chong: string;
  /** 吉 / 凶 */
  fortune: "吉" | "凶";
  /** 生肖 */
  zodiac: string;
  /** 吉神列表 */
  luckyGods: string[];
  /** 凶煞列表 */
  evilGods: string[];
  /** 时宜列表 */
  yi: string[];
  /** 时忌列表 */
  ji: string[];
  /** 五行 */
  wuxing: string;
  /** 煞方 */
  shaDirection: string;
  /** 财神方位 */
  caiShen: string;
  /** 喜神方位 */
  xiShen: string;
  /** 五行旺衰百分比（按 金木水火土 顺序） */
  wuxingPct: number[];
}

export interface HuangliDay {
  /** 公历 yyyy-mm-dd */
  date: string;
  /** 周几（用于表格展示） */
  week?: string;
  /** 农历文本（如：丙午年 七月初五 小月） */
  lunar: string;
  /** 节日（仅在 tyme4ts 兜底时有值） */
  festival?: string;
  /** 法定假日 */
  legalHoliday?: string;
  /** 完整四柱（年柱、月柱、日柱） */
  ganzhiYear: string;
  ganzhiMonth: string;
  ganzhiDay: string;
  /** 生肖年（如：马） */
  zodiac: string;
  /** 星座（如：狮子座） */
  constellation: string;
  /** 五行（年/月/日 - 如 天河水 / 山下火 / 大海水） */
  wuxingYear: string;
  wuxingMonth: string;
  wuxingDay: string;
  /** 甲子五行（数字编码，如 甲子五行 = 水） */
  wuxingNumeric: string;
  /** 节气（当前 + 下一个 + 时间） */
  solarTerm: { name: string; date: string; time?: string };
  nextSolarTerm?: { name: string; date: string; time?: string };
  /** 值神 */
  dutyGod: string;
  /** 十二神 */
  twelveStar: string;
  /** 六耀 */
  liuYao: string;
  /** 日禄 */
  riLu: string;
  /** 公历完整 */
  solarFull: string;
  /** 农历完整 */
  lunarFull: string;
  /** 农历详情（年柱 月柱 日柱） */
  pillars: string;
  /** 农历总天数 */
  lunarYearDays: { year: string; total: number; range: string; passed: number; remaining: number };
  /** 月令、物候、月相 */
  monthState: { monthOrder: string; phenology: string; phase: string };
  /** 宜（完整列表） */
  yi: string[];
  /** 忌（完整列表） */
  ji: string[];
  /** 神煞方位 */
  caiShen: string;
  xiShen: string;
  fuShen: string;
  guiShen: { yang: string; yin: string };
  /** 胎神 */
  taiShen: { month: string; day: string; direction?: string };
  /** 相冲 */
  chong: string;
  /** 吉神宜趋 */
  luckyGods: string[];
  /** 凶煞宜忌 */
  evilGods: string[];
  /** 彭祖百忌 */
  pengzu: string[];
  /** 大殓吉时 */
  daLianLuckyHours: string[];
  /** 空亡所值 */
  kongWang: { year: string; month: string; day: string };
  /** 九宫飞星 */
  nineStar: { name: string; description: string; poem: string };
  /** 今日星宿 */
  starSign: string;
  /** 的呼勿近 */
  riHu: string;
  /** 今日冲合 */
  chongHe: string[];
  /** 三煞方 */
  sanSha: { year: string; month: string; day: string };
  /** 七煞方 */
  qiSha: { year: string; month: string; day: string };
  /** 岁煞 / 月煞 */
  suiSha: { year: string; month: string };
  /** 今日河图洛书九星吉凶 */
  luoshu: { name: string; poem: string; front: string; back: string; interpretation: string };
  /** 今日卦象（剥卦） */
  gua: { name: string; symbol: string; structure: string; description: string };
  /** 十二时辰完整 */
  hours: HuangliHour[];
  /** 今日十二神吉凶所主 */
  twelveStarPoem: string;
  /** 今日二十八星宿吉凶 */
  starSignPoem: string;
  /** 地母经 */
  dimu: string[];
  /** 地母经诗 */
  dimuPoem: string[];
  /** 七/十二月丰歉歌 */
  harvestPoem: string[];
  /** 嫁娶吉凶表（仅生日当天） */
  marriageTable: { forbidden: string[]; allowed: string[] };
  /** 来源 */
  source?: string;
}

let cache: Map<string, HuangliDay> | null = null;
let loadPromise: Promise<Map<string, HuangliDay>> | null = null;

/** 懒加载本地 JSON 数据（备用） */
export async function loadHuangliDb(): Promise<Map<string, HuangliDay>> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const r = await fetch("/huangli-2026.json", { cache: "force-cache" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const m = new Map<string, HuangliDay>();
      for (const d of (data.entries ?? data) as HuangliDay[]) {
        m.set(d.date, d);
      }
      cache = m;
      return m;
    } catch {
      cache = new Map();
      return cache;
    }
  })();
  return loadPromise;
}

/** 获取某日的黄历；返回 null 表示无数据 */
export async function getHuangli(date: Date | string): Promise<HuangliDay | null> {
  const d = typeof date === "string" ? date : formatDate(date);
  const db = await loadHuangliDb();
  return db.get(d) ?? null;
}

/** 批量获取（用于日历视图） */
export async function getHuangliRange(from: Date, to: Date): Promise<Record<string, HuangliDay>> {
  const db = await loadHuangliDb();
  const out: Record<string, HuangliDay> = {};
  const cur = new Date(from);
  while (cur <= to) {
    const key = formatDate(cur);
    const v = db.get(key);
    if (v) out[key] = v;
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** 工具：Date → yyyy-mm-dd */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 黄历日吉凶打分（基于宜忌数量） */
export function luckyScore(day: HuangliDay): number {
  const good = day.yi.length;
  const bad = day.ji.length;
  if (good + bad === 0) return 50;
  return Math.round((good / (good + bad)) * 100);
}

/** 宜忌归类（婚嫁/出行/修造/...） */
export const YI_CATEGORIES: Record<string, string> = {
  嫁娶: "婚嫁", 订盟: "婚嫁", 纳采: "婚嫁",
  出行: "出行", 移徙: "出行", 入宅: "出行", 迁居: "出行", 旅游: "出行", 出火: "出行",
  修造: "修造", 动土: "修造", 竖柱: "修造", 上梁: "修造", 装修: "修造", 安门: "修造",
  入殓: "祭祀", 破土: "祭祀", 安葬: "祭祀", 祭祀: "祭祀", 祈福: "祭祀", 斋醮: "祭祀", 求嗣: "祭祀", 开光: "祭祀",
  开市: "开业", 立券: "开业", 交易: "开业", 纳财: "开业", 挂匾: "开业",
  栽种: "农事", 牧养: "农事", 收割: "农事", 纳畜: "农事",
  治病: "医疗", 针灸: "医疗", 服药: "医疗",
  入学: "学业", 习艺: "学业",
  沐浴: "日常", 剃头: "日常", 扫舍: "日常", 修饰垣墙: "日常",
  造车器: "工业", 造船: "工业",
};

/** 按主题过滤宜忌 */
export function filterByCategory(items: string[], category: string): string[] {
  return items.filter((x) => YI_CATEGORIES[x] === category);
}