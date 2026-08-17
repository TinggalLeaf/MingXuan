#!/usr/bin/env node
/**
 * 下载 PiPiName / chinese-poetry 全量古诗文到 public/naming-data/
 *
 * 来源：
 *   - https://github.com/NanBox/PiPiName/tree/master/data
 *     （已包含 chinese-poetry 整理后的精简版，按卷切分）
 *
 * 用途：起名系统按需懒加载这些数据，并配合 build-poetry-index.mjs
 *       预计算 phrase → source 的索引以加速查询。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/naming-data");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "https://raw.githubusercontent.com/NanBox/PiPiName/master/data";

// 已知文件清单（直接下载）
const FLAT_FILES = [
  "Chinese_Names.dat",
  "chaizi-ft.dat",
  "stoke.dat",
  "周易.txt",
  "楚辞.txt",
  "论语.json",
  "诗经.json",
];

async function download(rel) {
  const url = `${BASE}/${rel}`;
  const out = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(out, buf);
    const sz = buf.length;
    console.log(`  ✓ ${rel}  (${(sz / 1024).toFixed(1)} KB, ${Date.now() - t0}ms)`);
    return sz;
  } catch (e) {
    console.log(`  ✗ ${rel}: ${e.message}`);
    return 0;
  }
}

async function listTree(rel) {
  const url = `https://api.github.com/repos/NanBox/PiPiName/contents/data/${encodeURIComponent(rel)}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  return await r.json();
}

async function main() {
  console.log("[download] PiPiName 全量古诗文 →", OUT);
  let total = 0;
  console.log("\n[1/3] 单文件：");
  for (const f of FLAT_FILES) total += await download(f);
  console.log("\n[2/3] 目录：唐诗 / 宋词 / 宋诗");
  for (const dir of ["唐诗", "宋词", "宋诗"]) {
    const items = await listTree(dir);
    console.log(`  · ${dir}: ${items.length} files`);
    for (const it of items) {
      total += await download(`${dir}/${it.name}`);
    }
  }
  console.log(`\n[done] 总计 ${(total / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});