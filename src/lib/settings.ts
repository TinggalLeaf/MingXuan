/**
 * 明玄 · 全局设置（外观 / 字体 / 主题 / 偏好）
 *
 * - 外观设置同步写入 document.documentElement 上的 data-* / CSS 变量，立即生效。
 * - 持久化：浏览器端 localStorage，Tauri 下同步到 Rust profiles.json 之外的 settings.json。
 * - 任何页面 listen「mx-settings-changed」事件以响应外部修改。
 */

export type ThemeMode = "dark" | "light" | "system";

export type FontFamily =
  | "song" // 思源宋体（默认中文衬线）
  | "kai" // 楷体（更适合玄学氛围）
  | "hei" // 黑体（更清晰）
  | "yuan" // 圆体（柔和）
  | "system" // 跟随系统
  | "custom"; // 用户自定义（任意系统已安装字体）

/**
 * 常用系统字体预设（中英各 ~15 种），覆盖 Win / Mac / 常见 Linux 桌面。
 * 此外用户也可在「自定义字体」中输入任意已安装的字体名。
 */
export const FONT_PRESETS: { id: FontFamily; label: string; stack: string }[] = [
  {
    id: "song",
    label: "宋体（默认）",
    stack: '"Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", "Songti SC", serif',
  },
  {
    id: "kai",
    label: "楷体",
    stack: '"Kaiti SC", "KaiTi", "STKaiti", "Noto Serif SC", serif',
  },
  {
    id: "hei",
    label: "黑体",
    stack: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  },
  {
    id: "yuan",
    label: "圆体",
    stack: '"Noto Sans SC", "Yuanli SC", "PingFang SC", system-ui, sans-serif',
  },
  {
    id: "system",
    label: "系统字体",
    stack: 'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
];

/**
 * 常用 OS 字体候选（用于「自定义字体」下拉选择与按字体名即时预览）。
 * 实际渲染仍走用户系统；本列表只做 UI 提示。
 */
export const COMMON_FONT_NAMES = [
  // 中文字体
  "Noto Serif SC", "Noto Sans SC", "Source Han Serif SC", "Source Han Sans SC",
  "SimSun", "SimHei", "Microsoft YaHei", "Microsoft JhengHei",
  "PingFang SC", "PingFang TC", "Hiragino Sans GB",
  "STSong", "STKaiti", "STXihei", "STZhongsong",
  "KaiTi", "STHeiti", "STFangsong", "Songti SC",
  "FangSong", "FangSong_GB2312", "YouYuan", "Yuanti SC",
  "Kaiti SC", "Hannotate SC", "Hannotate TC", "WenQuanYi Zen Hei", "WenQuanYi Micro Hei",
  // 西文
  "Arial", "Arial Black", "Helvetica", "Helvetica Neue", "Times New Roman", "Times",
  "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "Courier New", "Courier",
  "Palatino", "Garamond", "Comic Sans MS", "Impact", "Lucida Console",
  "Optima", "Futura", "Gill Sans", "Rockwell", "Baskerville",
  "Cambria", "Calibri", "Consolas", "Segoe UI", "Cascadia Code", "Cascadia Mono",
  // 等宽
  "Menlo", "Monaco", "Source Code Pro", "Fira Code", "JetBrains Mono", "Roboto Mono",
  // Mac 系统
  "Avenir", "Avenir Next", "Avenir LT Std", "Charter", "Optima Nova", "Snell Roundhand",
  // 设计类
  "Optima", "Didot", "Bodoni 72", "Brush Script MT",
];

export interface AppSettings {
  themeMode: ThemeMode;
  /** 自适应 true 时跟随系统 */
  followSystem: boolean;
  fontFamily: FontFamily;
  /** 自定义字体名（仅 fontFamily === "custom" 时生效） */
  customFontName: string;
  fontWeight: "normal" | "medium" | "bold";
  fontScale: number; // 0.9 - 1.25
  /** AI 解读默认模板风格（决定固定提示词的强度） */
  aiTemplate: "concise" | "standard" | "detailed" | "classical";
  /** AI 输出 Markdown 主题增强 */
  markdownEnhanced: boolean;
  /** 是否在窗口内显示五行轮播动画 */
  reduceMotion: boolean;
  /** 周公解梦：是否启用自然语言 AI 解析 */
  dreamAiParse: boolean;
  /** 周公解梦：首选解析模型（同 ai.model） */
  preferredChartId: string; // 默认命盘
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: "dark",
  followSystem: true,
  fontFamily: "song",
  customFontName: "",
  fontWeight: "normal",
  fontScale: 1,
  aiTemplate: "standard",
  markdownEnhanced: true,
  reduceMotion: false,
  dreamAiParse: true,
  preferredChartId: "",
};

const LS_KEY = "mingxuan.settings";

const FONT_STACK: Record<FontFamily, string> = {
  song: '"Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", "Songti SC", serif',
  kai: '"Kaiti SC", "KaiTi", "STKaiti", "Noto Serif SC", serif',
  hei: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  yuan: '"Noto Sans SC", "Yuanli SC", "PingFang SC", system-ui, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  custom: '__CUSTOM__', // 运行时由 customFontName 替换
};

/** 加载本地设置（无则返回默认值） */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

/** 保存并应用设置 */
export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applySettings(next);
  // 通知订阅者
  window.dispatchEvent(new CustomEvent("mx-settings-changed", { detail: next }));
  return next;
}

/** 把设置应用到 documentElement（主题/字体/动效） */
export function applySettings(s: AppSettings) {
  const root = document.documentElement;
  // 主题
  const effectiveDark =
    s.themeMode === "dark" ||
    (s.themeMode === "system" &&
      (!s.followSystem || (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches)));
  root.dataset.theme = effectiveDark ? "dark" : "light";
  root.dataset.themeMode = s.themeMode;
  // 字体
  let stack: string;
  if (s.fontFamily === "custom") {
    const name = s.customFontName.trim();
    // 用引号包裹名称（支持空格/中文），加系统兜底
    stack = name ? `"${name}", ${FONT_STACK.system}` : FONT_STACK.system;
  } else {
    stack = FONT_STACK[s.fontFamily];
  }
  root.style.setProperty("--font-app", stack);
  root.style.setProperty("--font-app-weight", s.fontWeight === "bold" ? "700" : s.fontWeight === "medium" ? "550" : "400");
  root.dataset.fontFamily = s.fontFamily;
  root.dataset.fontWeight = s.fontWeight;
  // 字号缩放（基础字号 16px）
  root.style.setProperty("--font-scale", String(s.fontScale));
  root.dataset.fontScale = String(s.fontScale);
  // 减弱动效
  root.dataset.reduceMotion = s.reduceMotion ? "true" : "false";
}

/** 初始化：页面加载时调用一次 */
export function initSettings() {
  const s = loadSettings();
  applySettings(s);
  // 系统主题变化时实时同步（仅当主题为 system）
  if (s.themeMode === "system" && typeof window !== "undefined" && window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (loadSettings().themeMode === "system") applySettings(loadSettings());
    });
  }
  return s;
}