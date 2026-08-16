import { Link } from "react-router-dom";
import Title from "@/components/Title";
import { features } from "@/lib/config";
import Stagger from "@/components/motion/Stagger";
import CharsRise from "@/components/motion/CharsRise";

const MODULES = [
  { name: "八字排盘", href: "/paipan/bazi", on: features.bazi, desc: "四柱十神 · 大运流年 · 神煞纳音 · 格局用神", tag: "子平" },
  { name: "紫微斗数", href: "/paipan/ziwei", on: features.ziwei, desc: "十二宫位 · 星曜四化 · 大限流年", tag: "斗数" },
  { name: "西洋星盘", href: "/paipan/astrolabe", on: features.astrolabe, desc: "行星宫位 · 相位行运 · 太阳返照", tag: "占星" },
  { name: "七政四余", href: "/paipan/qizheng", on: features.qizheng, desc: "十一星曜 · 二十八宿 · 星命合参", tag: "星命" },
  { name: "住宅风水", href: "/paipan/fengshui", on: features.fengshui, desc: "八宅命卦 · 玄空飞星 · 方位吉凶", tag: "堪舆" },
];

export const metadata = { title: "排盘" };

export default function PaipanPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <Title title="排盘" />
      <header className="mb-12 text-center sm:mb-14">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // PAIPAN
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="排盘" step={200} className="text-shimmer-gold" />
        </h1>
        <p className="anim-fade-up mt-3 text-sm leading-relaxed text-paper-300 sm:text-base" style={{ animationDelay: "0.4s" }}>
          出生时刻，天人合一。选择术数体系，生成你的本命盘。
        </p>
        <div className="anim-fade-up mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-paper-400" style={{ animationDelay: "520ms" }}>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            5 ENGINES READY
          </span>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            FACTS-ONLY OUTPUT
          </span>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stagger step={110}>
          {MODULES.filter((m) => m.on).map((m, i) => (
            <Link
              key={m.href}
              to={m.href}
              className="panel-console group relative h-full p-6 pl-9 transition-transform hover:-translate-y-1"
            >
              <span className="console-label absolute left-3 top-3">
                MOD.{String(i + 1).padStart(2, "0")}
              </span>
              <span className="console-value absolute right-3 top-3 rounded border border-gold-500/30 px-2 py-0.5 text-[10px] tracking-widest transition-colors group-hover:border-cyber-400/50">
                {m.tag}
              </span>
              <h2 className="mt-4 text-xl font-bold text-paper-50 group-hover:text-gold-300">
                {m.name}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-paper-400">{m.desc}</p>
            </Link>
          ))}
        </Stagger>
      </div>
    </div>
  );
}