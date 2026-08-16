/**
 * 明玄 · 设置中心
 *
 * 一个页面管理所有用户偏好：
 * - 命盘档案（CRUD、关系标签、设为默认）
 * - AI 大模型配置（通道、模型、模板风格、测试连接）
 * - 主题（明/暗/跟随系统）
 * - 字体（族 / 粗细 / 字号缩放）
 * - 周公解梦（启用 AI 解析、清空本地梦境资料库）
 * - 通用（减弱动效、清空对话、清空命盘等）
 */

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, User, Palette, Type, Brain, Moon, Trash2,
  RefreshCw, Check, Loader2, Download, Upload, Settings as Cog, MapPin,
} from "lucide-react";
import {
  AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings, FONT_PRESETS, COMMON_FONT_NAMES,
} from "@/lib/settings";
import {
  loadLocationConfig, saveLocationConfig, searchLocation,
  type LocationConfig, type LocationResult,
} from "@/lib/location";
import {
  loadProfiles, saveProfile, deleteProfile,
  profileSummary, type SavedProfile,
} from "@/lib/profiles";
import {
  AI_DEFAULTS, BUILTIN_MODELS, fetchAiModels, loadAiSettings,
  saveAiSettings, type AiSettings,
} from "@/lib/ai";

const SECTIONS = [
  { id: "profiles", label: "命盘档案", icon: User },
  { id: "ai", label: "AI 大模型", icon: Sparkles },
  { id: "aiTemplate", label: "解读模板", icon: Brain },
  { id: "dream", label: "解梦功能", icon: Moon },
  { id: "theme", label: "主题与外观", icon: Palette },
  { id: "font", label: "字体设置", icon: Type },
  { id: "location", label: "地点服务", icon: MapPin },
  { id: "general", label: "通用", icon: Cog },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function Settings() {
  const [active, setActive] = useState<SectionId>("profiles");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  function update(patch: Partial<AppSettings>) {
    const next = saveSettings(patch);
    setSettings(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="console-label mb-2 flex items-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // SETTINGS CENTER
        </div>
        <h1 className="console-title text-2xl">
          <span className="seq">SYS.99</span>设置中心
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          管理命盘档案、AI 大模型、外观与通用偏好。所有改动自动保存到本地。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* 侧栏 */}
        <nav className="panel-console hud-frame p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                active === s.id
                  ? "border-l-2 border-gold-400 bg-gold-500/12 font-bold text-gold-300"
                  : "border-l-2 border-transparent text-paper-400 hover:bg-ink-800 hover:text-paper-100"
              }`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* 内容区 */}
        <div className="space-y-6">
          {active === "profiles" && <ProfilesSection />}
          {active === "ai" && <AiSection />}
          {active === "aiTemplate" && <AiTemplateSection settings={settings} update={update} />}
          {active === "dream" && <DreamSection />}
          {active === "theme" && <ThemeSection settings={settings} update={update} />}
          {active === "font" && <FontSection settings={settings} update={update} />}
          {active === "location" && <LocationSection />}
          {active === "general" && <GeneralSection settings={settings} update={update} />}
        </div>
      </div>
    </div>
  );
}

// ============== 子区块 ==============

function SectionCard({
  title, desc, children,
}: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card-xuan p-5">
      <h2 className="mb-1 text-base font-bold text-gold-300">{title}</h2>
      {desc && <p className="mb-4 text-xs leading-relaxed text-paper-400">{desc}</p>}
      {!desc && <div className="mb-4" />}
      {children}
    </section>
  );
}

function ProfilesSection() {
  const [list, setList] = useState<SavedProfile[]>(loadProfiles());
  const [defaultId, setDefaultId] = useState<string>(() => loadSettings().preferredChartId);

  useEffect(() => {
    const onChange = () => {
      setList(loadProfiles());
      const cur = loadSettings().preferredChartId;
      setDefaultId(cur);
    };
    window.addEventListener("mx-profiles-changed", onChange);
    window.addEventListener("mx-settings-changed", onChange);
    return () => {
      window.removeEventListener("mx-profiles-changed", onChange);
      window.removeEventListener("mx-settings-changed", onChange);
    };
  }, []);

  function setDefault(id: string) {
    setDefaultId(id);
    saveSettings({ preferredChartId: id });
  }

  function remove(id: string) {
    if (!confirm("确认删除该命盘？此操作不可撤销。")) return;
    deleteProfile(id);
    if (defaultId === id) {
      saveSettings({ preferredChartId: "" });
    }
  }

  function rename(p: SavedProfile) {
    const next = prompt("重命名", p.label);
    if (next && next !== p.label) {
      saveProfile({ ...p, label: next.trim() });
    }
  }

  return (
    <SectionCard
      title="命盘档案"
      desc="保存出生信息后可一键载入到任意排盘/合盘页。Tauri 桌面端会持久化到应用数据目录，浏览器端退化为 localStorage。"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-paper-400">共 {list.length} 个档案</span>
        {defaultId && (
          <span className="hud-chip">默认：{list.find((p) => p.id === defaultId)?.label ?? "—"}</span>
        )}
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-6 text-center text-sm text-paper-400">
          暂无命盘档案。在任意排盘页填写出生信息后，点击「存为命盘」即可保存到这里。
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li
              key={p.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 transition-colors ${
                defaultId === p.id ? "border-gold-500/50 bg-gold-500/8" : "border-gold-500/15 bg-ink-900/40"
              }`}
            >
              <span className="rounded bg-gold-500/15 px-2 py-0.5 text-[10px] text-gold-400">{p.relation}</span>
              <span className="font-bold text-paper-100">{p.label}</span>
              <span className="text-xs text-paper-400">{profileSummary(p.profile)}</span>
              <span className="ml-auto flex gap-1">
                {defaultId !== p.id && (
                  <button type="button" onClick={() => setDefault(p.id)} className="btn-ghost !px-2 !py-1 text-xs">
                    设为默认
                  </button>
                )}
                {defaultId === p.id && (
                  <span className="flex items-center gap-1 rounded border border-gold-500/40 px-2 py-0.5 text-xs text-gold-300">
                    <Check className="h-3 w-3" />默认
                  </span>
                )}
                <button type="button" onClick={() => rename(p)} className="btn-ghost !px-2 !py-1 text-xs">
                  重命名
                </button>
                <button type="button" onClick={() => remove(p.id)} className="btn-ghost !px-2 !py-1 text-xs hover:!border-cinnabar-500 hover:!text-cinnabar-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-lg border border-gold-500/15 p-3 text-xs leading-relaxed text-paper-500">
        <p>💡 提示：命盘档案供八字、紫微、合盘等所有排盘页快速调用；「默认命盘」会被设为新建排盘的初始值。</p>
      </div>
    </SectionCard>
  );
}

function AiSection() {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings());
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<"ok" | "fail" | "">("");

  function update(patch: Partial<AiSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  async function test() {
    setTesting(true);
    setResult("");
    try {
      const list = await fetchAiModels(settings);
      setModels(list);
      setResult("ok");
      if (settings.mode === "custom" && list.length > 0 && !list.includes(settings.model)) {
        update({ model: list[0] });
      }
    } catch {
      setResult("fail");
    } finally {
      setTesting(false);
    }
  }

  function save() {
    saveAiSettings(settings);
    window.dispatchEvent(new CustomEvent("mx-ai-settings-changed"));
    alert("已保存");
  }

  return (
    <SectionCard
      title="AI 大模型配置"
      desc="默认「内置直连」由 Tauri Rust 后端 HMAC 签名直连 Cherry 上游，无需 API Key；也可切换自定义 OpenAI 兼容服务。"
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => update({ mode: "builtin" })}
          className={`tab-chip text-center text-sm ${settings.mode === "builtin" ? "is-active" : ""}`}
        >
          内置直连（推荐）
        </button>
        <button
          type="button"
          onClick={() => update({ mode: "custom" })}
          className={`tab-chip text-center text-sm ${settings.mode === "custom" ? "is-active" : ""}`}
        >
          自定义服务
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {settings.mode === "builtin" ? (
          <>
            <div className="rounded-lg border border-jade-500/25 bg-jade-500/8 p-3 text-[11px] leading-relaxed text-paper-300">
              内置 AI 通道已就绪：由本地 Rust 后端加密直连，无需 API Key、无需启动任何服务，开箱即用。
            </div>
            <label className="block">
              <span className="console-label mb-1 block">模型</span>
              <select
                className="input-xuan w-full"
                value={settings.builtinModel}
                onChange={(e) => update({ builtinModel: e.target.value })}
              >
                {(models.length > 0 ? models : BUILTIN_MODELS).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className="console-label mb-1 block">服务地址（OpenAI 兼容）</span>
              <input
                className="input-xuan w-full font-mono text-sm"
                value={settings.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder="http://localhost:8000"
              />
            </label>
            <label className="block">
              <span className="console-label mb-1 block">API Key（可留空）</span>
              <input
                type="password"
                className="input-xuan w-full font-mono text-sm"
                value={settings.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </label>
            <div>
              <span className="console-label mb-1 block">模型</span>
              {models.length > 0 ? (
                <select
                  className="input-xuan w-full"
                  value={settings.model}
                  onChange={(e) => update({ model: e.target.value })}
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input-xuan w-full font-mono text-sm"
                  value={settings.model}
                  onChange={(e) => update({ model: e.target.value })}
                  placeholder="qwen-8b"
                />
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={test} disabled={testing} className="btn-ghost !px-3 text-sm">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            测试连接
          </button>
          {result === "ok" && (
            <span className="flex items-center gap-1 text-xs text-jade-400">
              <Check className="h-3.5 w-3.5" />通道正常
            </span>
          )}
          {result === "fail" && (
            <span className="text-xs text-cinnabar-400">
              连接失败{settings.mode === "builtin" ? "——请检查网络" : "——请确认服务已启动"}
            </span>
          )}
          <button type="button" onClick={save} className="btn-gold ml-auto !px-5 text-sm">保存</button>
        </div>

        <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
          解读请求仅包含排盘数据，不含任何个人身份信息；命盘数据存储在本地设备，不上传云端。
        </p>
      </div>
    </SectionCard>
  );
}

function AiTemplateSection({
  settings, update,
}: { settings: AppSettings; update: (p: Partial<AppSettings>) => void }) {
  const TEMPLATES = [
    { id: "concise", label: "极简版", desc: "一句话总览 + 三条要点 + 一句建议。150 字内，适合快问快答。" },
    { id: "standard", label: "标准版（推荐）", desc: "总览 / 性格 / 事业 / 感情 / 健康 / 近期 六大板块，400–700 字。" },
    { id: "detailed", label: "详尽版", desc: "六大板块 + 三条具体行动建议，800–1500 字。" },
    { id: "classical", label: "文言版", desc: "半文半白、四字对仗，文言之美又不失可读性。500–900 字。" },
  ] as const;

  return (
    <SectionCard
      title="AI 解读模板"
      desc="所有 AI 解读页（八字、紫微、六爻等）会按所选风格生成固定结构。Markdown 输出会自动用富样式渲染。"
    >
      <div className="space-y-2">
        {TEMPLATES.map((t) => (
          <label
            key={t.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              settings.aiTemplate === t.id
                ? "border-gold-500/60 bg-gold-500/8"
                : "border-gold-500/15 bg-ink-900/40 hover:border-gold-500/30"
            }`}
          >
            <input
              type="radio"
              name="aiTemplate"
              className="mt-1 accent-gold-500"
              checked={settings.aiTemplate === t.id}
              onChange={() => update({ aiTemplate: t.id })}
            />
            <div>
              <div className="font-bold text-paper-100">{t.label}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-paper-400">{t.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={settings.markdownEnhanced}
          onChange={(e) => update({ markdownEnhanced: e.target.checked })}
          className="accent-gold-500"
        />
        启用 Markdown 富样式渲染（标题小圆点、引用朱线、表格金边）
      </label>
    </SectionCard>
  );
}

function DreamSection() {
  const [enabled, setEnabled] = useState(() => loadSettings().dreamAiParse);
  const [stats, setStats] = useState({ total: 0, lastUpdate: 0 });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setEnabled(loadSettings().dreamAiParse);
      try {
        const { dbStats } = await import("@/lib/dream");
        setStats(dbStats());
      } catch { /* ignore */ }
    };
    refresh();
    const onChange = () => refresh();
    window.addEventListener("mx-settings-changed", onChange);
    window.addEventListener("mx-dream-changed", onChange);
    return () => {
      window.removeEventListener("mx-settings-changed", onChange);
      window.removeEventListener("mx-dream-changed", onChange);
    };
  }, []);

  function toggle(v: boolean) {
    setEnabled(v);
    saveSettings({ dreamAiParse: v });
  }

  function clearDreamDb() {
    if (!confirm("清空本地周公解梦资料库？此操作不可撤销。")) return;
    setClearing(true);
    try {
      localStorage.removeItem("mingxuan.dream.db");
      localStorage.removeItem("mingxuan.dream.history");
      window.dispatchEvent(new CustomEvent("mx-dream-changed"));
    } finally {
      setClearing(false);
      alert("已清空。");
    }
  }

  return (
    <SectionCard
      title="周公解梦"
      desc="支持自然语言描述梦境（如「梦见自己飞起来」）、AI 智能解析、关键字检索本地资料库。"
    >
      <label className="flex items-center gap-2 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="accent-gold-500"
        />
        启用 AI 解析（结合本地资料 + 大模型做综合解读）
      </label>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
        <div className="text-xs text-paper-400">
          本地资料库：<b className="text-gold-300">{stats.total}</b> 条 · 最近更新：{stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : "从未"}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => location.assign("#/dream")}>
            打开解梦
          </button>
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs hover:!border-cinnabar-500 hover:!text-cinnabar-400" onClick={clearDreamDb} disabled={clearing}>
            <Trash2 className="h-3 w-3" />清空资料
          </button>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
        提示：首次进入「周公解梦」页时会自动从 jiemeng.net 拉取条目入库（爬取仅在 Tauri/服务端执行；浏览器端可手动导入 JSON）。
      </p>
    </SectionCard>
  );
}

function ThemeSection({
  settings, update,
}: { settings: AppSettings; update: (p: Partial<AppSettings>) => void }) {
  return (
    <SectionCard
      title="主题与外观"
      desc="明玄支持三种主题模式。浅色主题切换宣纸底色，更适合长时间阅读。"
    >
      <div className="grid grid-cols-3 gap-2">
        {(["dark", "light", "system"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => update({ themeMode: m })}
            className={`tab-chip text-center ${settings.themeMode === m ? "is-active" : ""}`}
          >
            {m === "dark" ? "深邃墨色" : m === "light" ? "素雅宣纸" : "跟随系统"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-paper-300">
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-1">当前主题</div>
          <div className="text-base font-bold text-gold-300">
            {settings.themeMode === "dark" ? "深邃墨色" : settings.themeMode === "light" ? "素雅宣纸" : "跟随系统"}
          </div>
        </div>
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-1">当前字体</div>
          <div className="text-base font-bold text-gold-300">
            {settings.fontFamily === "custom" ? settings.customFontName || "自定义" : (FONT_PRESETS.find((f) => f.id === settings.fontFamily)?.label ?? "宋体")}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function FontSection({
  settings, update,
}: { settings: AppSettings; update: (p: Partial<AppSettings>) => void }) {
  const [customDraft, setCustomDraft] = useState(settings.customFontName);
  useEffect(() => setCustomDraft(settings.customFontName), [settings.customFontName]);

  const allFonts = useMemo(() => {
    const set = new Set<string>(COMMON_FONT_NAMES);
    return Array.from(set);
  }, []);

  return (
    <SectionCard
      title="字体设置"
      desc="支持任意系统已安装字体。下拉选择预设，或在「自定义字体」中输入任意字体名（按系统已安装为准）。已开启字体平滑与抗锯齿。"
    >
      <div className="space-y-4">
        <div>
          <div className="console-label mb-2">FONT · 字体族</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {FONT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update({ fontFamily: p.id })}
                className={`tab-chip text-center text-sm ${settings.fontFamily === p.id ? "is-active" : ""}`}
                style={{ fontFamily: p.stack }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => update({ fontFamily: "custom" })}
              className={`tab-chip text-center text-sm ${settings.fontFamily === "custom" ? "is-active" : ""}`}
            >
              自定义…
            </button>
          </div>
        </div>

        {settings.fontFamily === "custom" ? (
          <div className="rounded-lg border border-gold-500/20 bg-ink-900/40 p-3">
            <div className="console-label mb-2">CUSTOM · 自定义字体名</div>
            <div className="flex gap-2">
              <input
                list="mx-common-fonts"
                className="input-xuan w-full"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="例：Microsoft YaHei / 思源黑体 / Verdana"
              />
              <button
                type="button"
                className="btn-gold !px-3 text-sm shrink-0"
                onClick={() => update({ customFontName: customDraft.trim() })}
              >
                应用
              </button>
            </div>
            <datalist id="mx-common-fonts">
              {allFonts.map((f) => <option key={f} value={f} />)}
            </datalist>
            <p className="mt-2 text-[11px] leading-relaxed text-paper-500">
              输入系统已安装的任意字体名（如 Windows 的 <b>Microsoft YaHei</b>、
              Mac 的 <b>PingFang SC</b>、Linux 的 <b>WenQuanYi Zen Hei</b>，或
              自己安装的设计字体）。应用后下方预览立即生效。
            </p>
          </div>
        ) : null}

        <div>
          <div className="console-label mb-2">WEIGHT · 字重</div>
          <div className="grid grid-cols-3 gap-2">
            {(["normal", "medium", "bold"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => update({ fontWeight: w })}
                className={`tab-chip text-center ${settings.fontWeight === w ? "is-active" : ""}`}
              >
                {w === "normal" ? "标准 400" : w === "medium" ? "中等 550" : "粗体 700"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="console-label mb-2">SIZE · 字号缩放（{settings.fontScale.toFixed(2)}×）</div>
          <input
            type="range"
            min={0.9}
            max={1.25}
            step={0.05}
            value={settings.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })}
            className="w-full accent-gold-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-paper-500">
            <span>0.90</span><span>1.00</span><span>1.25</span>
          </div>
        </div>

        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-4">
          <p
            className="leading-relaxed text-paper-200"
            style={{
              fontWeight: settings.fontWeight === "bold" ? 700 : settings.fontWeight === "medium" ? 550 : 400,
              fontSize: "1.05em",
            }}
          >
            天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。寒来暑往，秋收冬藏。
            <br />
            <span className="text-gold-300">The quick brown fox jumps over the lazy dog.</span>
            <br />
            <span className="text-cyber-300 font-mono">0123456789 · 子丑寅卯辰巳午未申酉戌亥</span>
          </p>
          <p className="mt-2 text-xs text-paper-500">
            预览：中英文 / 干支 / 数字 / 标点。修改任一项后，渲染立即更新。
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function GeneralSection({
  settings, update,
}: { settings: AppSettings; update: (p: Partial<AppSettings>) => void }) {
  function clearChat() {
    if (!confirm("清空全部 AI 对话历史？")) return;
    localStorage.removeItem("mingxuan.ai.chat");
    alert("已清空。");
  }

  function exportAll() {
    const dump: Record<string, unknown> = {
      version: 1,
      exportedAt: Date.now(),
      settings: loadSettings(),
      ai: loadAiSettings(),
      profiles: loadProfiles(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mingxuan-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importAll(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.settings) saveSettings(data.settings);
        if (data.ai) saveAiSettings(data.ai);
        if (Array.isArray(data.profiles)) {
          localStorage.setItem("mingxuan.profiles", JSON.stringify(data.profiles));
          window.dispatchEvent(new CustomEvent("mx-profiles-changed"));
        }
        alert("已导入。");
      } catch (e) {
        alert(`导入失败：${(e as Error).message}`);
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm("恢复全部设置为默认值？命盘档案与 AI 对话历史不会被清除。")) return;
    saveSettings(DEFAULT_SETTINGS);
    saveAiSettings(AI_DEFAULTS);
    alert("已恢复默认。");
  }

  return (
    <SectionCard
      title="通用"
      desc="减弱动效偏好、备份与恢复、对话清理。"
    >
      <label className="flex items-center gap-2 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(e) => update({ reduceMotion: e.target.checked })}
          className="accent-gold-500"
        />
        减弱动效（关闭扫描线、闪烁、光晕呼吸等装饰动画）
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !px-3 text-sm" onClick={exportAll}>
          <Download className="h-4 w-4" />导出备份
        </button>
        <label className="btn-ghost !px-3 text-sm cursor-pointer">
          <Upload className="h-4 w-4" />导入备份
          <input type="file" accept="application/json" className="hidden" onChange={importAll} />
        </label>
        <button type="button" className="btn-ghost !px-3 text-sm" onClick={clearChat}>
          <Trash2 className="h-4 w-4" />清空 AI 对话
        </button>
        <button type="button" className="btn-ghost !px-3 text-sm hover:!border-cinnabar-500 hover:!text-cinnabar-400" onClick={resetAll}>
          <RefreshCw className="h-4 w-4" />恢复默认设置
        </button>
      </div>

      <p className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
        明玄 1.0 · 设置中心版本 1 · 全部数据仅存储于本地设备。
      </p>
    </SectionCard>
  );
}

function LocationSection() {
  const [cfg, setCfg] = useState<LocationConfig>(loadLocationConfig());
  const [draft, setDraft] = useState<LocationConfig>(cfg);
  const [testQ, setTestQ] = useState("北京");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [error, setError] = useState("");

  function update(patch: Partial<LocationConfig>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function save() {
    saveLocationConfig(draft);
    setCfg(draft);
    alert("已保存。");
  }

  async function runTest() {
    setTesting(true);
    setError("");
    try {
      const r = await searchLocation(testQ);
      setResults(r);
      if (!r.length) setError("无结果。可检查 Key 是否正确 / 网络是否可达。");
    } catch (e) {
      setError(`调用失败：${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <SectionCard
      title="地点服务（经纬度自动查询）"
      desc="配置地图服务后，出生档案输入地点即可自动填经度（替代手动填写）。API Key 仅存本地；请求经 Rust 后端转发，不在浏览器暴露。"
    >
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "local", label: "本地库（无需 Key）" },
          { id: "amap", label: "高德地图" },
          { id: "baidu", label: "百度地图" },
        ] as const).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => update({ provider: p.id })}
            className={`tab-chip text-center text-sm ${draft.provider === p.id ? "is-active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {draft.provider !== "local" && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="console-label mb-1 block">API Key</span>
            <input
              className="input-xuan w-full font-mono text-sm"
              value={draft.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder={draft.provider === "amap" ? "高德 Web 端 JS API Key" : "百度 LBS 云 AK"}
            />
          </label>
          <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
            {draft.provider === "amap" ? (
              <>高德申请：<b>lbs.amap.com/dev/key/app</b>，创建「Web 端 / JS API」类型 Key。</>
            ) : (
              <>百度申请：<b>lbsyun.baidu.com/apiconsole/key</b>，勾选「Place 检索」与「逆地理编码」。</>
            )}
            <br />
            Key 仅存储于本地设备，请求通过 Rust 后端转发（<code className="rounded bg-ink-800 px-1">location_lookup</code> 命令），前端代码不暴露。
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-gold !px-3 text-sm" onClick={save}>保存</button>
        <input
          className="input-xuan flex-1"
          placeholder="测试关键词，如 北京 / 上海浦东"
          value={testQ}
          onChange={(e) => setTestQ(e.target.value)}
        />
        <button type="button" className="btn-ghost !px-3 text-sm" onClick={runTest} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "测试搜索"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-cinnabar-400">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-2">命中 {results.length} 条</div>
          <ul className="space-y-1.5">
            {results.slice(0, 6).map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs">
                <span className="text-paper-100">{r.name}</span>
                <span className="font-mono text-paper-400">
                  {r.longitude.toFixed(4)}, {r.latitude.toFixed(4)} · {r.source}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}