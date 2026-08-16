/**
 * 明玄 · 黄历宜忌查询（完整版）
 *
 * 实时拉取 huangli123.net/huangli/yyyy-mm-dd.html 的全字段数据，
 * 经 Rust 后端代理（避免 CORS），结构化后展示。
 *
 * 同时叠加 tyme4ts 本地计算（神煞/十二时辰/吉凶）做兜底。
 */

import { useEffect, useMemo, useState } from "react";
import { SolarDay } from "tyme4ts";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { openPrintWindow } from "@/lib/pdf";
import { filterByCategory, type HuangliDay, type HuangliHour } from "@/lib/huangli";

const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "婚嫁", label: "婚嫁" },
  { id: "出行", label: "出行" },
  { id: "修造", label: "修造" },
  { id: "祭祀", label: "祭祀" },
  { id: "开业", label: "开业" },
  { id: "学业", label: "学业" },
  { id: "农事", label: "农事" },
  { id: "医疗", label: "医疗" },
  { id: "日常", label: "日常" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function shift(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

const ELEMENT_COLOR: Record<string, string> = {
  木: "text-[color:var(--color-wuxing-mu)]",
  火: "text-[color:var(--color-wuxing-huo)]",
  土: "text-[color:var(--color-wuxing-tu)]",
  金: "text-[color:var(--color-wuxing-jin)]",
  水: "text-[color:var(--color-wuxing-shui)]",
};

// 时辰顺序常量（备用）

/** 调用 Rust 后端拉取 huangli123.net 全字段 */
async function fetchHuangliFull(date: string): Promise<Partial<HuangliDay> | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const r = await invoke<any>("huangli_lookup", { date });
    if (!r) return null;
    return r as Partial<HuangliDay>;
  } catch {
    return null;
  }
}

/** tyme4ts 计算的核心字段（兜底） */
function computeBase(date: Date) {
  const sd = SolarDay.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lunar = sd.getLunarDay();
  const cycleDay = sd.getSixtyCycleDay();
  const term = sd.getTerm();
  const phase = sd.getPhase();
  const week = sd.getWeek();
  const festival = sd.getFestival();
  const legalHoliday = sd.getLegalHoliday();
  const nineStar = sd.getNineStar();
  const fetal = cycleDay.getFetusDay();
  const gods = cycleDay.getGods();
  const recommends = cycleDay.getRecommends();
  const avoids = cycleDay.getAvoids();
  const duty = cycleDay.getDuty();
  const hours = cycleDay.getHours();
  return {
    solarName: sd.getName(),
    week: week.getName(),
    lunarMonthInChinese: lunar.getLunarMonth().getName(),
    lunarDayInChinese: lunar.getName(),
    ganzhiYear: lunar.getYearSixtyCycle().getName(),
    ganzhiMonth: lunar.getMonthSixtyCycle().getName(),
    ganzhiDay: cycleDay.getSixtyCycle().getName(),
    zodiac: lunar.getYearSixtyCycle().getName().slice(1, 2),
    wuxingDay: cycleDay.getSixtyCycle().getSound().getName() + "五行",
    solarTerm: term.getName(),
    phaseName: phase.getName(),
    festivalName: festival ? festival.getName() : null,
    legalName: legalHoliday ? legalHoliday.getName() : null,
    dayOfficer: duty.getName(),
    twelveStar: cycleDay.getTwelveStar().getName(),
    nineStarName: nineStar.getName(),
    nineStarElement: nineStar.getElement().getName(),
    fetalName: fetal.getName(),
    godNames: gods.map((g: any) => `${g.getName()}(${g.getLuck().getName()})`),
    recommendNames: recommends.map((t: any) => t.getName()),
    avoidNames: avoids.map((t: any) => t.getName()),
    hours: hours.map((h: any) => ({
      shichen: h.getSixtyCycle().getName(),
      timeRange: "",
      ganzhi: "",
      starGod: h.getTwelveStar().getName(),
      chong: "",
      fortune: "" as "吉" | "凶" | "",
      zodiac: "",
      luckyGods: [],
      evilGods: [],
      yi: h.getRecommends().map((t: any) => t.getName()),
      ji: h.getAvoids().map((t: any) => t.getName()),
      wuxing: "",
      shaDirection: "",
      caiShen: "",
      xiShen: "",
      wuxingPct: [],
    } as unknown as HuangliHour)),
  };
}

/** 合并远端数据 + 本地计算结果 */
function mergeData(date: Date, remote: Partial<HuangliDay> | null): HuangliDay {
  const base = computeBase(date);
  const r: any = remote ?? {};
  return {
    date: formatDate(date),
    lunar: r.lunar || `${base.lunarMonthInChinese}月${base.lunarDayInChinese}`,
    ganzhiYear: r.ganzhiYear || base.ganzhiYear,
    ganzhiMonth: r.ganzhiMonth || base.ganzhiMonth,
    ganzhiDay: r.ganzhiDay || base.ganzhiDay,
    zodiac: r.zodiac || base.zodiac,
    constellation: r.constellation || "",
    wuxingYear: r.wuxingYear || "",
    wuxingMonth: r.wuxingMonth || "",
    wuxingDay: r.wuxingDay || base.wuxingDay,
    wuxingNumeric: r.wuxingNumeric || "",
    solarTerm: r.solarTerm || { name: base.solarTerm, date: "" },
    nextSolarTerm: r.nextSolarTerm,
    dutyGod: r.dutyGod || base.dayOfficer,
    twelveStar: r.twelveStar || base.twelveStar,
    liuYao: r.liuYao || "",
    riLu: r.riLu || "",
    solarFull: r.solarFull || base.solarName,
    lunarFull: r.lunarFull || "",
    pillars: r.pillars || `${base.ganzhiYear}年 ${base.ganzhiMonth} ${base.ganzhiDay}日`,
    lunarYearDays: r.lunarYearDays || { year: "", total: 0, range: "", passed: 0, remaining: 0 },
    monthState: r.monthState || { monthOrder: "", phenology: "", phase: base.phaseName },
    yi: r.yi || base.recommendNames,
    ji: r.ji || base.avoidNames,
    caiShen: r.caiShen || "",
    xiShen: r.xiShen || "",
    fuShen: r.fuShen || "",
    guiShen: r.guiShen || { yang: "", yin: "" },
    taiShen: r.taiShen || { month: "", day: base.fetalName, direction: "" },
    chong: r.chong || "",
    luckyGods: r.luckyGods || base.godNames,
    evilGods: r.evilGods || [],
    pengzu: r.pengzu || [],
    daLianLuckyHours: r.daLianLuckyHours || [],
    kongWang: r.kongWang || { year: "", month: "", day: "" },
    nineStar: r.nineStar || { name: base.nineStarName, description: "", poem: "" },
    starSign: r.starSign || "",
    riHu: r.riHu || "",
    chongHe: r.chongHe || [],
    sanSha: r.sanSha || { year: "", month: "", day: "" },
    qiSha: r.qiSha || { year: "", month: "", day: "" },
    suiSha: r.suiSha || { year: "", month: "" },
    luoshu: r.luoshu || { name: "", poem: "", front: "", back: "", interpretation: "" },
    gua: r.gua || { name: "", symbol: "", structure: "", description: "" },
    hours: (r.hours && r.hours.length > 0) ? r.hours : base.hours,
    twelveStarPoem: r.twelveStarPoem || "",
    starSignPoem: r.starSignPoem || "",
    dimu: r.dimu || [],
    dimuPoem: r.dimuPoem || [],
    harvestPoem: r.harvestPoem || [],
    marriageTable: r.marriageTable || { forbidden: [], allowed: [] },
    source: r.source || "tyme4ts",
  };
}

export default function Zeri() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [cat, setCat] = useState<string>("all");
  const [remote, setRemote] = useState<Partial<HuangliDay> | null>(null);
  const [loading, setLoading] = useState(false);

  const data = useMemo(() => mergeData(date, remote), [date, remote]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHuangliFull(formatDate(date)).then((r) => {
      if (!cancelled) {
        setRemote(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [date]);

  const filteredYi = cat === "all" ? data.yi : filterByCategory(data.yi, cat);
  const filteredJi = cat === "all" ? data.ji : filterByCategory(data.ji, cat);

  function gotoDays(n: number) { setDate(shift(date, n)); }

  function exportPdf() {
    const sections = [
      { heading: "公历 / 农历 / 干支", body: `<p>${data.date}（${data.week}）</p><p>农历：${data.lunar}</p><p>${data.pillars}</p>` },
      { heading: "节庆与节令", body: `<p>节气：${data.solarTerm?.name ?? ""} ${data.solarTerm?.time ?? ""}</p>${data.nextSolarTerm ? `<p>下一节气：${data.nextSolarTerm.name} ${data.nextSolarTerm.time ?? ""}</p>` : ""}<p>朔望：${data.monthState?.phase ?? ""}</p>${data.festival ? `<p>节日：${data.festival}</p>` : ""}${data.legalHoliday ? `<p>法定假日：${data.legalHoliday}</p>` : ""}` },
      { heading: "神煞与建除", body: `<p>建除十二神：${data.dutyGod} · ${data.twelveStar}</p><p>九星：${data.nineStar.name}（${data.wuxingNumeric || ""}）</p><p>六耀：${data.liuYao} · 日禄：${data.riLu}</p><p>月令：${data.monthState?.monthOrder ?? ""} · 物候：${data.monthState?.phenology ?? ""}</p>` },
      { heading: "方位 / 神位", body: `<p>财神：${data.caiShen} · 喜神：${data.xiShen} · 福神：${data.fuShen}</p><p>贵神：阳 ${data.guiShen?.yang ?? ""} / 阴 ${data.guiShen?.yin ?? ""}</p><p>胎神：${data.taiShen?.month ?? ""} · 今日：${data.taiShen?.day ?? ""}（${data.taiShen?.direction ?? ""}）</p><p>三煞方：年 ${data.sanSha?.year ?? ""} / 月 ${data.sanSha?.month ?? ""} / 日 ${data.sanSha?.day ?? ""}</p><p>七煞方：年 ${data.qiSha?.year ?? ""} / 月 ${data.qiSha?.month ?? ""} / 日 ${data.qiSha?.day ?? ""}</p><p>岁煞：${data.suiSha?.year ?? ""} · 月煞：${data.suiSha?.month ?? ""}</p>` },
      { heading: "宜", body: `<p>${data.yi.join("、") || "—"}</p>` },
      { heading: "忌", body: `<p>${data.ji.join("、") || "—"}</p>` },
      { heading: "吉神宜趋", body: `<p>${(data.luckyGods ?? []).join("、") || "—"}</p>` },
      { heading: "凶煞宜忌", body: `<p>${(data.evilGods ?? []).join("、") || "—"}</p>` },
      { heading: "彭祖百忌", body: `<p>${(data.pengzu ?? []).join("； ") || "—"}</p>` },
      { heading: "大殓吉时 / 空亡", body: `<p>大殓吉时：${(data.daLianLuckyHours ?? []).join("、") || "—"}</p><p>空亡：年 ${data.kongWang?.year ?? ""} · 月 ${data.kongWang?.month ?? ""} · 日 ${data.kongWang?.day ?? ""}</p>` },
      { heading: "冲合与星宿", body: `<p>相冲：${data.chong}</p><p>冲合：${(data.chongHe ?? []).join("； ") || "—"}</p><p>今日星宿：${data.starSign || "—"}</p><p>的呼勿近：${data.riHu || "—"}</p><p>九宫飞星：${data.nineStar?.description ?? data.nineStar?.name ?? ""}</p><p>${data.nineStar?.poem ?? ""}</p>` },
      { heading: "今日卦象", body: `<p>${data.gua?.name || "—"}</p><p>${data.gua?.description || ""}</p>` },
      { heading: "农历信息", body: `<p>${data.lunarYearDays?.year ?? ""} 年 · 农历共 ${data.lunarYearDays?.total ?? 0} 天 · ${data.lunarYearDays?.range ?? ""}</p><p>已过 ${data.lunarYearDays?.passed ?? 0} 天 · 还剩 ${data.lunarYearDays?.remaining ?? 0} 天</p>` },
      { heading: "河图洛书", body: `<p>${data.luoshu?.name ?? ""}</p><p>${data.luoshu?.poem ?? ""}</p><p>${data.luoshu?.interpretation ?? ""}</p>` },
      { heading: "地母经卜", body: `<p>${(data.dimu ?? []).join("； ") || "—"}</p>` },
      { heading: "地母经诗", body: `<p>${(data.dimuPoem ?? []).join("； ") || "—"}</p>` },
      { heading: "本月丰歉歌", body: `<p>${(data.harvestPoem ?? []).join("； ") || "—"}</p>` },
      { heading: "十二时辰吉凶", body: (data.hours ?? []).map((h) => `<p><strong>${h.shichen}时</strong>（${h.timeRange}）· ${h.starGod || ""}<br/>干支 ${h.ganzhi || ""} · 正冲 ${h.chong || ""} · ${h.fortune || ""}<br/>五行 ${h.wuxing || ""} · 煞方 ${h.shaDirection || ""} · 财神 ${h.caiShen || ""} / 喜神 ${h.xiShen || ""}<br/>宜 ${h.yi.join("、") || "—"}<br/>忌 ${h.ji.join("、") || "—"}<br/>吉神 ${h.luckyGods.join("、") || "—"} · 凶煞 ${h.evilGods.join("、") || "—"}<br/>生肖 ${h.zodiac || ""}</p>`).join("") },
    ];
    openPrintWindow(
      sections.map((s) => `<section class="mx-print-section"><h2>${s.heading}</h2>${s.body}</section>`).join(""),
      { title: "黄历查询", subtitle: `${data.date}（${data.week}） · ${data.ganzhiYear}年 ${data.ganzhiDay}日`, autoPrint: true },
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="console-label mb-2 flex items-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // ALMANAC FULL
        </div>
        <h1 className="console-title text-2xl">
          <span className="seq">SYS.04</span>黄历宜忌
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          实时拉取 <b className="text-gold-300">huangli123.net</b> 全字段数据；与 tyme4ts 算法交叉验证。
        </p>
      </header>

      {/* 日期导航 */}
      <div className="card-xuan mb-5 flex flex-wrap items-center gap-3 p-4">
        <button type="button" className="btn-ghost !px-3 !py-1.5" onClick={() => gotoDays(-1)}>
          <ChevronLeft className="h-4 w-4" />前一天
        </button>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={data.date}
            onChange={(e) => setDate(new Date(e.target.value + "T00:00:00"))}
            className="input-xuan"
          />
          <button type="button" className="btn-ghost !px-3 !py-1.5" onClick={() => setDate(new Date())}>
            今天
          </button>
        </div>
        <button type="button" className="btn-ghost !px-3 !py-1" onClick={() => gotoDays(1)}>
          后一天<ChevronRight className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          {loading && <span className="text-xs text-paper-500 anim-twinkle">实时拉取中…</span>}
          {remote && <span className="hud-chip">已合并 huangli123.net</span>}
          <button type="button" onClick={exportPdf} className="btn-gold !px-3 !py-1.5 text-sm">
            <Download className="h-4 w-4" />导出 PDF
          </button>
        </div>
      </div>

      {/* 主题筛选（只影响宜忌） */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full px-3 py-1 text-xs transition-all ${
              cat === c.id
                ? "border border-gold-500 bg-gold-500/15 text-gold-300"
                : "border border-gold-500/20 text-paper-300 hover:border-gold-500/50 hover:text-gold-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ===== 1. 基础信息 ===== */}
      <Section title="① 基础信息">
        <Row label="公历" value={data.solarFull} />
        <Row label="农历" value={data.lunar} />
        <Row label="干支" value={data.pillars} />
        <Row label="生肖 / 星座" value={`${data.zodiac}年 · ${data.constellation || "—"}`} />
        <Row label="纳音" value={`年 ${data.wuxingYear || "—"} · 月 ${data.wuxingMonth || "—"} · 日 ${data.wuxingDay}`} />
        <Row label="农历年信息" value={`${data.lunarYearDays?.year ?? ""}年 共${data.lunarYearDays?.total ?? 0}天（${data.lunarYearDays?.range ?? ""}）已过${data.lunarYearDays?.passed ?? 0}天 还剩${data.lunarYearDays?.remaining ?? 0}天`} />
      </Section>

      {/* ===== 2. 节气与节庆 ===== */}
      <Section title="② 节气与节庆">
        <Row label="节气" value={data.solarTerm ? `${data.solarTerm.name}（${data.solarTerm.date} ${data.solarTerm.time ?? ""}）` : "—"} />
        {data.nextSolarTerm && <Row label="下一节气" value={`${data.nextSolarTerm.name}（${data.nextSolarTerm.date} ${data.nextSolarTerm.time ?? ""}）`} />}
        <Row label="月相" value={data.monthState?.phase ?? "—"} />
        <Row label="月令 / 物候" value={`${data.monthState?.monthOrder ?? ""} · ${data.monthState?.phenology ?? ""}`} />
        {data.festival && <Row label="节日" value={data.festival} />}
        {data.legalHoliday && <Row label="法定假日" value={data.legalHoliday} />}
      </Section>

      {/* ===== 3. 建除与神煞 ===== */}
      <Section title="③ 建除与神煞">
        <Row label="建除十二神" value={`${data.dutyGod} · ${data.twelveStar}`} />
        <Row label="九星" value={`${data.nineStar.name}（${data.wuxingNumeric}）`} />
        <Row label="六耀" value={data.liuYao || "—"} />
        <Row label="日禄" value={data.riLu || "—"} />
        <Row label="胎神" value={`${data.taiShen?.month ?? ""} · 今日 ${data.taiShen?.day ?? ""}（${data.taiShen?.direction ?? ""}）`} />
        <Row label="相冲" value={data.chong || "—"} />
        <Row label="今日冲合" value={(data.chongHe ?? []).join("； ") || "—"} />
        <Row label="吉神宜趋" value={(data.luckyGods ?? []).join("、") || "—"} />
        <Row label="凶煞宜忌" value={(data.evilGods ?? []).join("、") || "—"} />
        <Row label="彭祖百忌" value={(data.pengzu ?? []).join("； ") || "—"} />
        <Row label="大殓吉时" value={(data.daLianLuckyHours ?? []).join("、") || "—"} />
        <Row label="空亡所值" value={`年 ${data.kongWang?.year ?? ""} · 月 ${data.kongWang?.month ?? ""} · 日 ${data.kongWang?.day ?? ""}`} />
      </Section>

      {/* ===== 4. 神位方位 ===== */}
      <Section title="④ 神位与方位">
        <Row label="财神 / 喜神 / 福神" value={`${data.caiShen || "—"} / ${data.xiShen || "—"} / ${data.fuShen || "—"}`} />
        <Row label="贵神" value={`阳 ${data.guiShen?.yang ?? ""} / 阴 ${data.guiShen?.yin ?? ""}`} />
        <Row label="三煞方" value={`年 ${data.sanSha?.year ?? ""} · 月 ${data.sanSha?.month ?? ""} · 日 ${data.sanSha?.day ?? ""}`} />
        <Row label="七煞方" value={`年 ${data.qiSha?.year ?? ""} · 月 ${data.qiSha?.month ?? ""} · 日 ${data.qiSha?.day ?? ""}`} />
        <Row label="岁煞 / 月煞" value={`${data.suiSha?.year ?? ""} · ${data.suiSha?.month ?? ""}`} />
        <Row label="今日星宿" value={`${data.starSign || "—"} · 的呼勿近：${data.riHu || "—"}`} />
      </Section>

      {/* ===== 5. 宜 / 忌 ===== */}
      <Section title="⑤ 宜 / 忌（已按主题筛选）">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-jade-400/25 bg-jade-500/5 p-3">
            <h5 className="console-label text-jade-400">宜 · RECOMMEND</h5>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {filteredYi.length ? filteredYi.map((t, i) => (
                <li key={i} className="rounded border border-jade-400/30 bg-jade-400/10 px-2 py-0.5 text-[11px] text-jade-300">{t}</li>
              )) : <li className="text-xs text-paper-500">无</li>}
            </ul>
          </div>
          <div className="rounded-md border border-cinnabar-500/25 bg-cinnabar-500/5 p-3">
            <h5 className="console-label text-cinnabar-400">忌 · AVOID</h5>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {filteredJi.length ? filteredJi.map((t, i) => (
                <li key={i} className="rounded border border-cinnabar-500/30 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400">{t}</li>
              )) : <li className="text-xs text-paper-500">无</li>}
            </ul>
          </div>
        </div>
      </Section>

      {/* ===== 6. 卦象 / 河图洛书 / 地母经 ===== */}
      <Section title="⑥ 卦象与玄学">
        <Row label="今日卦象" value={data.gua?.name ? `${data.gua.name} · ${data.gua.description || ""}` : "—"} />
        <Row label="九宫飞星" value={data.nineStar?.description || data.nineStar?.name || "—"} />
        {data.nineStar?.poem && <Row label="飞星爻辞" value={<span className={ELEMENT_COLOR[data.wuxingNumeric] ?? ""}>{data.nineStar.poem}</span>} />}
        {data.luoshu?.poem && <Row label="河图洛书" value={data.luoshu.poem} />}
        {data.luoshu?.interpretation && <Row label="洛书要旨" value={data.luoshu.interpretation} />}
        {data.starSignPoem && <Row label="二十八宿歌诀" value={data.starSignPoem} />}
        {data.twelveStarPoem && <Row label="十二神所主" value={data.twelveStarPoem} />}
      </Section>

      {(data.dimu?.length || data.dimuPoem?.length || data.harvestPoem?.length) ? (
        <Section title="⑦ 地母经与丰歉歌" wide>
          {data.dimu && data.dimu.length > 0 && (
            <div className="mb-3">
              <div className="console-label mb-1">地母经卜曰</div>
              <div className="rounded-md border border-gold-500/15 bg-ink-900/40 p-3 text-sm leading-relaxed">
                {data.dimu.join("； ")}
              </div>
            </div>
          )}
          {data.dimuPoem && data.dimuPoem.length > 0 && (
            <div className="mb-3">
              <div className="console-label mb-1">地母经诗曰</div>
              <div className="rounded-md border border-gold-500/15 bg-ink-900/40 p-3 text-sm leading-relaxed">
                {data.dimuPoem.join("； ")}
              </div>
            </div>
          )}
          {data.harvestPoem && data.harvestPoem.length > 0 && (
            <div>
              <div className="console-label mb-1">本月丰歉歌</div>
              <div className="rounded-md border border-gold-500/15 bg-ink-900/40 p-3 text-sm leading-relaxed">
                {data.harvestPoem.join("； ")}
              </div>
            </div>
          )}
        </Section>
      ) : null}

      {/* ===== 8. 十二时辰完整明细 ===== */}
      <Section title="⑧ 十二时辰完整明细" wide>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gold-500/20 text-paper-400">
                <th className="px-2 py-2 text-left">时辰</th>
                <th className="px-2 py-2 text-left">时段</th>
                <th className="px-2 py-2 text-left">干支</th>
                <th className="px-2 py-2 text-left">星神</th>
                <th className="px-2 py-2 text-left">正冲</th>
                <th className="px-2 py-2 text-left">吉凶</th>
                <th className="px-2 py-2 text-left">五行</th>
                <th className="px-2 py-2 text-left">煞方</th>
                <th className="px-2 py-2 text-left">财神</th>
                <th className="px-2 py-2 text-left">喜神</th>
                <th className="px-2 py-2 text-left">生肖</th>
                <th className="px-2 py-2 text-left">宜</th>
                <th className="px-2 py-2 text-left">忌</th>
                <th className="px-2 py-2 text-left">吉神</th>
                <th className="px-2 py-2 text-left">凶煞</th>
              </tr>
            </thead>
            <tbody>
              {(data.hours ?? []).map((h, i) => (
                <tr key={i} className="border-b border-ink-700/40 hover:bg-ink-900/40">
                  <td className="px-2 py-2 font-bold text-paper-100">{h.shichen}</td>
                  <td className="px-2 py-2 text-paper-300">{h.timeRange}</td>
                  <td className="px-2 py-2 font-mono text-paper-200">{h.ganzhi || "—"}</td>
                  <td className="px-2 py-2 text-paper-300">{h.starGod || "—"}</td>
                  <td className="px-2 py-2 text-paper-400">{h.chong || "—"}</td>
                  <td className={`px-2 py-2 font-bold ${h.fortune === "吉" ? "text-jade-400" : h.fortune === "凶" ? "text-cinnabar-400" : "text-paper-400"}`}>{h.fortune || "—"}</td>
                  <td className={`px-2 py-2 ${ELEMENT_COLOR[h.wuxing?.slice(-1) ?? ""] ?? "text-paper-300"}`}>{h.wuxing || "—"}</td>
                  <td className="px-2 py-2 text-paper-300">{h.shaDirection || "—"}</td>
                  <td className="px-2 py-2 text-paper-300">{h.caiShen || "—"}</td>
                  <td className="px-2 py-2 text-paper-300">{h.xiShen || "—"}</td>
                  <td className="px-2 py-2 text-paper-300">{h.zodiac || "—"}</td>
                  <td className="px-2 py-2 text-jade-400">{h.yi?.join("、") || "—"}</td>
                  <td className="px-2 py-2 text-cinnabar-400">{h.ji?.join("、") || "—"}</td>
                  <td className="px-2 py-2 text-paper-400">{h.luckyGods?.join("、") || "—"}</td>
                  <td className="px-2 py-2 text-paper-500">{h.evilGods?.join("、") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="card-xuan mb-5 p-5">
      <h2 className="console-title mb-3 text-sm">
        <span className="seq">·</span>{title}
      </h2>
      <div className={wide ? "" : "grid grid-cols-1 gap-1.5 sm:grid-cols-2"}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-ink-700/30 px-1 py-1.5 text-xs">
      <span className="console-label min-w-[80px] shrink-0">{label}</span>
      <span className="text-paper-200">{value || "—"}</span>
    </div>
  );
}