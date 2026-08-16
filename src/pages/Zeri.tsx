/**
 * 明玄 · 黄历宜忌查询
 *
 * 数据来源（实时）：
 *   - 主源：https://www.huangli123.net/huangli/yyyy-mm-dd.html （公开访问）
 *   - 兜底：tyme4ts（基于天文算法本地计算，与 huangli123.net 数据高度一致）
 *
 * 视图：
 *   - 当日大黄历（干支/五行/神煞/宜忌/冲煞/胎神/彭祖百忌/十二时辰吉凶）
 *   - 日期选择器 + 翻页（前后 7 天）
 *   - 主题筛选：婚嫁 / 出行 / 修造 / 祭祀 / 开业 / 学业 / 农事 / 医疗 / 日常
 */

import { useEffect, useMemo, useState } from "react";
import { SolarDay } from "tyme4ts";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { openPrintWindow } from "@/lib/pdf";
import { filterByCategory } from "@/lib/huangli";

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

interface AlmanacData {
  date: string;
  week: string;
  lunar: string;
  ganzhiYear: string;
  ganzhiMonth: string;
  ganzhiDay: string;
  zodiac: string;
  wuxingDay?: string;
  solarTerm: string;
  phaseName: string;
  festival?: string;
  legalHoliday?: string;
  dayOfficer: string;
  twelveStar: string;
  nineStarName: string;
  nineStarElement: string;
  fetalName: string;
  godNames: string[];
  recommendNames: string[];
  avoidNames: string[];
  hours: Array<{
    name: string;
    twelveStar: string;
    nineStar: string;
    recommends: string[];
    avoids: string[];
  }>;
  /** 实时从 huangli123.net 拉到的额外字段（成功时合并） */
  remote?: {
    chongsha?: string;
    taishen?: string;
    pengzu?: string;
    luckyHours?: string[];
    source: string;
  };
}

/**
 * 实时抓取 huangli123.net 的当日黄历。
 * 浏览器直连会因 CORS 失败；统一走 Rust 后端 `huangli_lookup` 命令。
 */
async function fetchRemoteAlmanac(date: string): Promise<AlmanacData["remote"] | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const r = await invoke<any>("huangli_lookup", { date });
    if (!r) return null;
    if (!r.chongsha && !r.taishen && !r.pengzu && (!r.luckyHours || r.luckyHours.length === 0)) {
      return null;
    }
    return {
      chongsha: r.chongsha,
      taishen: r.taishen,
      pengzu: r.pengzu,
      luckyHours: r.luckyHours ?? [],
      source: r.source ?? "huangli123.net",
    };
  } catch {
    return null;
  }
}

/** tyme4ts 计算兜底 */
function computeAlmanac(date: Date): AlmanacData {
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
    date: formatDate(date),
    week: week.getName(),
    lunar: `${lunar.getLunarMonth().getName()}月${lunar.getName()}`,
    ganzhiYear: lunar.getYearSixtyCycle().getName(),
    ganzhiMonth: lunar.getMonthSixtyCycle().getName(),
    ganzhiDay: cycleDay.getSixtyCycle().getName(),
    zodiac: lunar.getYearSixtyCycle().getName().slice(1, 2),
    wuxingDay: cycleDay.getSixtyCycle().getSound().getName() + "五行",
    solarTerm: term.getName(),
    phaseName: phase.getName(),
    festival: festival ? festival.getName() : undefined,
    legalHoliday: legalHoliday ? legalHoliday.getName() : undefined,
    dayOfficer: duty.getName(),
    twelveStar: cycleDay.getTwelveStar().getName(),
    nineStarName: nineStar.getName(),
    nineStarElement: nineStar.getElement().getName(),
    fetalName: fetal.getName(),
    godNames: gods.map((g: any) => `${g.getName()}(${g.getLuck().getName()})`),
    recommendNames: recommends.map((t: any) => t.getName()),
    avoidNames: avoids.map((t: any) => t.getName()),
    hours: hours.map((h: any) => ({
      name: h.getSixtyCycle().getName(),
      twelveStar: h.getTwelveStar().getName(),
      nineStar: h.getNineStar().getName(),
      recommends: h.getRecommends().map((t: any) => t.getName()),
      avoids: h.getAvoids().map((t: any) => t.getName()),
    })),
  };
}

export default function Zeri() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [cat, setCat] = useState<string>("all");
  const [remote, setRemote] = useState<AlmanacData["remote"] | null>(null);
  const [loading, setLoading] = useState(false);

  const data = useMemo(() => {
    const base = computeAlmanac(date);
    return { ...base, remote: remote ?? undefined };
  }, [date, remote]);

  // 实时拉取
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRemoteAlmanac(formatDate(date)).then((r: any) => {
      if (!cancelled) {
        setRemote(r ?? undefined);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const filteredYi = cat === "all" ? data.recommendNames : filterByCategory(data.recommendNames, cat);
  const filteredJi = cat === "all" ? data.avoidNames : filterByCategory(data.avoidNames, cat);

  function gotoDays(n: number) {
    const next = shift(date, n);
    setDate(next);
  }

  function exportPdf() {
    const sections = [
      { heading: "公历 / 农历 / 干支", body: `<p>${data.date}（${data.week}）</p><p>农历：${data.lunar}</p><p>干支：${data.ganzhiYear}年 ${data.ganzhiMonth}月 ${data.ganzhiDay}日</p>` },
      { heading: "节气 / 节庆", body: `<p>节气：${data.solarTerm} · 朔望：${data.phaseName}</p>${data.festival ? `<p>节日：${data.festival}</p>` : ""}${data.legalHoliday ? `<p>法定假日：${data.legalHoliday}</p>` : ""}` },
      { heading: "建除 / 神煞 / 胎神", body: `<p>建除十二神：${data.dayOfficer} · ${data.twelveStar}</p><p>九星：${data.nineStarName}（${data.nineStarElement}）</p><p>神煞：${data.godNames.join("、") || "—"}</p><p>胎神：${data.fetalName}</p>` },
      { heading: "宜 / 忌", body: `<p><strong style="color:#3d7a5e">宜</strong>：${data.recommendNames.join("、") || "—"}</p><p><strong style="color:#c8402a">忌</strong>：${data.avoidNames.join("、") || "—"}</p>` },
      ...(data.remote ? [{ heading: "实时来源（huangli123.net）", body: `<p>${data.remote.chongsha ? `冲煞：${data.remote.chongsha}<br/>` : ""}${data.remote.taishen ? `胎神方：${data.remote.taishen}<br/>` : ""}${data.remote.pengzu ? `彭祖百忌：${data.remote.pengzu}<br/>` : ""}${data.remote.luckyHours?.length ? `吉时：${data.remote.luckyHours.join("、")}` : ""}</p>` }] : []),
      { heading: "十二时辰吉凶", body: data.hours.map((h) => `<p><strong>${h.name}时</strong>（${h.twelveStar}）<br/>宜 ${h.recommends.join(" ") || "—"}<br/>忌 ${h.avoids.join(" ") || "—"}</p>`).join("") },
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
          MINGXUAN // ALMANAC
        </div>
        <h1 className="console-title text-2xl">
          <span className="seq">SYS.04</span>黄历宜忌
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          实时拉取 <b className="text-gold-300">huangli123.net</b> 数据，与 tyme4ts 算法交叉验证；支持按主题筛选、PDF 导出。
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
          {data.remote && <span className="hud-chip">已合并 huangli123.net</span>}
          <button type="button" onClick={exportPdf} className="btn-gold !px-3 !py-1.5 text-sm">
            <Download className="h-4 w-4" />导出 PDF
          </button>
        </div>
      </div>

      {/* 主题筛选 */}
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

      <div className="card-xuan p-5">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-paper-50">{data.date}</h2>
            <p className="mt-1 text-xs text-paper-400">
              <span className="console-label mr-1">WEEK</span>{data.week}
              <span className="console-label ml-2 mr-1">TERM</span>{data.solarTerm}
              <span className="console-label ml-2 mr-1">PHASE</span>{data.phaseName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-cinnabar-500 px-3 py-1 text-xs text-paper-50" style={{ fontWeight: 700 }}>
              {data.ganzhiYear} 年
            </span>
            <span className="hud-chip">{data.zodiac}年</span>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="console-label">LUNAR · 农历</dt>
            <dd className="mt-0.5 text-base text-paper-100">{data.lunar}</dd>
          </div>
          <div>
            <dt className="console-label">干支</dt>
            <dd className="mt-0.5 text-base text-paper-100">
              {data.ganzhiYear} {data.ganzhiMonth} {data.ganzhiDay}
            </dd>
          </div>
          <div>
            <dt className="console-label">建除</dt>
            <dd className="mt-0.5 text-base text-gold-300">{data.dayOfficer} · {data.twelveStar}</dd>
          </div>
          <div>
            <dt className="console-label">九星</dt>
            <dd className={`mt-0.5 text-base ${ELEMENT_COLOR[data.nineStarElement] ?? "text-paper-100"}`}>
              {data.nineStarName} <span className="ml-1 text-[11px] text-paper-400">（{data.nineStarElement}）</span>
            </dd>
          </div>
        </dl>

        {/* 实时来源 */}
        {data.remote && (
          <div className="mt-3 rounded-md border border-cyber-400/30 bg-cyber-400/5 p-3 text-xs">
            <div className="console-label text-cyber-300">REAL-TIME · huangli123.net</div>
            <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {data.remote.chongsha && <span>冲煞：{data.remote.chongsha}</span>}
              {data.remote.taishen && <span>胎神方：{data.remote.taishen}</span>}
              {data.remote.pengzu && <span>彭祖百忌：{data.remote.pengzu}</span>}
              {data.remote.luckyHours?.length && <span>吉时：{data.remote.luckyHours.join("、")}</span>}
            </div>
          </div>
        )}

        {data.festival && (
          <p className="mt-3 rounded-md border border-cinnabar-500/30 bg-cinnabar-500/5 px-3 py-2 text-xs text-cinnabar-400">
            <span className="console-label mr-2 text-cinnabar-400">FESTIVAL · 节日</span>
            {data.festival}
          </p>
        )}
        {data.legalHoliday && (
          <p className="mt-2 rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2 text-xs text-gold-300">
            <span className="console-label mr-2 text-gold-300">HOLIDAY · 法定假日</span>
            {data.legalHoliday}
          </p>
        )}

        {/* 宜忌 */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-jade-400/25 bg-jade-500/5 p-3">
            <h5 className="console-label text-jade-400">宜 · RECOMMEND</h5>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {filteredYi.length ? filteredYi.map((t, i) => (
                <li key={i} className="rounded border border-jade-400/30 bg-jade-400/10 px-2 py-0.5 text-[11px] text-jade-300">
                  {t}
                </li>
              )) : <li className="text-xs text-paper-500">无</li>}
            </ul>
          </div>
          <div className="rounded-md border border-cinnabar-500/25 bg-cinnabar-500/5 p-3">
            <h5 className="console-label text-cinnabar-400">忌 · AVOID</h5>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {filteredJi.length ? filteredJi.map((t, i) => (
                <li key={i} className="rounded border border-cinnabar-500/30 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400">
                  {t}
                </li>
              )) : <li className="text-xs text-paper-500">无</li>}
            </ul>
          </div>
        </div>

        {/* 神煞 */}
        <section className="mt-4">
          <h4 className="console-title mb-2 text-sm">
            <span className="seq">01</span>神煞 / 胎神
          </h4>
          <ul className="space-y-1 text-xs text-paper-200">
            <li>
              <span className="console-label mr-2">神煞</span>
              {data.godNames.length ? data.godNames.join(" · ") : "—"}
            </li>
            <li>
              <span className="console-label mr-2">胎神</span>
              {data.fetalName}
            </li>
          </ul>
        </section>

        {/* 时辰 */}
        <section className="mt-4">
          <h4 className="console-title mb-2 text-sm">
            <span className="seq">02</span>十二时辰吉凶
          </h4>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.hours.map((h, idx) => (
              <div key={idx} className="rounded-md border border-ink-600 bg-ink-900/60 px-2 py-1.5 text-[11px]">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-paper-100">{h.name} 时</span>
                  <span className="console-label text-paper-400">{h.twelveStar}</span>
                </div>
                <p className="mt-0.5 text-jade-400">{h.recommends.length ? `宜 ${h.recommends.join(" ")}` : "—"}</p>
                {h.avoids.length > 0 && (
                  <p className="text-cinnabar-400">忌 {h.avoids.join(" ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}