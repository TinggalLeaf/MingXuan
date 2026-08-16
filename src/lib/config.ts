/**
 * 明玄 · 全局配置
 * 所有可配置项通过 VITE_* 环境变量注入（见 .env.example）。
 * 客户端/服务端均可安全使用。
 */

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

function int(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const siteConfig = {
  name: import.meta.env.VITE_SITE_NAME || "明玄",
  slogan: import.meta.env.VITE_SITE_SLOGAN || "以古今之智，观人生起伏",
} as const;

/** 功能模块开关 */
export const features = {
  bazi: bool(import.meta.env.VITE_FEATURE_BAZI, true),
  ziwei: bool(import.meta.env.VITE_FEATURE_ZIWEI, true),
  astrolabe: bool(import.meta.env.VITE_FEATURE_ASTROLABE, true),
  qizheng: bool(import.meta.env.VITE_FEATURE_QIZHENG, true),
  fengshui: bool(import.meta.env.VITE_FEATURE_FENGSHUI, true),
  kline: bool(import.meta.env.VITE_FEATURE_KLINE, true),
  hepan: bool(import.meta.env.VITE_FEATURE_HEPAN, true),
  liuyao: bool(import.meta.env.VITE_FEATURE_LIUYAO, true),
  meihua: bool(import.meta.env.VITE_FEATURE_MEIHUA, true),
  qimen: bool(import.meta.env.VITE_FEATURE_QIMEN, true),
  liuren: bool(import.meta.env.VITE_FEATURE_LIUREN, true),
  taiyi: bool(import.meta.env.VITE_FEATURE_TAIYI, true),
  huangji: bool(import.meta.env.VITE_FEATURE_HUANGJI, true),
  wuyun: bool(import.meta.env.VITE_FEATURE_WUYUN, true),
  tarot: bool(import.meta.env.VITE_FEATURE_TAROT, true),
  lingqian: bool(import.meta.env.VITE_FEATURE_LINGQIAN, true),
  zeri: bool(import.meta.env.VITE_FEATURE_ZERI, true),
} as const;

export type FeatureKey = keyof typeof features;

/** 人生 K 线配置 */
export const klineConfig = {
  colorMode: (import.meta.env.VITE_KLINE_COLOR_MODE === "us" ? "us" : "cn") as "cn" | "us",
  years: int(import.meta.env.VITE_KLINE_YEARS, 100),
} as const;

/** AI 解读配置（OpenAI 兼容接口，未配置则隐藏 AI 功能） */
export const aiConfig = {
  baseUrl: import.meta.env.VITE_AI_BASE_URL || "",
  apiKey: import.meta.env.VITE_AI_API_KEY || "",
  model: import.meta.env.VITE_AI_MODEL || "",
  get enabled() {
    return Boolean(this.baseUrl && this.apiKey && this.model);
  },
} as const;

/** 排盘默认项 */
export const paipanDefaults = {
  trueSolarTime: bool(import.meta.env.VITE_DEFAULT_TRUE_SOLAR_TIME, false),
  ziweiAlgorithm: (import.meta.env.VITE_ZIWEI_ALGORITHM === "zhongzhou" ? "zhongzhou" : "default") as
    | "default"
    | "zhongzhou",
} as const;
