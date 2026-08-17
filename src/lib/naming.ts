/**
 * 起名 · 三才五格 + 古诗文（基于 PiPiName 全量本地索引）
 *
 * 数据流：所有古籍数据（48 万句诗经/楚辞/论语/周易/唐诗/宋诗/宋词 + 29 万常见姓名 + 82 万候选名）
 * 已构建为 SQLite 索引 public/naming-data/pipiname.sqlite3（252 MB）。
 *
 * 前端不直接加载数据库，通过 Tauri Rust 命令（name_search / name_lookup）查询：
 *   - 避免 250 MB 资源进 bundle
 *   - 借用 rusqlite 的 C 性能
 *   - 浏览器/Tauri 都能用 invoke 调用（fallback 到空数组）
 */

import strokeData from "./naming-data/unihan-strokes.json";

// ===== 笔画查询（本地 Unihan 数据） =====

const NUMBER_STROKES: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
};

export function getStroke(ch: string): number {
  if (NUMBER_STROKES[ch] !== undefined) return NUMBER_STROKES[ch];
  const v = (strokeData as Record<string, number>)[ch];
  return typeof v === "number" ? v : 0;
}

// ===== 三才五格算法（前端独立实现，参考 Rust 端） =====

const STROKE_GOODS = new Set([
  1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18,
  21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41,
  45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81,
]);
const STROKE_GENERALS = new Set([27, 38, 42, 55, 58, 71, 72, 73, 77, 78]);
const WUXING_GOODS = new Set([
  "木木木", "木木火", "木木土", "木火木", "木火土", "木水木", "木水金", "木水水",
  "火木木", "火木火", "火木土", "火火木", "火火土", "火土火", "火土土", "火土金",
  "土火木", "土火火", "土火土", "土土火", "土土土", "土土金", "土金土", "土金金",
  "土金水", "金土火", "金土土", "金土金", "金金土", "金水木", "金水金", "水木木",
  "水木火", "水木土", "水木水", "水金土", "水金水", "水水木", "水水金",
]);

function wuxing(n: number): string {
  const v = n % 10;
  if (v === 1 || v === 2) return "木";
  if (v === 3 || v === 4) return "火";
  if (v === 5 || v === 6) return "土";
  if (v === 7 || v === 8) return "金";
  return "水";
}

export type GridKind = "大吉" | "中吉" | "凶" | "";

export interface GridItem {
  value: number;
  kind: GridKind;
}

export function strokeKind(n: number): GridKind {
  if (STROKE_GOODS.has(n)) return "大吉";
  if (STROKE_GENERALS.has(n)) return "中吉";
  return "凶";
}

export function calcWuge(name: string) {
  if (name.length !== 3) throw new Error("三才五格仅支持单姓双字名（3 个汉字）");
  const x = getStroke(name[0]);
  const m1 = getStroke(name[1]);
  const m2 = getStroke(name[2]);
  const tian = x + 1;
  const ren = x + m1;
  const di = m1 + m2;
  const zong = x + m1 + m2;
  const wai = zong - ren + 1;
  const sc = wuxing(tian) + wuxing(ren) + wuxing(di);
  return {
    name,
    strokes: [x, m1, m2] as [number, number, number],
    tian: { value: tian, kind: strokeKind(tian) },
    ren: { value: ren, kind: strokeKind(ren) },
    di: { value: di, kind: strokeKind(di) },
    zong: { value: zong, kind: strokeKind(zong) },
    wai: { value: wai, kind: strokeKind(wai) },
    sancai: sc,
    sancaiKind: (WUXING_GOODS.has(sc) ? "大吉" : "凶") as GridKind,
  };
}

// ===== 来源定义 =====

export type SourceId = "shijing" | "chuci" | "lunyu" | "zhouyi" | "tangshi" | "songshi" | "songci" | "common";

export const SOURCE_LABELS: Record<SourceId | "all" | "default", string> = {
  default: "默认",
  all: "全部",
  shijing: "诗经",
  chuci: "楚辞",
  lunyu: "论语",
  zhouyi: "周易",
  tangshi: "唐诗",
  songshi: "宋诗",
  songci: "宋词",
  common: "常见姓名",
};

// ===== 后端调用 =====

export interface NameCandidate {
  fullName: string;
  firstName: string;
  gender: string;
  stroke1: number;
  stroke2: number;
  source: SourceId;
  sourceLabel: string;
  title: string;
  author: string;
  sentence: string;
}

export interface GenerateOptions {
  surname: string;
  source: SourceId | "all" | "default";
  gender: "" | "男" | "女";
  allowGeneral: boolean;
  dislikeChars: string[];
  minStroke: number;
  maxStroke: number;
  limit: number;
}

export interface WugeResult {
  name: string;
  strokes: [number, number, number];
  tian: GridItem;
  ren: GridItem;
  di: GridItem;
  zong: GridItem;
  wai: GridItem;
  sancai: string;
  sancaiKind: GridKind;
  validGender?: string | null;
  resources: Array<{ source_type: string; title: string; author: string; sentence: string }>;
}

function mapSource(s: string): SourceId {
  const map: Record<string, SourceId> = {
    shijing: "shijing", chuci: "chuci", lunyu: "lunyu",
    zhouyi: "zhouyi", tangshi: "tangshi", songshi: "songshi", songci: "songci",
    default: "common",
  };
  return (map[s] ?? "common") as SourceId;
}

/** 通过 Rust 后端搜索候选名（按姓氏笔画对筛选大吉组合） */
export async function generateNames(opts: GenerateOptions): Promise<NameCandidate[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const resp = await invoke<{ results: any[]; count: number }>("name_search", {
      surname: opts.surname,
      source: opts.source === "common" || opts.source === "default" ? "all" : opts.source,
      gender: opts.gender,
      allowGeneral: opts.allowGeneral,
      dislike: opts.dislikeChars.join(""),
      minStroke: opts.minStroke,
      maxStroke: opts.maxStroke,
      limit: opts.limit,
    });
    return (resp.results ?? []).map((r: any) => ({
      fullName: r.full_name,
      firstName: r.first_name,
      gender: r.gender ?? "",
      stroke1: r.stroke1,
      stroke2: r.stroke2,
      source: mapSource(r.source),
      sourceLabel: SOURCE_LABELS[mapSource(r.source)] ?? r.source,
      title: r.title ?? "",
      author: r.author ?? "",
      sentence: r.sentence ?? "",
    }));
  } catch (e) {
    console.warn("name_search 失败（需在 Tauri 桌面端运行）：", e);
    return [];
  }
}

/** 通过 Rust 后端查 3 字名 + 三才五格 + 出处 */
export async function lookupName(name: string): Promise<WugeResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  const r = await invoke<any>("name_lookup", { name });
  return {
    name: r.name,
    strokes: r.strokes,
    tian: { value: r.tian, kind: r.tian_kind },
    ren: { value: r.ren, kind: r.ren_kind },
    di: { value: r.di, kind: r.di_kind },
    zong: { value: r.zong, kind: r.zong_kind },
    wai: { value: r.wai, kind: r.wai_kind },
    sancai: r.sancai,
    sancaiKind: r.sancai_kind,
    validGender: r.valid_gender ?? null,
    resources: (r.resources ?? []).map((x: any) => ({
      source_type: x.source_type,
      title: x.title,
      author: x.author,
      sentence: x.sentence,
    })),
  };
}