import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, MessageSquareText, Settings as Cog } from "lucide-react";
import { siteConfig } from "@/lib/config";
import AiChatDock from "@/components/ai/AiChatDock";
import GanzhiClock from "@/components/layout/GanzhiClock";

const NAV_SECTIONS = [
  {
    code: "SYS.01",
    label: "排盘",
    items: [
      { to: "/paipan/bazi", label: "八字排盘" },
      { to: "/paipan/ziwei", label: "紫微斗数" },
      { to: "/paipan/astrolabe", label: "西洋星盘" },
      { to: "/paipan/qizheng", label: "七政四余" },
      { to: "/paipan/fengshui", label: "住宅风水" },
    ],
  },
  {
    code: "SYS.02",
    label: "合盘",
    items: [{ to: "/hepan", label: "双人合盘" }],
  },
  {
    code: "SYS.03",
    label: "占卜",
    items: [
      { to: "/zhanbu/liuyao", label: "六爻" },
      { to: "/zhanbu/meihua", label: "梅花易数" },
      { to: "/zhanbu/qimen", label: "奇门遁甲" },
      { to: "/zhanbu/liuren", label: "大六壬" },
      { to: "/zhanbu/taiyi", label: "太乙神数" },
      { to: "/zhanbu/huangji", label: "皇极经世" },
      { to: "/zhanbu/wuyun", label: "五运六气" },
      { to: "/zhanbu/tarot", label: "塔罗牌" },
      { to: "/zhanbu/lingqian", label: "灵签" },
    ],
  },
  {
    code: "SYS.04",
    label: "择日",
    items: [{ to: "/zeri", label: "黄历择日" }],
  },
  {
    code: "SYS.05",
    label: "运势",
    items: [{ to: "/kline", label: "人生K线" }],
  },
  {
    code: "SYS.06",
    label: "解梦",
    items: [{ to: "/dream", label: "周公解梦" }],
  },
  {
    code: "SYS.07",
    label: "起名",
    items: [{ to: "/naming", label: "起名 · 三才五格" }],
  },
  {
    code: "SYS.08",
    label: "系统",
    items: [{ to: "/settings", label: "设置中心" }],
  },
];

/** 控制台式布局：左侧导航列 + 顶栏 + 内容区 + 底部状态条 */
export default function ConsoleShell() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col">
      {/* Logo 区 */}
      <Link
        to="/"
        onClick={() => setMobileOpen(false)}
        className="group flex items-center gap-3 border-b border-gold-500/15 px-4 py-4"
      >
        <img src="/logo.svg" alt="明玄" className="h-10 w-10 rounded-xl transition-transform group-hover:scale-105" />
        <div>
          <div className="text-lg font-black tracking-widest text-gold-300">{siteConfig.name}</div>
          <div className="font-mono text-[9px] tracking-[0.25em] text-cyber-400/70">MINGXUAN CONSOLE</div>
        </div>
      </Link>

      {/* 导航区 */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.code} className="mb-4">
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <span className="font-mono text-[9px] tracking-[0.2em] text-cyber-500">{sec.code}</span>
              <span className="text-xs font-bold tracking-[0.3em] text-paper-300">{sec.label}</span>
              <span className="h-px flex-1 bg-gold-500/10" />
            </div>
            {sec.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group mb-0.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-all ${
                    isActive
                      ? "border-l-2 border-gold-400 bg-gold-500/12 font-bold text-gold-300"
                      : "border-l-2 border-transparent text-paper-400 hover:bg-ink-800 hover:text-paper-100"
                  }`
                }
              >
                <span className="font-mono text-[9px] text-cyber-500/60 transition-colors group-hover:text-cyber-400">▸</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* 底部时钟 */}
      <div className="border-t border-gold-500/15 px-4 py-3">
        <GanzhiClock />
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* 顶栏（移动端含菜单按钮） */}
      <header className="z-40 flex h-12 shrink-0 items-center justify-between border-b border-gold-500/15 bg-ink-950/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-paper-300 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-mono text-[10px] tracking-[0.3em] text-paper-500">
            {siteConfig.name} CONSOLE <span className="text-cyber-500">v1.0</span>
          </span>
          <span className="hidden font-mono text-[10px] text-paper-500/60 sm:inline">{pathname}</span>
        </div>
        <div className="flex items-center gap-3">
          <GanzhiClock compact />
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            title="AI 问盘"
            aria-label="AI 问盘"
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
              aiOpen
                ? "border-gold-500 bg-gold-500/15 text-gold-300"
                : "border-gold-500/30 text-gold-400 hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-300"
            }`}
          >
            <MessageSquareText className="h-4 w-4" />
          </button>
          <Link
            to="/settings"
            title="设置中心"
            aria-label="设置中心"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/30 text-gold-400 transition-all hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-300"
          >
            <Cog className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 桌面侧栏 */}
        <aside className="hidden w-52 shrink-0 border-r border-gold-500/15 bg-ink-900/40 lg:block">
          {nav}
        </aside>
        {/* 移动端抽屉 */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="anim-fade-right absolute left-0 top-0 h-full w-64 border-r border-gold-500/20 bg-ink-950">
              {nav}
            </aside>
          </div>
        )}

        {/* 内容区 */}
        <main className="hud-grid min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* AI 连续对话面板（桌面：右侧兄弟栏；移动：全屏抽屉） */}
        <AiChatDock open={aiOpen} onToggle={() => setAiOpen((v) => !v)} />
      </div>

      {/* 底部状态条 */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-gold-500/15 bg-ink-950/90 px-4 font-mono text-[10px] tracking-wider text-paper-500">
        <span>
          <span className="text-cyber-400">●</span> CORE ONLINE · 18 MODULES LOADED
        </span>
        <span>仅供传统文化研究与娱乐参考</span>
      </footer>
    </div>
  );
}
