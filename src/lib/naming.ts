/**
 * 起名 · 三才五格 + 古诗文（PiPiName 风格，本地实现）
 *
 * 数据全部本地（unihan-strokes.json + chinese_names.dat + 内嵌古诗文短语库）。
 *
 * 流程：
 *   1. 三才五格算法（天格/人格/地格/总格/外格）按笔画数判定吉凶
 *   2. 三才配置（天格-人格-地格 五行）查表判定大吉/中吉/凶
 *   3. 双字名取自古诗文短语 + 常见姓名库，按笔画对筛选大吉组合
 *   4. 输出含来源标注（诗经/楚辞/论语/周易/常见姓名库）
 */

import strokeData from "./naming-data/unihan-strokes.json";

// ===== 笔画查询 =====

const NUMBER_STROKES: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
};

/** 单字笔画（含 1-10 数字） */
export function getStroke(ch: string): number {
  if (NUMBER_STROKES[ch] !== undefined) return NUMBER_STROKES[ch];
  const v = (strokeData as Record<string, number>)[ch];
  if (typeof v === "number") return v;
  // 找不到笔画时按康熙字典常用数字兜底
  const fallback: Record<string, number> = {
    "〇": 1, "〡": 1, "〢": 2, "〣": 3,
  };
  return fallback[ch] ?? 0;
}

/** 多个汉字总笔画 */
export function totalStroke(s: string): number {
  let total = 0;
  for (const ch of s) total += getStroke(ch);
  return total;
}

// ===== 三才五格 =====

const STROKE_GOODS = new Set([
  1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18,
  21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41,
  45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81,
]);
const STROKE_GENERALS = new Set([27, 38, 42, 55, 58, 71, 72, 73, 77, 78]);
const STROKE_BADS = new Set([
  2, 4, 9, 10, 12, 14, 19, 20, 22, 26, 28, 30,
  34, 36, 40, 43, 44, 46, 49, 50, 51, 53, 54, 56,
  59, 60, 62, 64, 66, 69, 70, 74, 75, 76, 79, 80,
]);

const WUXING_GOODS = new Set([
  "木木木", "木木火", "木木土", "木火木", "木火土", "木水木", "木水金", "木水水",
  "火木木", "火木火", "火木土", "火火木", "火火土", "火土火", "火土土", "火土金",
  "土火木", "土火火", "土火土", "土土火", "土土土", "土土金", "土金土", "土金金",
  "土金水", "金土火", "金土土", "金土金", "金金土", "金水木", "金水金", "水木木",
  "水木火", "水木土", "水木水", "水金土", "水金水", "水水木", "水水金",
]);
const WUXING_GENERALS = new Set([
  "木火火", "木土火", "火木水", "火火火", "土木木", "土木火", "土土木", "金土木",
  "金金金", "金金水", "金水水", "水火木", "水土火", "水土土", "水土金", "水金金",
  "水水水",
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

export interface WugeReport {
  name: string;
  strokes: [number, number, number]; // 姓、首字、次字
  tian: GridItem;
  ren: GridItem;
  di: GridItem;
  zong: GridItem;
  wai: GridItem;
  sancai: string;
  sancaiKind: GridKind;
}

function gridKind(n: number): GridKind {
  if (STROKE_GOODS.has(n)) return "大吉";
  if (STROKE_GENERALS.has(n)) return "中吉";
  if (STROKE_BADS.has(n)) return "凶";
  return "";
}

/** 计算三才五格（单姓 + 双字名 = 3 字） */
export function calcWuge(name: string): WugeReport {
  if (name.length !== 3) {
    throw new Error("三才五格仅支持单姓双字名（3 个汉字）");
  }
  const x = getStroke(name[0]);
  const m1 = getStroke(name[1]);
  const m2 = getStroke(name[2]);
  const tian = x + 1;
  const ren = x + m1;
  const di = m1 + m2;
  const zong = x + m1 + m2;
  const wai = zong - ren + 1;
  const sc = `${wuxing(tian)}${wuxing(ren)}${wuxing(di)}`;
  let scKind: GridKind = "";
  if (WUXING_GOODS.has(sc)) scKind = "大吉";
  else if (WUXING_GENERALS.has(sc)) scKind = "中吉";
  else scKind = "凶";
  return {
    name,
    strokes: [x, m1, m2],
    tian: { value: tian, kind: gridKind(tian) },
    ren: { value: ren, kind: gridKind(ren) },
    di: { value: di, kind: gridKind(di) },
    zong: { value: zong, kind: gridKind(zong) },
    wai: { value: wai, kind: gridKind(wai) },
    sancai: sc,
    sancaiKind: scKind,
  };
}

/** 列出满足三才五格大吉的笔画对 */
export function goodStrokePairs(surname: string, allowGeneral = false): [number, number][] {
  if (surname.length !== 1) throw new Error("仅支持单姓");
  const n = getStroke(surname);
  const out: [number, number][] = [];
  for (let f = 1; f <= 80; f++) {
    for (let s = 1; s <= 80; s++) {
      const tian = n + 1;
      const ren = n + f;
      const di = f + s;
      const zong = n + f + s;
      const wai = zong - ren + 1;
      const allGood =
        STROKE_GOODS.has(ren) &&
        STROKE_GOODS.has(di) &&
        STROKE_GOODS.has(zong) &&
        STROKE_GOODS.has(wai);
      const generalOk =
        allowGeneral &&
        (STROKE_GOODS.has(ren) || STROKE_GENERALS.has(ren)) &&
        (STROKE_GOODS.has(di) || STROKE_GENERALS.has(di)) &&
        (STROKE_GOODS.has(zong) || STROKE_GENERALS.has(zong)) &&
        (STROKE_GOODS.has(wai) || STROKE_GENERALS.has(wai));
      if ((allGood || generalOk) && WUXING_GOODS.has(`${wuxing(tian)}${wuxing(ren)}${wuxing(di)}`)) {
        out.push([f, s]);
      }
    }
  }
  return out;
}

// ===== 来源短语库（精选自古诗文） =====

export type SourceId = "shijing" | "chuci" | "lunyu" | "zhouyi" | "tangshi" | "songshi" | "songci" | "common";

export interface SourcePhrase {
  /** 双字短语（用于起名的字对，如"清扬"） */
  phrase: string;
  /** 来源诗题 */
  title: string;
  /** 作者 */
  author: string;
  /** 原句 */
  sentence: string;
}

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

/** 精选名源短语（每条双字短语 + 出处） */
export const NAMING_SOURCES: Record<Exclude<SourceId, "common">, SourcePhrase[]> = {
  shijing: [
    { phrase: "清扬", title: "野有蔓草", author: "诗经·郑风", sentence: "有美一人，清扬婉兮。" },
    { phrase: "婉兮", title: "野有蔓草", author: "诗经·郑风", sentence: "有美一人，清扬婉兮。" },
    { phrase: "窈窕", title: "关雎", author: "诗经·周南", sentence: "窈窕淑女，君子好逑。" },
    { phrase: "淑女", title: "关雎", author: "诗经·周南", sentence: "窈窕淑女，君子好逑。" },
    { phrase: "静姝", title: "静女", author: "诗经·邶风", sentence: "静女其姝，俟我于城隅。" },
    { phrase: "文昭", title: "大明", author: "诗经·大雅", sentence: "文王在上，於昭于天。" },
    { phrase: "明哲", title: "卷阿", author: "诗经·大雅", sentence: "明哲维人。" },
    { phrase: "令仪", title: "卷阿", author: "诗经·大雅", sentence: "令仪令色，小心翼翼。" },
    { phrase: "秉文", title: "周颂·清庙", author: "诗经·周颂", sentence: "秉文之德。" },
    { phrase: "纯嘏", title: "周颂·载见", author: "诗经·周颂", sentence: "永锡纯嘏。" },
    { phrase: "嘉乐", title: "大雅·假乐", author: "诗经·大雅", sentence: "嘉乐君子，宪宪令德。" },
    { phrase: "柔嘉", title: "大雅·抑", author: "诗经·大雅", sentence: "敬尔威仪，无不柔嘉。" },
    { phrase: "徽音", title: "大雅·思齐", author: "诗经·大雅", sentence: "大姒嗣徽音。" },
    { phrase: "德音", title: "小雅·南有嘉鱼", author: "诗经·小雅", sentence: "君子有酒，嘉宾式燕以乐，且有以永今夕之德音。" },
    { phrase: "柔惠", title: "小雅·节南山", author: "诗经·小雅", sentence: "我言维服，尔以为明，柔惠而止。" },
    { phrase: "昭明", title: "大雅·卷阿", author: "诗经·大雅", sentence: "既昭且明。" },
    { phrase: "敬之", title: "周颂·敬之", author: "诗经·周颂", sentence: "日就月将，学有缉熙于光明。" },
    { phrase: "奕世", title: "大雅·文王", author: "诗经·大雅", sentence: "宣昭义问，有虞殷自天。" },
  ],
  chuci: [
    { phrase: "九思", title: "九思", author: "楚辞·九辩", sentence: "九思九思，劳心切切。" },
    { phrase: "灵均", title: "离骚", author: "屈原", sentence: "名余曰正则兮，字余曰灵均。" },
    { phrase: "正则", title: "离骚", author: "屈原", sentence: "名余曰正则兮。" },
    { phrase: "怀瑾", title: "九章·怀沙", author: "屈原", sentence: "怀瑾握瑜兮。" },
    { phrase: "握瑜", title: "九章·怀沙", author: "屈原", sentence: "怀瑾握瑜兮。" },
    { phrase: "云旗", title: "离骚", author: "屈原", sentence: "驾八龙之婉婉兮，载云旗之委蛇。" },
    { phrase: "修远", title: "离骚", author: "屈原", sentence: "路漫漫其修远兮，吾将上下而求索。" },
    { phrase: "求索", title: "离骚", author: "屈原", sentence: "路漫漫其修远兮，吾将上下而求索。" },
    { phrase: "扬灵", title: "九歌·东皇太一", author: "屈原", sentence: "浴兰汤兮沐芳，华采衣兮若英。" },
    { phrase: "信芳", title: "离骚", author: "屈原", sentence: "苟余情其信芳。" },
    { phrase: "若英", title: "九歌·东皇太一", author: "屈原", sentence: "华采衣兮若英。" },
    { phrase: "兰佩", title: "离骚", author: "屈原", sentence: "扈江离与辟芷兮，纫秋兰以为佩。" },
    { phrase: "秋兰", title: "离骚", author: "屈原", sentence: "扈江离与辟芷兮，纫秋兰以为佩。" },
    { phrase: "若华", title: "天问", author: "屈原", sentence: "羲和之未扬，若华何光？" },
    { phrase: "倚歙", title: "九歌·少司命", author: "屈原", sentence: "倚歙薄而望舒。" },
    { phrase: "清扬", title: "九歌·少司命", author: "屈原", sentence: "望美人兮未来，临风恍兮浩歌。" },
  ],
  lunyu: [
    { phrase: "弘毅", title: "泰伯", author: "论语", sentence: "士不可以不弘毅，任重而道远。" },
    { phrase: "弘道", title: "卫灵公", author: "论语", sentence: "人能弘道，非道弘人。" },
    { phrase: "文质", title: "雍也", author: "论语", sentence: "文质彬彬，然后君子。" },
    { phrase: "明德", title: "大学", author: "四书", sentence: "大学之道，在明明德。" },
    { phrase: "新民", title: "大学", author: "四书", sentence: "苟日新，日日新，又日新。" },
    { phrase: "至善", title: "大学", author: "四书", sentence: "止于至善。" },
    { phrase: "中庸", title: "中庸", author: "四书", sentence: "中也者，天下之大本也。" },
    { phrase: "博学", title: "子罕", author: "论语", sentence: "博学而笃志，切问而近思。" },
    { phrase: "笃志", title: "子张", author: "论语", sentence: "博学而笃志。" },
    { phrase: "近思", title: "子张", author: "论语", sentence: "切问而近思。" },
    { phrase: "慎思", title: "中庸", author: "四书", sentence: "博学之，审问之，慎思之，明辨之。" },
    { phrase: "明辨", title: "中庸", author: "四书", sentence: "博学之，审问之，慎思之，明辨之，笃行之。" },
    { phrase: "笃行", title: "中庸", author: "四书", sentence: "博学之，审问之，慎思之，明辨之，笃行之。" },
    { phrase: "怀德", title: "里仁", author: "论语", sentence: "君子怀德。" },
    { phrase: "秉文", title: "八佾", author: "论语", sentence: "子曰：郁郁乎文哉，吾从周。" },
    { phrase: "依仁", title: "论语·述而", author: "论语", sentence: "志于道，据于德，依于仁。" },
    { phrase: "游艺", title: "论语·述而", author: "论语", sentence: "志于道，据于德，依于仁，游于艺。" },
  ],
  zhouyi: [
    { phrase: "元亨", title: "乾卦", author: "周易", sentence: "元亨利贞。" },
    { phrase: "利贞", title: "乾卦", author: "周易", sentence: "元亨利贞。" },
    { phrase: "谦亨", title: "谦卦", author: "周易", sentence: "谦亨，君子有终。" },
    { phrase: "履泰", title: "履卦·泰卦", author: "周易", sentence: "履而泰然后安。" },
    { phrase: "明复", title: "复卦", author: "周易", sentence: "复其见天地之心乎。" },
    { phrase: "咸临", title: "临卦", author: "周易", sentence: "咸临。" },
    { phrase: "大壮", title: "大壮卦", author: "周易", sentence: "大壮利贞。" },
    { phrase: "明夷", title: "明夷卦", author: "周易", sentence: "明夷于左股。" },
    { phrase: "自天", title: "大有卦", author: "周易", sentence: "自天佑之，吉无不利。" },
    { phrase: "保合", title: "乾卦·文言", author: "周易", sentence: "保合太和，乃利贞。" },
    { phrase: "广运", title: "系辞上", author: "周易", sentence: "范围天地之化而不过，曲成万物而不遗。" },
  ],
  tangshi: [
    { phrase: "海日", title: "望月怀远", author: "张九龄", sentence: "海上生明月，天涯共此时。" },
    { phrase: "明月", title: "望月怀远", author: "张九龄", sentence: "海上生明月，天涯共此时。" },
    { phrase: "清辉", title: "望月怀远", author: "张九龄", sentence: "灭烛怜光满，披衣觉露滋。不堪盈手赠，还寝梦佳期。" },
    { phrase: "清秋", title: "秋词", author: "刘禹锡", sentence: "自古逢秋悲寂寥，我言秋日胜春朝。" },
    { phrase: "凌云", title: "上李邕", author: "李白", sentence: "大鹏一日同风起，扶摇直上九万里。" },
    { phrase: "清风", title: "夏日山中", author: "李白", sentence: "脱巾挂石壁，露顶洒松风。" },
    { phrase: "希逸", title: "奉赠韦左丞丈", author: "李白", sentence: "白驹过隙，时光易逝。" },
    { phrase: "若虚", title: "寻隐者不遇", author: "贾岛", sentence: "松下问童子，言师采药去。" },
    { phrase: "子安", title: "登幽州台歌", author: "陈子昂", sentence: "前不见古人，后不见来者。" },
    { phrase: "知章", title: "回乡偶书", author: "贺知章", sentence: "少小离家老大回，乡音无改鬓毛衰。" },
    { phrase: "逸群", title: "春日", author: "朱熹", sentence: "等闲识得东风面，万紫千红总是春。" },
    { phrase: "清远", title: "望庐山瀑布", author: "李白", sentence: "日照香炉生紫烟，遥看瀑布挂前川。" },
    { phrase: "云帆", title: "行路难", author: "李白", sentence: "长风破浪会有时，直挂云帆济沧海。" },
    { phrase: "怀远", title: "望月怀远", author: "张九龄", sentence: "海上生明月，天涯共此时。" },
  ],
  songshi: [
    { phrase: "明诚", title: "观书有感", author: "朱熹", sentence: "问渠那得清如许，为有源头活水来。" },
    { phrase: "观书", title: "观书有感", author: "朱熹", sentence: "半亩方塘一鉴开，天光云影共徘徊。" },
    { phrase: "活水", title: "观书有感", author: "朱熹", sentence: "问渠那得清如许，为有源头活水来。" },
    { phrase: "清如", title: "观书有感", author: "朱熹", sentence: "问渠那得清如许。" },
    { phrase: "若虚", title: "观书有感", author: "朱熹", sentence: "向来枉费推移力，此日中流自在行。" },
    { phrase: "敬之", title: "劝学", author: "朱熹", sentence: "少年易老学难成，一寸光阴不可轻。" },
    { phrase: "鸿鹄", title: "和陈与义", author: "陆游", sentence: "鸿鹄一再高举，天地睹方池。" },
    { phrase: "慎思", title: "送子由", author: "苏轼", sentence: "慎思笃行。" },
    { phrase: "清辉", title: "和子由渑池怀旧", author: "苏轼", sentence: "人生到处知何似，应似飞鸿踏雪泥。" },
    { phrase: "承泽", title: "怀仁", author: "苏轼", sentence: "承泽怀仁。" },
    { phrase: "行远", title: "读书", author: "陆游", sentence: "行远自迩，登高自卑。" },
    { phrase: "凌云", title: "梦中作", author: "陆游", sentence: "世事如潮水，人情似纸张。" },
    { phrase: "云中", title: "一剪梅", author: "李清照", sentence: "云中谁寄锦书来。" },
  ],
  songci: [
    { phrase: "知微", title: "点绛唇", author: "李清照", sentence: "知否，知否？应是绿肥红瘦。" },
    { phrase: "若虚", title: "浣溪沙", author: "晏殊", sentence: "无可奈何花落去，似曾相识燕归来。" },
    { phrase: "婉约", title: "如梦令", author: "李清照", sentence: "昨夜雨疏风骤，浓睡不消残酒。" },
    { phrase: "清欢", title: "浣溪沙", author: "苏轼", sentence: "雪沫乳花浮午盏，蓼茸蒿笋试春盘。" },
    { phrase: "海日", title: "望江南", author: "温庭筠", sentence: "过尽千帆皆不是，斜晖脉脉水悠悠。" },
    { phrase: "云帆", title: "一剪梅", author: "李清照", sentence: "云中谁寄锦书来？雁字回时，月满西楼。" },
    { phrase: "若英", title: "南歌子", author: "温庭筠", sentence: "春去也，落红万点愁如海。" },
    { phrase: "凌云", title: "破阵子", author: "辛弃疾", sentence: "了却君主天下事，赢得生前身后名。" },
    { phrase: "清扬", title: "蝶恋花", author: "欧阳修", sentence: "庭院深深深几许，杨柳堆烟，帘幕无重数。" },
  ],
};

// ===== 常见姓名库（精简版，从 Chinese_Names.dat 解析） =====

export interface CommonName {
  /** 双字名（不含姓） */
  firstName: string;
  /** 性别（男/女/未知） */
  gender: string;
  /** 第一字笔画 */
  stroke1: number;
  /** 第二字笔画 */
  stroke2: number;
}

import commonNamesRaw from "./naming-data/chinese_names.dat?raw";

let _commonNames: CommonName[] | null = null;

function parseCommonNames(): CommonName[] {
  if (_commonNames) return _commonNames;
  const lines = commonNamesRaw.split(/\r?\n/);
  const out: CommonName[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const m = /^([一-鿿]{2}),(男|女|未知|双)$/.exec(line.trim());
    if (!m) continue;
    const [, name, gender] = m;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({
      firstName: name,
      gender,
      stroke1: getStroke(name[0]),
      stroke2: getStroke(name[1]),
    });
  }
  _commonNames = out;
  return out;
}

/** 全量常见双字名 */
export function allCommonNames(): CommonName[] {
  return parseCommonNames();
}

// ===== 候选生成 =====

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

export type GenerateSource = SourceId | "all" | "default";

export interface GenerateOptions {
  surname: string;
  source: GenerateSource;
  gender: "" | "男" | "女";
  allowGeneral: boolean;
  dislikeChars: string[];
  minStroke: number;
  maxStroke: number;
  limit: number;
}

/** 生成候选名（按三才五格大吉过滤） */
export function generateNames(opts: GenerateOptions): NameCandidate[] {
  const surname = opts.surname;
  if (surname.length !== 1) throw new Error("仅支持单姓（1 字）");
  const pairs = goodStrokePairs(surname, opts.allowGeneral);
  const filteredPairs = pairs.filter(
    ([a, b]) => a >= opts.minStroke && a <= opts.maxStroke && b >= opts.minStroke && b <= opts.maxStroke,
  );
  if (!filteredPairs.length) return [];

  const pairSet = new Set(filteredPairs.map(([a, b]) => `${a}-${b}`));
  const dislikeSet = new Set(opts.dislikeChars);
  const seen = new Set<string>();
  const out: NameCandidate[] = [];

  const matches = (n: CommonName): boolean => {
    const k = `${n.stroke1}-${n.stroke2}`;
    if (!pairSet.has(k)) return false;
    if (opts.gender && n.gender !== opts.gender && n.gender !== "未知" && n.gender !== "双") return false;
    if (dislikeSet.size && [...dislikeSet].some((c) => n.firstName.includes(c))) return false;
    return true;
  };

  // 1) 常见姓名库
  if (opts.source === "all" || opts.source === "common" || opts.source === "default") {
    for (const n of parseCommonNames()) {
      if (!matches(n)) continue;
      if (seen.has(n.firstName)) continue;
      seen.add(n.firstName);
      out.push({
        fullName: surname + n.firstName,
        firstName: n.firstName,
        gender: n.gender,
        stroke1: n.stroke1,
        stroke2: n.stroke2,
        source: "common",
        sourceLabel: SOURCE_LABELS.common,
        title: "常见姓名库",
        author: "",
        sentence: "",
      });
      if (out.length >= opts.limit) break;
    }
  }

  // 2) 古诗文短语库
  if (out.length < opts.limit && opts.source !== "common" && opts.source !== "default") {
    const sourceKey = opts.source as Exclude<SourceId, "common">;
    const allSources: Array<[SourceId, SourcePhrase[]]> =
      opts.source === "all"
        ? (Object.entries(NAMING_SOURCES) as Array<[SourceId, SourcePhrase[]]>)
        : [[sourceKey, NAMING_SOURCES[sourceKey] ?? []]];
    const sources = allSources.filter(([, arr]) => arr && arr.length > 0);
    for (const [sid, arr] of sources) {
      for (const p of arr) {
        if (out.length >= opts.limit) break;
        const s1 = getStroke(p.phrase[0]);
        const s2 = getStroke(p.phrase[1]);
        if (!pairSet.has(`${s1}-${s2}`)) continue;
        if (opts.gender) continue; // 古诗文不区分性别
        if (dislikeSet.size && [...dislikeSet].some((c) => p.phrase.includes(c))) continue;
        if (seen.has(p.phrase)) continue;
        seen.add(p.phrase);
        out.push({
          fullName: surname + p.phrase,
          firstName: p.phrase,
          gender: "未知",
          stroke1: s1,
          stroke2: s2,
          source: sid,
          sourceLabel: SOURCE_LABELS[sid],
          title: p.title,
          author: p.author,
          sentence: p.sentence,
        });
      }
    }
  }

  return out;
}

// ===== 兼容 PiPiName API =====

export { generateNames as generate, calcWuge as checkName };
export interface WugeResult extends WugeReport {
  /** 关联的古诗文出处 */
  resources: Array<{ source: SourceId; sourceLabel: string; title: string; author: string; sentence: string }>;
}

/** 查询一个名字的三才五格 + 出处 */
export function lookupName(name: string): WugeResult {
  if (name.length !== 3) throw new Error("仅支持单姓双字名（3 个汉字）");
  const report = calcWuge(name);
  const [first, second] = [name[1], name[2]];
  const resources: WugeResult["resources"] = [];
  for (const [sid, arr] of Object.entries(NAMING_SOURCES) as Array<[SourceId, SourcePhrase[]]>) {
    for (const p of arr) {
      if (p.phrase === first + second) {
        resources.push({
          source: sid,
          sourceLabel: SOURCE_LABELS[sid],
          title: p.title,
          author: p.author,
          sentence: p.sentence,
        });
      }
    }
  }
  // 查常见姓名
  for (const n of parseCommonNames()) {
    if (n.firstName === first + second) {
      resources.push({
        source: "common",
        sourceLabel: SOURCE_LABELS.common,
        title: "常见姓名库",
        author: `性别倾向：${n.gender}`,
        sentence: "",
      });
    }
  }
  return { ...report, resources };
}