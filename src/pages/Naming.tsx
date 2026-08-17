/**
 * 明玄 · 起名
 *
 * 基于 PiPiName 算法（单姓双字名 + 三才五格 + 古诗文 + 常见姓名库）。
 * 全部数据本地（unihan-strokes.json + chinese_names.dat + 内嵌古诗文短语库）。
 */

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, RefreshCw, AlertCircle, Download, ChevronRight, Database } from "lucide-react";
import {
  generateNames,
  lookupName,
  calcWuge,
  SOURCE_LABELS,
  type NameCandidate,
  type SourceId,
  type WugeResult,
} from "@/lib/naming";
import { openPrintWindow } from "@/lib/pdf";

const SOURCE_OPTIONS: Array<{ id: SourceId | "all"; label: string; desc: string }> = [
  { id: "all", label: "全部", desc: "古诗文 + 常见姓名" },
  { id: "shijing", label: "诗经", desc: "思无邪" },
  { id: "chuci", label: "楚辞", desc: "香草美人" },
  { id: "lunyu", label: "论语", desc: "中正平和" },
  { id: "zhouyi", label: "周易", desc: "天行健" },
  { id: "tangshi", label: "唐诗", desc: "雍容气象" },
  { id: "songshi", label: "宋诗", desc: "理趣深远" },
  { id: "songci", label: "宋词", desc: "婉约清扬" },
  { id: "common", label: "常见姓名", desc: "基于 Chinese Names Corpus 真实姓名" },
];

const GRID_COLOR: Record<string, string> = {
  大吉: "border-jade-400/40 bg-jade-400/10 text-jade-300",
  中吉: "border-gold-500/40 bg-gold-500/10 text-gold-300",
  凶: "border-cinnabar-500/40 bg-cinnabar-500/10 text-cinnabar-300",
  "": "border-ink-600 bg-ink-900/30 text-paper-400",
};

const ELEMENT_COLOR: Record<string, string> = {
  木: "text-[color:var(--color-wuxing-mu)]",
  火: "text-[color:var(--color-wuxing-huo)]",
  土: "text-[color:var(--color-wuxing-tu)]",
  金: "text-[color:var(--color-wuxing-jin)]",
  水: "text-[color:var(--color-wuxing-shui)]",
};

const SAMPLE_SURNAMES = ["李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "林", "何", "高"];

export default function Naming() {
  const [surname, setSurname] = useState("李");
  const [source, setSource] = useState<SourceId | "all">("all");
  const [gender, setGender] = useState<"" | "男" | "女">("");
  const [allowGeneral, setAllowGeneral] = useState(false);
  const [dislike, setDislike] = useState("");
  const [minStroke, setMinStroke] = useState(3);
  const [maxStroke, setMaxStroke] = useState(30);
  const [limit, setLimit] = useState(60);

  const [results, setResults] = useState<NameCandidate[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<WugeResult | null>(null);
  const [detailInput, setDetailInput] = useState("");
  const [dbInfo, setDbInfo] = useState<{ ok: boolean; msg: string } | null>(null);

  // 启动时检测后端 DB 是否可用
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const r = await invoke<any>("name_lookup", { name: "林蛋大" });
        setDbInfo({ ok: true, msg: `已连接 SQLite（${r?.sancai ?? ""} 三才）` });
      } catch (e: any) {
        // 兼容 Rust 错误（字符串）与 JS Error
        const msg = (typeof e === "string" ? e : e?.message) ?? JSON.stringify(e);
        setDbInfo({ ok: false, msg: `未连接（${msg}）` });
      }
    })();
  }, []);

  const dislikeChars = useMemo(
    () => Array.from(new Set(dislike.split("").filter((c) => c.trim()))).filter((c) => /[一-鿿]/.test(c)),
    [dislike],
  );

  async function doGenerate() {
    if (!surname.trim() || surname.length !== 1) {
      setError("请输入单字姓氏（1 个汉字）");
      return;
    }
    if (!/^[一-鿿]$/.test(surname)) {
      setError("请输入有效的汉字姓氏");
      return;
    }
    setError("");
    setGenerating(true);
    setResults([]);
    setSelected(null);
    try {
      const list = await generateNames({
        surname,
        source,
        gender,
        allowGeneral,
        dislikeChars: dislikeChars,
        minStroke,
        maxStroke,
        limit,
      });
      setResults(list);
      if (!list.length) {
        setError("没有匹配的候选名。试着放宽笔画范围或允许中吉。");
      }
    } catch (e) {
      setError(`生成失败：${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function checkExistingName() {
    if (detailInput.length !== 3) {
      setError("请输入 3 个汉字（单姓 + 双字名）");
      return;
    }
    setError("");
    try {
      let r: WugeResult;
      try {
        r = await lookupName(detailInput);
      } catch {
        // 后端不可用时，前端用 calcWuge 兜底（仅三才五格，无出处）
        const w = calcWuge(detailInput);
        r = {
          name: w.name,
          strokes: w.strokes,
          tian: w.tian, ren: w.ren, di: w.di, zong: w.zong, wai: w.wai,
          sancai: w.sancai,
          sancaiKind: w.sancaiKind,
          validGender: null,
          resources: [],
        };
      }
      setSelected(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "查询失败");
    }
  }

  function exportPdf() {
    if (!results.length) return;
    const sections = [
      { heading: "查询条件", body: `<p>姓氏：${surname}</p><p>来源：${SOURCE_LABELS[source]}</p><p>性别：${gender || "不限"}</p><p>笔画范围：${minStroke}–${maxStroke}</p><p>允许中吉：${allowGeneral ? "是" : "否"}</p><p>忌用字：${dislike || "无"}</p>` },
      ...results.map((r, i) => ({
        heading: `${i + 1}. ${r.fullName}（${r.stroke1}+${r.stroke2} 画）`,
        body: `<p>来源：<b>${r.sourceLabel}</b>${r.title ? ` · ${r.title}` : ""}${r.author ? ` · ${r.author}` : ""}</p>${r.sentence ? `<blockquote>${r.sentence}</blockquote>` : ""}<p>性别倾向：${r.gender || "—"}</p>`,
      })),
    ];
    openPrintWindow(
      sections.map((s) => `<section class="mx-print-section"><h2>${s.heading}</h2>${s.body}</section>`).join(""),
      { title: "起名报告", subtitle: `姓 ${surname} · ${SOURCE_LABELS[source]} · ${results.length} 条候选`, autoPrint: true },
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="console-label mb-2 flex items-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // CHINESE NAMING
        </div>
        <h1 className="console-title text-2xl">
          <span className="seq">SYS.08</span>起名 · 三才五格
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          基于 PiPiName 算法（<b className="text-gold-300">单姓双字名</b> + 三才五格大吉筛选 + 古诗文/常见姓名库）。
          全量数据已构建为本地 SQLite 索引（<code className="rounded bg-ink-800 px-1">pipiname.sqlite3</code>）：
          48 万句诗经/楚辞/论语/周易/唐诗/宋诗/宋词 + 29 万真实姓名 + 82 万候选名。
        </p>
        {dbInfo && (
          <p className={`mt-1 text-[11px] ${dbInfo.ok ? "text-jade-400" : "text-cinnabar-400"}`}>
            <Database className="mr-1 inline h-3 w-3" />{dbInfo.msg}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          {/* 输入区 */}
          <div className="card-xuan space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="console-label mb-1 block">SURNAME · 姓氏</span>
                <input
                  className="input-xuan w-full text-2xl text-center"
                  maxLength={1}
                  value={surname}
                  onChange={(e) => setSurname(e.target.value.slice(-1))}
                  placeholder="李"
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {SAMPLE_SURNAMES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSurname(s)}
                      className="rounded border border-gold-500/20 px-2 py-0.5 text-[10px] text-paper-300 transition-colors hover:border-gold-500/60 hover:text-gold-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="console-label mb-1 block">GENDER · 性别</span>
                <select className="input-xuan w-full" value={gender} onChange={(e) => setGender(e.target.value as "" | "男" | "女")}>
                  <option value="">不限</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </label>
              <label className="block">
                <span className="console-label mb-1 block">COUNT · 候选数</span>
                <select className="input-xuan w-full" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  <option value={20}>20 条</option>
                  <option value={60}>60 条</option>
                  <option value={100}>100 条</option>
                  <option value={200}>200 条</option>
                </select>
              </label>
            </div>

            <div>
              <span className="console-label mb-2 block">SOURCE · 来源词库</span>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSource(s.id)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${
                      source === s.id
                        ? "border border-gold-500 bg-gold-500/15 text-gold-300"
                        : "border border-gold-500/20 text-paper-300 hover:border-gold-500/50 hover:text-gold-300"
                    }`}
                    title={s.desc}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="console-label mb-1 block">MIN STROKE · 最小笔画</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input-xuan w-full"
                  value={minStroke}
                  onChange={(e) => setMinStroke(Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className="console-label mb-1 block">MAX STROKE · 最大笔画</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input-xuan w-full"
                  value={maxStroke}
                  onChange={(e) => setMaxStroke(Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className="console-label mb-1 block">DISLIKE · 忌用字</span>
                <input
                  className="input-xuan w-full"
                  value={dislike}
                  onChange={(e) => setDislike(e.target.value)}
                  placeholder="如：丑、病、死"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-paper-300">
              <input
                type="checkbox"
                checked={allowGeneral}
                onChange={(e) => setAllowGeneral(e.target.checked)}
                className="accent-gold-500"
              />
              允许中吉（除"大吉"外，再加"中吉"组合；不勾选则仅大吉）
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={doGenerate} disabled={generating} className="btn-gold !px-4 !py-2 text-sm">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                开始起名
              </button>
              <button type="button" onClick={() => { setResults([]); setError(""); setSelected(null); }} className="btn-ghost !px-3 !py-2 text-sm">
                <RefreshCw className="h-4 w-4" />清空
              </button>
              {results.length > 0 && (
                <button type="button" onClick={exportPdf} className="btn-ghost ml-auto !px-3 !py-2 text-sm">
                  <Download className="h-4 w-4" />导出 PDF
                </button>
              )}
            </div>

            {error && (
              <p className="rounded border border-cinnabar-500/30 bg-cinnabar-500/10 px-3 py-2 text-xs text-cinnabar-300">
                <AlertCircle className="mr-1 inline h-3 w-3" />{error}
              </p>
            )}
          </div>

          {/* 候选结果 */}
          {results.length > 0 && (
            <div className="card-xuan p-5">
              <h3 className="console-title mb-3 text-sm">
                <span className="seq">·</span>候选名（{results.length}）
              </h3>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => lookupName(r.fullName).then(setSelected).catch((e) => setError(e.message))}
                      className="group flex w-full items-start gap-3 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-left transition-all hover:border-gold-500/50 hover:bg-ink-800/60"
                    >
                      <div className="text-2xl font-bold text-gold-300">{r.fullName}</div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center gap-2 text-paper-300">
                          <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-gold-300">
                            {r.sourceLabel}
                          </span>
                          <span className="text-paper-400">
                            {r.stroke1}+{r.stroke2}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-paper-400">{r.title}</div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-paper-500 group-hover:text-gold-300" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 详情面板 */}
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          <div className="card-xuan p-5">
            <h3 className="console-title mb-3 text-sm">
              <span className="seq">·</span>三才五格详解
            </h3>

            {/* 手动查询 */}
            <div className="mb-4 flex gap-2">
              <input
                className="input-xuan flex-1"
                value={detailInput}
                onChange={(e) => setDetailInput(e.target.value.slice(0, 3))}
                placeholder="如：李清照"
                maxLength={3}
              />
              <button type="button" onClick={checkExistingName} className="btn-ghost !px-3 !py-1.5 text-sm">
                <Search className="h-4 w-4" />查
              </button>
            </div>

            {selected ? (
              <div className="anim-fade-up space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gold-300">{selected.name}</div>
                  <div className="mt-1 text-[11px] text-paper-400">
                    {selected.strokes[0]} + {selected.strokes[1]} + {selected.strokes[2]} ={" "}
                    {selected.strokes[0] + selected.strokes[1] + selected.strokes[2]} 画
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center text-[11px]">
                  <Grid label="天格" item={selected.tian} />
                  <Grid label="人格" item={selected.ren} />
                  <Grid label="地格" item={selected.di} />
                  <Grid label="外格" item={selected.wai} />
                  <Grid label="总格" item={selected.zong} />
                </div>

                <div className="rounded-md border border-gold-500/20 bg-ink-900/40 p-3">
                  <div className="console-label mb-1">SAN CAI · 三才</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">
                      {selected.sancai.split("").map((c, i) => (
                        <span key={i} className={ELEMENT_COLOR[c] ?? "text-paper-100"}>{c}</span>
                      ))}
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-bold ${
                        GRID_COLOR[selected.sancaiKind] ?? GRID_COLOR[""]
                      }`}
                    >
                      {selected.sancaiKind || "—"}
                    </span>
                  </div>
                </div>

                {selected.resources.length > 0 && (
                  <div>
                    <div className="console-label mb-1.5">SOURCE · 名源</div>
                    <ul className="space-y-1.5">
                      {selected.resources.map((r, i) => {
                        const sid = r.source_type as SourceId;
                        return (
                          <li key={i} className="rounded border border-gold-500/15 bg-ink-900/30 p-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-gold-300">
                                {SOURCE_LABELS[sid] ?? r.source_type}
                              </span>
                              {r.title && <span className="text-paper-300">{r.title}</span>}
                            </div>
                            {r.author && <div className="mt-0.5 text-paper-400">{r.author}</div>}
                            {r.sentence && (
                              <blockquote className="mt-1 border-l-2 border-gold-500/30 pl-2 text-paper-200">
                                {r.sentence}
                              </blockquote>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-paper-500">
                点击候选名或手动输入 3 字姓名查看三才五格详解
              </p>
            )}
          </div>

          {/* 词库统计 */}
          <div className="card-xuan mt-4 p-5">
            <h3 className="console-title mb-2 text-sm">
              <span className="seq">·</span>本地词库（pipiname.sqlite3）
            </h3>
            <div className="space-y-1 text-xs text-paper-300">
              <div className="flex items-center justify-between">
                <span>诗经/楚辞/论语/周易</span>
                <span className="text-paper-500">~6,000 句</span>
              </div>
              <div className="flex items-center justify-between">
                <span>唐诗</span>
                <span className="text-paper-500">~138,000 句</span>
              </div>
              <div className="flex items-center justify-between">
                <span>宋诗</span>
                <span className="text-paper-500">~266,000 句</span>
              </div>
              <div className="flex items-center justify-between">
                <span>宋词</span>
                <span className="text-paper-500">~73,000 句</span>
              </div>
              <div className="flex items-center justify-between">
                <span>常见姓名库</span>
                <span className="text-paper-500">~291,000 真实姓名</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-paper-500">
              数据源自 chinese-poetry（CC-BY-SA）与 wainshine/Chinese-Names-Corpus
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Grid({ label, item }: { label: string; item: { value: number; kind: string } }) {
  return (
    <div className={`rounded border px-1.5 py-1.5 ${GRID_COLOR[item.kind] ?? GRID_COLOR[""]}`}>
      <div className="console-label">{label}</div>
      <div className="text-base font-bold">{item.value}</div>
      <div className="text-[9px] opacity-70">{item.kind || "—"}</div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <RefreshCw className={className} />;
}