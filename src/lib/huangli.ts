/**
 * 黄历宜忌 · 本地数据服务
 *
 * 数据来源：huangli123.net/huangli/ 公历每日黄历页。
 * 抓取脚本：scripts/crawl-huangli.mjs（pnpm crawl:huangli）
 * 数据文件：public/huangli-2026.json（含近 1 年每日宜忌、神煞、吉时、冲煞、胎神等）
 *
 * 浏览器/Tauri 通用；离线可用；按需懒加载。
 */

export interface HuangliDay {
  /** 公历 yyyy-mm-dd */
  date: string;
  /** 农历日期（如：二零二六年二月十五） */
  lunar: string;
  /** 干支日（如：壬寅） */
  ganzhiDay: string;
  /** 干支月 */
  ganzhiMonth: string;
  /** 干支年 */
  ganzhiYear: string;
  /** 生肖年（如：虎） */
  zodiac: string;
  /** 五行日（如：剑锋金） */
  wuxingDay?: string;
  /** 宜（数组） */
  yi: string[];
  /** 忌（数组） */
  ji: string[];
  /** 冲煞（如：冲猴煞北） */
  chongsha?: string;
  /** 胎神方位 */
  taishen?: string;
  /** 彭祖百忌 */
  pengzu?: string;
  /** 吉时（数组） */
  luckyHours?: string[];
  /** 凶时（数组） */
  unluckyHours?: string[];
  /** 五行值（数值越大能量越强） */
  wuxingValue?: number;
  /** 节气 */
  solarTerm?: string;
}

let cache: Map<string, HuangliDay> | null = null;
let loadPromise: Promise<Map<string, HuangliDay>> | null = null;

/** 懒加载本地 JSON 数据 */
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
    } catch (e) {
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
  // 宜多吉、忌少凶；返回 0-100
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