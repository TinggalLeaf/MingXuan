/**
 * 周公解梦 · 本地资料库
 *
 * 数据来源：jiemengwang.net（解梦网）公开释梦条目，已由 scripts/crawl-jiemengwang.mjs 离线抓取。
 *
 * 默认资料库（9550+ 条）作为源代码的一部分放在 src/lib/dream-db/ 下，按 10 大类拆分；
 * 首次访问时写入 localStorage，之后的导入/收藏/历史与默认库共存。
 *
 * 数据结构：
 * DreamEntry {
 *   id          唯一 id
 *   title       梦境标题（如「梦见飞起来了」）
 *   category    大类（人物 / 动物 / 植物 / 物品 / 活动 / 生活 / 自然 / 鬼神 / 建筑 / 其它）
 *   summary     一句话简述
 *   content     完整解梦内容（Markdown）
 *   tags        关键字
 *   source      'crawl' | 'seed' | 'import'
 *   sourceUrl   原网址
 *   updatedAt
 * }
 */

import { DEFAULT_DREAM_DB } from "./dream-db";

export type DreamCategory =
  | "人物"
  | "动物"
  | "植物"
  | "物品"
  | "活动"
  | "生活"
  | "自然"
  | "鬼神"
  | "建筑"
  | "其它";

export interface DreamEntry {
  id: string;
  title: string;
  category: DreamCategory;
  summary: string;
  content: string;
  tags: string[];
  source: "seed" | "crawl" | "import";
  sourceUrl?: string;
  updatedAt: number;
}

const LS_DB = "mingxuan.dream.db";
const LS_HISTORY = "mingxuan.dream.history";
const LS_FAVORITES = "mingxuan.dream.favorites";
const LS_DB_VERSION = "mingxuan.dream.db.version";
/** 当前数据版本号；只要 DEFAULT_DREAM_DB 内容升级就 bump 此号，强制刷新 */
const CURRENT_DB_VERSION = 2;

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `d_${(h >>> 0).toString(36)}`;
}

/**
 * 启动时把 9550+ 默认条目合并入 localStorage（按 id 去重，不覆盖用户修改）。
 *
 * - 若 localStorage 完全没有 → 写入完整默认库
 * - 若版本号低于 CURRENT_DB_VERSION → 清空旧库（保留收藏/历史），写入新默认库
 * - 若版本号已匹配 → 仅做一次「缺则补」的合并（保证后续默认库变更能增量生效）
 *
 * 收藏/历史 key 与 DB 是分离存储，因此清空 DB 不会丢失用户的收藏与历史。
 */
function ensureSeed(): DreamEntry[] {
  let existing: DreamEntry[] = [];
  let storedVersion = 0;
  try {
    const raw = localStorage.getItem(LS_DB);
    if (raw) {
      const arr = JSON.parse(raw) as DreamEntry[];
      if (Array.isArray(arr)) existing = arr;
    }
    storedVersion = Number(localStorage.getItem(LS_DB_VERSION) || "0");
  } catch {
    /* ignore */
  }

  // 版本不匹配：清空旧 DB（收藏/历史 key 独立，不受影响）
  if (storedVersion < CURRENT_DB_VERSION) {
    try {
      localStorage.removeItem(LS_DB);
    } catch { /* ignore */ }
    existing = [];
  }

  // 合并：以 id 为键
  const map = new Map<string, DreamEntry>();
  for (const d of existing) map.set(d.id, d);
  for (const e of DEFAULT_DREAM_DB) {
    const id = e.id || hashId(e.title);
    if (!map.has(id)) {
      map.set(id, {
        ...e,
        id,
        source: (e.source as DreamEntry["source"]) || "crawl",
        updatedAt: e.updatedAt || Date.now(),
      });
    }
  }
  const next = Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "zh"));

  try {
    localStorage.setItem(LS_DB, JSON.stringify(next));
    localStorage.setItem(LS_DB_VERSION, String(CURRENT_DB_VERSION));
    window.dispatchEvent(new CustomEvent("mx-dream-changed"));
  } catch {
    /* localStorage 容量超限等情况 */
  }
  return next;
}

/** 同步触发初始化（用于 main.tsx 启动阶段） */
export function initDreamDb() {
  ensureSeed();
}

/**
 * 兼容旧调用方（Dream.tsx）。当前实现下，默认数据已在启动期同步注入，
 * 此函数保留为空操作；后续若改为异步加载可在此实现真实加载逻辑。
 */
export function ensureCrawledDbLoaded(): Promise<void> {
  return Promise.resolve();
}

export function getAllDreams(): DreamEntry[] {
  return ensureSeed();
}

export function getDreamById(id: string): DreamEntry | undefined {
  return getAllDreams().find((d) => d.id === id);
}

/** 关键字检索（标题/摘要/标签/内容） */
export function searchByKeyword(q: string): DreamEntry[] {
  const all = getAllDreams();
  const norm = q.trim().toLowerCase();
  if (!norm) return all;
  return all.filter((d) => {
    if (d.title.toLowerCase().includes(norm)) return true;
    if ((d.category as string).includes(norm)) return true;
    if (d.summary.toLowerCase().includes(norm)) return true;
    if (d.tags.some((t) => t.includes(norm))) return true;
    if (d.content.toLowerCase().includes(norm)) return true;
    return false;
  });
}

/** 自然语言解析：把用户描述拆成多个关键字 + 分类，命中权重靠前的条目 */
export function searchByNatural(text: string, limit = 8): DreamEntry[] {
  if (!text.trim()) return [];
  const all = getAllDreams();
  // 常见停用词
  const stop = new Set([
    "我", "的", "了", "是", "在", "和", "与", "或", "也", "还", "就", "都",
    "a", "an", "the", "to", "of", "in", "on", "and", "or",
  ]);
  const tokens = new Set<string>();
  const t = text.toLowerCase().replace(/\s+/g, " ");
  for (const ch of t) {
    if (/[一-龥]/.test(ch) && !stop.has(ch)) tokens.add(ch);
  }
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1];
    if (/[一-龥]/.test(a) && /[一-龥]/.test(b)) {
      const phrase = a + b;
      if (!stop.has(phrase)) tokens.add(phrase);
    }
  }
  for (const w of t.split(/[^a-z0-9]+/)) {
    if (w && !stop.has(w)) tokens.add(w);
  }

  const scored = all.map((d) => {
    let score = 0;
    for (const tk of tokens) {
      if (d.title.includes(tk)) score += 6;
      if (d.tags.some((tg) => tg.includes(tk))) score += 4;
      if (d.summary.includes(tk)) score += 3;
      if (d.content.includes(tk)) score += 1;
      if (tk.length === 2 && d.title.includes(tk)) score += 2;
    }
    return { d, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.d);
}

/** 合并外部抓取 / 导入的条目（按 id 去重） */
export function mergeDreams(entries: Omit<DreamEntry, "id" | "updatedAt" | "source">[]) {
  const all = ensureSeed();
  const map = new Map(all.map((d) => [d.id, d] as const));
  for (const e of entries) {
    const id = hashId(e.title);
    map.set(id, { ...e, id, source: "import", updatedAt: Date.now() });
  }
  const next = Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "zh"));
  localStorage.setItem(LS_DB, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("mx-dream-changed"));
  return next;
}

export function replaceAllDreams(entries: DreamEntry[]) {
  const next = entries.map((e) => ({ ...e, id: e.id || hashId(e.title), updatedAt: e.updatedAt || Date.now() }));
  localStorage.setItem(LS_DB, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("mx-dream-changed"));
  return next;
}

// ===== 解梦历史 =====

export interface DreamHistoryItem {
  id: string;
  query: string;
  matchedIds: string[];
  aiAnswer?: string;
  createdAt: number;
}

export function getDreamHistory(): DreamHistoryItem[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function pushDreamHistory(item: Omit<DreamHistoryItem, "createdAt">) {
  const list = getDreamHistory();
  list.unshift({ ...item, createdAt: Date.now() });
  localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new CustomEvent("mx-dream-changed"));
}

// ===== 收藏 =====

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function toggleFavorite(id: string) {
  const list = getFavorites();
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(id);
  localStorage.setItem(LS_FAVORITES, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("mx-dream-changed"));
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

// ===== 资料库统计 =====

export function dbStats() {
  const all = ensureSeed();
  const byCat: Record<string, number> = {};
  for (const d of all) byCat[d.category] = (byCat[d.category] ?? 0) + 1;
  return {
    total: all.length,
    byCategory: byCat,
    lastUpdate: all.reduce((m, d) => Math.max(m, d.updatedAt), 0),
  };
}