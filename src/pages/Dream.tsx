/**
 * 明玄 · 周公解梦
 *
 * 功能：
 * - 关键字搜索 / 类别筛选 / 自然语言描述 → 智能匹配
 * - AI 综合解读（结合本地资料库 + 大模型做综合解读）
 * - 收藏、查看历史、详情查看（Markdown 富样式渲染）
 *
 * 数据：首次访问时自动加载 /dream-zhougong.json（4162+ 条本地资料），
 * 与 localStorage 用户数据合并。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Sparkles, Star, Clock, ChevronRight, Moon, Loader2,
  RefreshCw, BookOpen, Heart, Tag,
} from "lucide-react";
import {
  searchByKeyword, searchByNatural, getAllDreams,
  getFavorites, toggleFavorite, isFavorite, getDreamHistory, pushDreamHistory,
  dbStats, type DreamEntry,
} from "@/lib/dream";
import {
  chatStream, resolveUsableSettings, type ChatMessage,
} from "@/lib/ai";
import { loadSettings } from "@/lib/settings";
import { MarkdownLite } from "@/components/ai/markdownLite";

const CATS = ["全部", "人物", "动物", "植物", "物品", "活动", "生活", "自然", "鬼神", "建筑", "其它"] as const;

type Mode = "keyword" | "natural" | "ai";

const DREAM_SYSTEM = `你是一位专业的释梦咨询师，融合传统中华释梦智慧与现代积极心理学。
要求：
1. 用户用自然语言描述梦境（可能模糊、跳跃或情绪化），先**用温和的语言复述并梳理**用户的梦境，确认理解。
2. 基于提供的「本地资料库」做客观引用（标注关键来源），再结合心理学常识给出综合解读。
3. 不做绝对化断言（如"必定""一定"），不使用恐吓性措辞；涉及健康、重大决策时提醒仅供参考。
4. 输出 Markdown，使用 H2/H3 分块：
   - ## 梦境梳理
   - ## 关键意象解读（结合本地资料）
   - ## 心理层面的可能含义
   - ## 近期建议
5. 中文输出，篇幅 500–900 字。`;

export default function Dream() {
  const [, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof CATS[number]>("全部");
  const [tab, setTab] = useState<"browse" | "favorites" | "history">("browse");
  const [selected, setSelected] = useState<DreamEntry | null>(null);
  const [mode, setMode] = useState<Mode>("natural");

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    refresh();
    window.addEventListener("mx-dream-changed", refresh);
    return () => window.removeEventListener("mx-dream-changed", refresh);
  }, []);

  const stats = useMemo(() => dbStats(), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="console-label mb-2 flex items-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // ZHOU GONG DREAM INTERPRETATION
        </div>
        <h1 className="console-title text-2xl">
          <span className="seq">SYS.06</span>周公解梦
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          本地资料库已收录 <b className="text-gold-300">{stats.total}</b> 条梦境释义。
          支持关键字、类别、自然语言检索与 AI 综合解读。
        </p>
      </header>

      {/* 搜索栏 */}
      <div className="card-xuan mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-500" />
            <input
              className="input-xuan w-full pl-9"
              placeholder="输入关键字（如 蛇 / 牙齿 / 飞）或描述梦境（如 梦见自己在天空中飞）"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setMode("natural")}
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className={`tab-chip text-sm ${mode === "natural" ? "is-active" : ""}`}
              onClick={() => setMode("natural")}
              title="自然语言检索：拆分关键字并按权重匹配"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />智能匹配
            </button>
            <button
              type="button"
              className={`tab-chip text-sm ${mode === "keyword" ? "is-active" : ""}`}
              onClick={() => setMode("keyword")}
              title="严格关键字匹配"
            >
              <Tag className="mr-1 inline h-3.5 w-3.5" />关键字
            </button>
            <button
              type="button"
              className={`tab-chip text-sm ${mode === "ai" ? "is-active" : ""}`}
              onClick={() => setMode("ai")}
              title="AI 综合解读：结合本地资料 + 大模型"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />AI 解读
            </button>
          </div>
        </div>

        {/* 类别标签 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs transition-all ${
                cat === c
                  ? "border border-gold-500 bg-gold-500/15 text-gold-300"
                  : "border border-gold-500/20 text-paper-300 hover:border-gold-500/50 hover:text-gold-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Tab 切换 */}
        <div className="mt-3 flex border-b border-gold-500/15">
          {(
            [
              { id: "browse", label: "全部", icon: BookOpen },
              { id: "favorites", label: "收藏", icon: Heart },
              { id: "history", label: "历史", icon: Clock },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm transition-colors ${
                tab === t.id
                  ? "border-gold-400 font-bold text-gold-300"
                  : "border-transparent text-paper-400 hover:text-paper-100"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        {/* 左侧结果列表 */}
        <div>
          {tab === "browse" && (
            <Results
              query={q}
              mode={mode}
              cat={cat}
              onSelect={(e) => setSelected(e)}
              selectedId={selected?.id}
            />
          )}
          {tab === "favorites" && (
            <FavoritesList onSelect={(e) => setSelected(e)} selectedId={selected?.id} />
          )}
          {tab === "history" && <HistoryList onSelect={(e) => setSelected(e)} />}
        </div>

        {/* 右侧详情 */}
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          {selected ? (
            <DetailView entry={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="card-xuan flex flex-col items-center gap-3 p-8 text-center text-paper-400">
              <Moon className="h-10 w-10 text-gold-500/40" />
              <p className="text-sm">从左侧选择一条梦境，或在上方输入描述进行智能匹配 / AI 解读。</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ============== 结果列表 ==============

function Results({
  query, mode, cat, onSelect, selectedId,
}: {
  query: string;
  mode: Mode;
  cat: typeof CATS[number];
  onSelect: (e: DreamEntry) => void;
  selectedId?: string;
}) {
  const results = useMemo(() => {
    if (mode === "keyword") {
      let r = query.trim() ? searchByKeyword(query) : getAllDreams();
      if (cat !== "全部") r = r.filter((d) => d.category === cat);
      return r.slice(0, 80);
    }
    if (mode === "natural") {
      let r = query.trim() ? searchByNatural(query, 30) : getAllDreams();
      if (cat !== "全部") r = r.filter((d) => d.category === cat);
      return r.slice(0, 30);
    }
    // ai 模式下，结果列表展示自然语言匹配的条目，右侧详情做 AI 解读
    let r = query.trim() ? searchByNatural(query, 30) : getAllDreams();
    if (cat !== "全部") r = r.filter((d) => d.category === cat);
    return r.slice(0, 30);
  }, [query, mode, cat]);

  if (results.length === 0) {
    return (
      <div className="card-xuan p-6 text-center text-paper-400">
        没有匹配的梦境。试试别的关键字，或直接在上方描述你的梦境。
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {results.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            onClick={() => onSelect(e)}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              selectedId === e.id
                ? "border-gold-500/60 bg-gold-500/10"
                : "border-gold-500/15 bg-ink-900/40 hover:border-gold-500/40 hover:bg-ink-800/60"
            }`}
          >
            <span className="mt-0.5 rounded bg-gold-500/15 px-2 py-0.5 text-[10px] text-gold-400">{e.category}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-paper-100">{e.title}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-paper-400">{e.summary}</div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-paper-500" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function FavoritesList({ onSelect, selectedId }: { onSelect: (e: DreamEntry) => void; selectedId?: string }) {
  const [ids, setIds] = useState<string[]>(getFavorites());
  useEffect(() => {
    const onChange = () => setIds(getFavorites());
    window.addEventListener("mx-dream-changed", onChange);
    return () => window.removeEventListener("mx-dream-changed", onChange);
  }, []);
  const all = getAllDreams();
  const list = ids.map((id) => all.find((d) => d.id === id)).filter(Boolean) as DreamEntry[];
  if (list.length === 0)
    return <div className="card-xuan p-6 text-center text-paper-400">暂无收藏。在详情页点击 ⭐ 收藏感兴趣的梦境。</div>;
  return (
    <ul className="space-y-2">
      {list.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            onClick={() => onSelect(e)}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              selectedId === e.id ? "border-gold-500/60 bg-gold-500/10" : "border-gold-500/15 bg-ink-900/40 hover:border-gold-500/40"
            }`}
          >
            <Star className="mt-1 h-4 w-4 shrink-0 text-gold-400" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-paper-100">{e.title}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-paper-400">{e.summary}</div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function HistoryList({ onSelect }: { onSelect: (e: DreamEntry) => void }) {
  const [list, setList] = useState(getDreamHistory());
  useEffect(() => {
    const onChange = () => setList(getDreamHistory());
    window.addEventListener("mx-dream-changed", onChange);
    return () => window.removeEventListener("mx-dream-changed", onChange);
  }, []);
  if (list.length === 0)
    return <div className="card-xuan p-6 text-center text-paper-400">暂无历史。在上方搜索后会自动记录。</div>;
  const all = getAllDreams();
  return (
    <ul className="space-y-2">
      {list.map((h) => (
        <li key={h.id} className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-paper-100">{h.query}</div>
            <span className="text-[10px] text-paper-500">{new Date(h.createdAt).toLocaleString()}</span>
          </div>
          {h.matchedIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {h.matchedIds.map((mid) => {
                const e = all.find((d) => d.id === mid);
                if (!e) return null;
                return (
                  <button
                    key={mid}
                    type="button"
                    onClick={() => onSelect(e)}
                    className="rounded border border-gold-500/30 px-2 py-0.5 text-[11px] text-gold-300 transition-colors hover:border-gold-500/60"
                  >
                    {e.title}
                  </button>
                );
              })}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ============== 详情面板 ==============

function DetailView({ entry, onClose }: { entry: DreamEntry; onClose: () => void }) {
  const [fav, setFav] = useState(isFavorite(entry.id));
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [aiError, setAiError] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  function onFav() {
    toggleFavorite(entry.id);
    setFav(!fav);
  }

  async function startAi() {
    if (!userQuery.trim()) {
      setAiError("请先在上方文本框描述你的梦境，再开始 AI 解读。");
      return;
    }
    const settings = loadSettings();
    if (!settings.dreamAiParse) {
      setAiError("AI 解读功能未启用，请到「设置 → 解梦功能」开启。");
      return;
    }
    setAiStreaming(true);
    setAiError("");
    setAiContent("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const s = await resolveUsableSettings();
      const messages: ChatMessage[] = [
        { role: "system", content: DREAM_SYSTEM },
        {
          role: "user",
          content:
            `【用户梦境描述】\n${userQuery}\n\n` +
            `【本地资料库相关条目（供你引用）】\n` +
            `### ${entry.title}\n${entry.content}\n\n` +
            `请综合本地资料与心理学常识，给出解读。`,
        },
      ];
      await chatStream(s, messages, (_d, full) => setAiContent(full), ctrl.signal);
      // 记录历史
      pushDreamHistory({ id: `h_${Date.now().toString(36)}`, query: userQuery, matchedIds: [entry.id], aiAnswer: aiContent });
    } catch (e) {
      if (!ctrl.signal.aborted) setAiError(e instanceof Error ? e.message : "AI 解读失败");
    } finally {
      setAiStreaming(false);
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="card-xuan anim-fade-up p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="rounded bg-gold-500/15 px-2 py-0.5 text-[10px] text-gold-400">{entry.category}</span>
          <h2 className="mt-2 text-xl font-bold text-gold-300">{entry.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="text-paper-500 hover:text-paper-100">
          ×
        </button>
      </div>

      {/* 资料原文 */}
      <div className="mb-4 max-h-[40vh] overflow-y-auto rounded-lg border border-gold-500/15 bg-ink-900/40 p-4">
        <MarkdownLite text={entry.content} />
      </div>

      {/* 操作 */}
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={onFav}
          className={`btn-ghost !px-3 !py-1.5 text-sm ${fav ? "!border-gold-500 !text-gold-300" : ""}`}
        >
          <Star className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} />
          {fav ? "已收藏" : "收藏"}
        </button>
        <button
          type="button"
          className="btn-ghost !px-3 !py-1.5 text-sm"
          onClick={() => {
            navigator.clipboard?.writeText(`${entry.title}\n\n${entry.content}`);
          }}
        >
          复制
        </button>
      </div>

      {/* AI 综合解读 */}
      <div className="rounded-lg border border-gold-500/20 bg-ink-900/40 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gold-300">
          <Sparkles className="h-4 w-4" />AI 综合解读
        </h3>
        <p className="mb-3 text-[11px] leading-relaxed text-paper-500">
          描述你梦中的细节（场景、人物、情绪），AI 会结合上方资料 + 心理学常识做综合解读。
        </p>
        <textarea
          className="input-xuan mb-3 min-h-[80px] w-full resize-y text-sm"
          placeholder="例：我梦见自己在一条黑漆漆的巷子里走，身后好像有人跟着，我很害怕……"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          disabled={aiStreaming}
        />
        <div className="flex gap-2">
          {!aiStreaming ? (
            <button type="button" onClick={startAi} className="btn-gold !px-4 !py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5" />开始 AI 解读
            </button>
          ) : (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="btn-ghost !px-4 !py-1.5 text-sm"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />停止
            </button>
          )}
          {aiContent && !aiStreaming && (
            <button
              type="button"
              onClick={() => {
                setAiContent("");
                setAiError("");
              }}
              className="btn-ghost !px-3 !py-1.5 text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />清空
            </button>
          )}
        </div>

        {aiError && <p className="mt-3 text-xs text-cinnabar-400">{aiError}</p>}

        {aiContent && (
          <div className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/60 p-4">
            <MarkdownLite text={aiContent} />
          </div>
        )}
      </div>
    </div>
  );
}