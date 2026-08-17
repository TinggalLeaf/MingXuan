#!/usr/bin/env node
/**
 * 构建起名系统用「短语 → 出处」索引
 *
 * 数据源：public/naming-data/{诗经,楚辞,论语,周易,唐诗,宋诗,宋词}
 *
 * 流程：对每首诗的每行，提取所有 2 字 CJK 子串，合并重复，
 *       每个 2 字短语只保留一条代表性出处（优先级：诗经 > 楚辞 > 论语 > 周易 > 唐诗 > 宋诗 > 宋词）。
 *
 * 输出：public/naming-data/phrases-index.json
 *       格式：[ {phrase, source, title, author, sentence} ]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../public/naming-data");
const OUT = path.join(DATA, "phrases-index.json");

const SOURCE_FILE = {
  shijing: "诗经.json",
  chuci: "楚辞.txt",
  lunyu: "论语.json",
  zhouyi: "周易.txt",
  tangshi: "唐诗",  // dir
  songshi: "宋诗",  // dir
  songci: "宋词",    // dir
};
const SOURCE_PRI = { shijing: 0, chuci: 1, lunyu: 2, zhouyi: 3, tangshi: 4, songshi: 5, songci: 6 };

const CJK_RE = /[㐀-鿿]/;

/** 停用字（极常用、信息量低、且不适合做名字字） */
const STOP_CHARS = new Set([
  "的","了","是","我","你","也","有","之","乎","于","而","但","而","且","所","以","因","为","的",
  "在","有","无","为","与","及","或","等","上","下","不","没","来","去","到","从","向",
  "和","而","但","若","则","虽","虽","便","就","则","即","皆","必","未","不","莫","无",
  "可","能","会","要","得","使","让","叫","称","为","之","乎","者","也","焉","哉","耳",
  "其","此","彼","是","此","其","之","夫","盖","凡","诸","众","各","某","每","尽","多","少","众",
  "日","月","年","时","刻","分","秒","天","地","人","事","物","理","道","理","义","礼","法","术",
  "之","以","于","在","而","则","者","乎","矣","焉","哉","也","耳","夫","盖","凡","且","尚","犹",
  "自","至","若","虽","故","是","此","彼","其","之","乎","者","也","焉","哉","耳","夫",
  "上","下","中","内","外","前","后","左","右","旁","侧","间","中","内","外",
  "大","小","多","少","高","低","长","短","深","浅","远","近","重","轻","厚","薄",
  "好","坏","对","错","新","旧","快","慢","早","晚","明","暗","清","浊","软","硬",
  "男","女","老","少","父","母","兄","弟","姐","妹","子","孙","夫","妻","儿","女",
  "去","来","在","于","至","自","从","向","到","给","把","被","让","用","作","做",
  "这","那","哪","些","么","吧","呢","啊","哦","嗯","呀","嗯","哈","嘿","呜","唉",
  "三","四","五","六","七","八","九","十","百","千","万","亿","半","一","二","两",
  "今","昨","明","日","时","刻","春","夏","秋","冬","朝","暮","旦","夕",
]);

function isValidPhrase(ph) {
  if (ph.length !== 2) return false;
  if (!CJK_RE.test(ph[0]) || !CJK_RE.test(ph[1])) return false;
  if (STOP_CHARS.has(ph[0]) || STOP_CHARS.has(ph[1])) return false;
  // 排除完全是数字、纯方位词
  return true;
}

/** 从字符串中提取所有 2 字 CJK 短语 */
function extractPhrases(s) {
  const out = new Set();
  for (let i = 0; i + 2 <= s.length; i++) {
    const a = s[i], b = s[i + 1];
    if (CJK_RE.test(a) && CJK_RE.test(b)) {
      const ph = a + b;
      if (isValidPhrase(ph)) out.add(ph);
    }
  }
  return out;
}

function loadShijing() {
  const arr = JSON.parse(fs.readFileSync(path.join(DATA, "诗经.json"), "utf8"));
  const out = [];
  for (const p of arr) {
    if (!p.content) continue;
    for (const line of p.content) {
      out.push({
        source: "shijing",
        title: `${p.section} · ${p.title}`,
        author: "诗经",
        sentence: line,
      });
    }
  }
  return out;
}

function loadLunyu() {
  const arr = JSON.parse(fs.readFileSync(path.join(DATA, "论语.json"), "utf8"));
  const out = [];
  for (const ch of arr) {
    if (!ch.paragraphs) continue;
    for (const line of ch.paragraphs) {
      out.push({
        source: "lunyu",
        title: ch.chapter || "论语",
        author: "孔子",
        sentence: line,
      });
    }
  }
  return out;
}

function loadChuci() {
  const text = fs.readFileSync(path.join(DATA, "楚辞.txt"), "utf8");
  // 楚辞按段落（空行分）
  const blocks = text.split(/\n\s*\n/);
  const out = [];
  let cur = { title: "楚辞", author: "屈原等", sentences: [] };
  for (const blk of blocks) {
    const lines = blk.split("\n").map((s) => s.trim()).filter(Boolean);
    for (const l of lines) {
      // 标题行：一、xxx  或 xxx（章节名）
      if (/^[一二三四五六七八九十]+、/.test(l) || /^[一二三四五六七八九十]+$/.test(l)) {
        if (cur.sentences.length) {
          out.push({
            source: "chuci",
            title: cur.title,
            author: cur.author,
            sentences: cur.sentences,
          });
        }
        cur = { title: l.replace(/^[一二三四五六七八九十]+[、\.]?\s*/, "").trim(), author: "屈原等", sentences: [] };
      } else {
        cur.sentences.push(l);
      }
    }
  }
  if (cur.sentences.length) out.push({ source: "chuci", title: cur.title, author: cur.author, sentences: cur.sentences });
  // 转成 sentence-level
  return out.flatMap((g) => g.sentences.map((s) => ({ source: "chuci", title: g.title, author: g.author, sentence: s })));
}

function loadZhouyi() {
  const text = fs.readFileSync(path.join(DATA, "周易.txt"), "utf8");
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  // 段落以"X、X、卦"作为章节名
  const out = [];
  let cur = { title: "周易", author: "文王、周公", sentence: "" };
  for (const l of lines) {
    if (/^(彖|象|文言|说卦|序卦|杂卦|系辞|卦辞)/.test(l) || /^["“]/.test(l)) {
      // 章节起始
      if (cur.sentence) {
        out.push({ source: "zhouyi", title: cur.title, author: cur.author, sentence: cur.sentence });
      }
      cur = { title: l, author: "文王、周公", sentence: "" };
    } else {
      cur.sentence += (cur.sentence ? "；" : "") + l;
    }
  }
  if (cur.sentence) out.push({ source: "zhouyi", title: cur.title, author: cur.author, sentence: cur.sentence });
  return out;
}

function loadTangshi() {
  return loadPoetryDir("唐诗", "tangshi");
}

function loadSongshi() {
  return loadPoetryDir("宋诗", "songshi");
}

function loadSongci() {
  return loadPoetryDir("宋词", "songci");
}

function loadPoetryDir(dir, src) {
  const dirPath = path.join(DATA, dir);
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json") && f.startsWith("poet.") || f.startsWith("ci."));
  const out = [];
  for (const f of files) {
    try {
      const arr = JSON.parse(fs.readFileSync(path.join(dirPath, f), "utf8"));
      if (!Array.isArray(arr)) continue;
      for (const p of arr) {
        if (!p.paragraphs || !Array.isArray(p.paragraphs)) continue;
        for (const line of p.paragraphs) {
          out.push({
            source: src,
            title: p.title || "",
            author: p.author || "",
            sentence: line,
          });
        }
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  return out;
}

async function main() {
  console.log("[index] 加载各源数据…");
  const sources = {
    shijing: loadShijing(),
    lunyu: loadLunyu(),
    chuci: loadChuci(),
    zhouyi: loadZhouyi(),
    tangshi: loadTangshi(),
    songshi: loadSongshi(),
    songci: loadSongci(),
  };
  let total = 0;
  for (const [k, v] of Object.entries(sources)) {
    console.log(`  · ${k}: ${v.length} 句`);
    total += v.length;
  }
  console.log(`  total sentences: ${total}`);

  // 建立 phrase → 出处（高优先级优先）
  console.log("\n[index] 提取 2 字短语…");
  const phraseMap = new Map(); // phrase -> entry
  for (const [src, sentences] of Object.entries(sources)) {
    for (const s of sentences) {
      const phrases = extractPhrases(s.sentence);
      for (const ph of phrases) {
        const exist = phraseMap.get(ph);
        // 优先级：诗经 > 楚辞 > 论语 > 周易 > 唐诗 > 宋诗 > 宋词
        if (!exist || SOURCE_PRI[src] < SOURCE_PRI[exist.source]) {
          phraseMap.set(ph, {
            phrase: ph,
            source: src,
            title: s.title,
            author: s.author,
            sentence: s.sentence,
          });
        }
      }
    }
    console.log(`  · ${src}: 当前 ${phraseMap.size} 短语`);
  }
  console.log(`  total unique phrases: ${phraseMap.size}`);

  // 输出：紧凑格式 [phrase, source, title, author]
  //      完整原句按需从原始 JSON 加载（lazy）
  const out = Array.from(phraseMap.values());
  out.sort((a, b) => {
    if (a.source !== b.source) return SOURCE_PRI[a.source] - SOURCE_PRI[b.source];
    return a.phrase.localeCompare(b.phrase, "zh");
  });
  // 紧凑为 4 元组（去掉完整原句，节省 ~50% 体积）
  const compact = out.map((e) => [e.phrase, e.source, e.title, e.author]);
  fs.writeFileSync(OUT, JSON.stringify(compact));
  console.log(`\n[done] 写入 ${OUT}（${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});