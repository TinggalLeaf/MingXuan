import { Link } from "react-router-dom";
import Title from "@/components/Title";
import { features, siteConfig } from "@/lib/config";
import Reveal from "@/components/motion/Reveal";
import Stagger from "@/components/motion/Stagger";
import CharsRise from "@/components/motion/CharsRise";
import Starfield from "@/components/motion/Starfield";

const SECTIONS = [
  {
    href: "/paipan",
    name: "排盘",
    desc: "八字四柱 · 紫微斗数 · 西洋星盘 · 七政四余 · 住宅风水",
    seal: "排",
  },
  {
    href: "/hepan",
    name: "合盘",
    desc: "八字合婚 · 星盘合盘 · 双人缘分合参",
    seal: "合",
  },
  {
    href: "/zhanbu",
    name: "占卜",
    desc: "六爻 · 梅花易数 · 奇门遁甲 · 大六壬 · 太乙神数 · 塔罗 · 灵签",
    seal: "占",
  },
  {
    href: "/zeri",
    name: "择日",
    desc: "黄历宜忌 · 婚嫁乔迁 · 开市动土 · 吉日遴选",
    seal: "择",
  },
];

const MODULES: { name: string; href: string; on: boolean; tag: string }[] = [
  { name: "八字排盘", href: "/paipan/bazi", on: features.bazi, tag: "子平" },
  { name: "紫微斗数", href: "/paipan/ziwei", on: features.ziwei, tag: "斗数" },
  { name: "西洋星盘", href: "/paipan/astrolabe", on: features.astrolabe, tag: "占星" },
  { name: "七政四余", href: "/paipan/qizheng", on: features.qizheng, tag: "星命" },
  { name: "住宅风水", href: "/paipan/fengshui", on: features.fengshui, tag: "堪舆" },
  { name: "人生K线", href: "/kline", on: features.kline, tag: "独创" },
  { name: "八字合盘", href: "/hepan", on: features.hepan, tag: "合婚" },
  { name: "六爻", href: "/zhanbu/liuyao", on: features.liuyao, tag: "纳甲" },
  { name: "梅花易数", href: "/zhanbu/meihua", on: features.meihua, tag: "象数" },
  { name: "奇门遁甲", href: "/zhanbu/qimen", on: features.qimen, tag: "三式" },
  { name: "大六壬", href: "/zhanbu/liuren", on: features.liuren, tag: "三式" },
  { name: "太乙神数", href: "/zhanbu/taiyi", on: features.taiyi, tag: "三式" },
  { name: "皇极经世", href: "/zhanbu/huangji", on: features.huangji, tag: "元会" },
  { name: "五运六气", href: "/zhanbu/wuyun", on: features.wuyun, tag: "运气" },
  { name: "塔罗牌", href: "/zhanbu/tarot", on: features.tarot, tag: "西占" },
  { name: "三山国王灵签", href: "/zhanbu/lingqian", on: features.lingqian, tag: "签诗" },
  { name: "黄历择日", href: "/zeri", on: features.zeri, tag: "通书" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Title />
      {/* Hero */}
      <section className="relative flex flex-col items-center overflow-hidden py-20 text-center sm:py-28">
        <Starfield />
        {/* 悬浮祥云 */}
        <div className="anim-float-x pointer-events-none absolute left-[6%] top-16 -z-10 h-24 w-52 rounded-full bg-gold-500/6 blur-2xl" />
        <div
          className="anim-float pointer-events-none absolute right-[8%] top-40 -z-10 h-28 w-60 rounded-full bg-cinnabar-500/6 blur-2xl"
          style={{ animationDelay: "1.2s" }}
        />

        <p className="anim-fade-down console-label mb-5 flex items-center gap-2 text-gold-500">
          <span className="hud-dot" />
          MINGXUAN // CONSOLE
        </p>
        <h1 className="text-5xl font-black tracking-wide sm:text-7xl">
          <CharsRise text={siteConfig.name} step={260} className="text-shimmer-gold" />
        </h1>
        <p className="anim-fade-up mt-6 max-w-xl text-sm leading-relaxed text-paper-300 sm:text-base" style={{ animationDelay: "0.55s" }}>
          汇子平八字、紫微斗数、奇门六壬、太乙皇极、星盘塔罗于一炉；
          独创人生百年运势 K 线，以金融之眼观命理起伏，于阴阳消长间见人生转折。
        </p>
        <div className="anim-fade-up mt-10 flex flex-wrap justify-center gap-4" style={{ animationDelay: "0.8s" }}>
          <Link to="/paipan/bazi" className="btn-gold anim-glow">
            立即排盘
          </Link>
          <Link to="/kline" className="btn-ghost">
            人生 K 线
          </Link>
        </div>
        <div className="anim-seal mt-12" style={{ animationDelay: "1.05s" }}>
          <span className="seal h-16 w-16 text-3xl">{siteConfig.name.slice(0, 1)}</span>
        </div>

        {/* 系统状态行 */}
        <div
          className="anim-fade-up mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          style={{ animationDelay: "1.2s" }}
        >
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            MINGXUAN CONSOLE v1.0
          </span>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            17 MODULES ONLINE
          </span>
          <span className="console-label hidden items-center gap-2 sm:flex">
            <span className="hud-dot" />
            GANZHI CLOCK SYNCED
          </span>
        </div>
      </section>

      {/* 四大分区 */}
      <section className="grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        <Stagger step={120}>
          {SECTIONS.map((s, i) => (
            <Link
              key={s.href}
              to={s.href}
              className="panel-console hud-frame group relative flex h-full flex-col items-center gap-4 p-8 text-center transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="console-label absolute left-3 top-3">
                SYS.{String(i + 1).padStart(2, "0")}
              </span>
              <span className="console-label absolute right-3 top-3 flex items-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="hud-dot" />
                READY
              </span>
              <span className="seal mt-3 h-14 w-14 text-2xl transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                {s.seal}
              </span>
              <h2 className="text-2xl font-bold tracking-widest text-gold-300">{s.name}</h2>
              <p className="text-xs leading-relaxed text-paper-400">{s.desc}</p>
            </Link>
          ))}
        </Stagger>
      </section>

      {/* 全部能力 */}
      <section className="pb-24">
        <Reveal variant="scale">
          <h2 className="console-title mb-10 justify-center text-2xl">
            <span className="seq">IDX</span>十七般术数
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stagger step={55}>
            {MODULES.filter((m) => m.on).map((m, i) => (
              <Link
                key={m.name}
                to={m.href}
                className="panel-console hud-frame group relative flex items-center justify-between px-5 py-4 pl-9 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span className="console-label absolute left-2.5 top-1/2 -translate-y-1/2 opacity-60 transition-opacity group-hover:opacity-100">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-bold text-paper-100 transition-colors group-hover:text-gold-300">
                  {m.name}
                </span>
                <span className="console-value rounded border border-gold-500/30 px-2 py-0.5 text-[10px] tracking-widest transition-colors group-hover:border-cyber-400/50">
                  {m.tag}
                </span>
              </Link>
            ))}
          </Stagger>
        </div>
      </section>
    </div>
  );
}
