#!/usr/bin/env node
/**
 * 周公解梦 · 数据爬虫（jiemengwang.net）
 *
 * 数据源：https://www.jiemengwang.net/
 * 结构：
 *   - 分类页：/rw、/dw、/zw 等（每类 50 条/页，多页翻页 /rw/2、/rw/3...）
 *   - 词条：https://www.jiemengwang.net/{slug}/{id}.html
 *
 * 输出：public/dream-zhougong.json
 *
 * 使用方式：
 *   node scripts/crawl-jiemengwang.mjs
 */

const BASE = "https://www.jiemengwang.net";

const CATEGORIES = [
  { slug: "rw", name: "人物" },
  { slug: "dw", name: "动物" },
  { slug: "zw", name: "植物" },
  { slug: "wp", name: "物品" },
  { slug: "hd", name: "活动" },
  { slug: "sh", name: "生活" },
  { slug: "zr", name: "自然" },
  { slug: "gs", name: "鬼神" },
  { slug: "jz", name: "建筑" },
  { slug: "qt", name: "其它" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripScripts(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return "";
  return decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim();
}

function extractContent(html) {
  const candidates = [
    /<div[^>]*class=["'][^"']*content[^"']*["'][\s\S]*?<\/div>/i,
    /<article[\s\S]*?<\/article>/i,
  ];
  let block = html;
  for (const re of candidates) {
    const m = re.exec(html);
    if (m) {
      block = m[0];
      break;
    }
  }
  const paraRe = /<(p|h2|h3|h4|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  const out = [];
  let m;
  while ((m = paraRe.exec(block))) {
    const tag = m[1].toLowerCase();
    let txt = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
    txt = txt.replace(/\s+/g, " ").trim();
    if (!txt || txt.length < 6) continue;
    if (/^\s*(首页|上一页|下一页|相关阅读|免责|版权|登录|注册)\s*$/.test(txt)) continue;
    if (/周公解梦/.test(txt) && txt.length < 60) continue;
    if (tag === "h2" || tag === "h3" || tag === "h4") out.push(`## ${txt}`);
    else if (tag === "blockquote") out.push(`> ${txt}`);
    else out.push(txt);
    if (out.length > 80) break;
  }
  return out.join("\n\n");
}

async function safeFetch(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": BASE + "/",
      },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

async function pMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await fn(items[i], i);
      } catch {
        results[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/** 列出某个分类下所有条目 URL（自动翻页直到没有下一页） */
async function listCategoryEntries(slug) {
  const all = new Map();
  for (let page = 1; page <= 60; page++) {
    const url = page === 1 ? `${BASE}/${slug}` : `${BASE}/${slug}/${page}`;
    let html;
    try {
      html = await safeFetch(url);
    } catch {
      break;
    }
    const cleaned = stripScripts(html);
    // 链接是完整 URL: https://www.jiemengwang.net/rw/924.html
    const re = new RegExp(`href=["']https?:\\/\\/(?:www\\.)?jiemengwang\\.net(\\/${slug}\\/\\d+\\.html)["']`, "gi");
    let found = 0;
    let m;
    while ((m = re.exec(cleaned))) {
      const id = m[1].match(/\d+/)[0];
      if (!all.has(id)) {
        const titleMatch = new RegExp(
          `<a[^>]*href=["']https?:\\/\\/(?:www\\.)?jiemengwang\\.net${m[1].replace(/\//g, "\\/")}["'][^>]*>([\\s\\S]*?)<\\/a>`,
          "i",
        ).exec(cleaned);
        const title = titleMatch
          ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, "")).trim().replace(/\s+/g, " ")
          : "";
        all.set(id, { id, href: BASE + m[1], title });
        found++;
      }
    }
    // 翻页判断
    const nextRe = new RegExp(`href=["']https?:\\/\\/(?:www\\.)?jiemengwang\\.net\\/${slug}\\/${page + 1}["']`);
    if (!nextRe.test(cleaned) || found === 0) break;
  }
  return Array.from(all.values());
}

async function main() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  console.log(`[crawl] 目标：${BASE}`);

  const allEntries = [];
  for (const cat of CATEGORIES) {
    try {
      const list = await listCategoryEntries(cat.slug);
      for (const e of list) {
        allEntries.push({ ...e, slug: cat.slug, cat: cat.name });
      }
      console.log(`  · ${cat.name}（${cat.slug}）：${list.length} 条`);
    } catch (e) {
      console.warn(`  ! ${cat.name} 失败：${e.message}`);
    }
  }

  console.log(`[crawl] 共 ${allEntries.length} 条条目，开始拉取详情...`);

  const records = [];
  let done = 0;
  const batchSize = 6;
  for (let i = 0; i < allEntries.length; i += batchSize) {
    const batch = allEntries.slice(i, i + batchSize);
    const res = await pMap(batch, batchSize, async (item) => {
      try {
        const html = await safeFetch(item.href);
        const cleaned = stripScripts(html);
        const title = extractTitle(cleaned) || item.title;
        const content = extractContent(cleaned);
        if (!content || content.length < 30) return null;
        const cleanTitle = title
          .replace(/[_\-—]\s*周公解梦.*$/i, "")
          .replace(/\s*\?$/, "")
          .replace(/是什么意思\??[？?]?$/, "")
          .replace(/好不好\??[？?]?$/, "")
          .replace(/是什么预兆\??[？?]?$/, "")
          .trim() || item.title;
        return {
          id: `jw_${item.slug}_${item.id}`,
          title: cleanTitle,
          category: item.cat,
          summary: content.replace(/\s+/g, " ").slice(0, 80),
          content: `## ${cleanTitle}\n\n${content}`,
          tags: [cleanTitle.replace(/^梦见/, ""), item.cat],
          source: "crawl",
          sourceUrl: item.href,
          updatedAt: Date.now(),
        };
      } catch {
        return null;
      }
    });
    for (const r of res) if (r) records.push(r);
    done += batch.length;
    process.stdout.write(`\r  进度 ${done}/${allEntries.length}（已收录 ${records.length}）  `);
    await new Promise((r) => setTimeout(r, 80));
  }
  console.log();

  const out = {
    version: 1,
    source: BASE,
    crawledAt: new Date().toISOString(),
    count: records.length,
    entries: records,
  };

  const outPath = path.resolve("public/dream-zhougong.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out), "utf8");
  console.log(`[crawl] 已写入 ${outPath}（${records.length} 条，${(JSON.stringify(out).length / 1024).toFixed(1)} KB）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});