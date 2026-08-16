import { Link } from "react-router-dom";
import Title from "@/components/Title";
import { features } from "@/lib/config";
import Stagger from "@/components/motion/Stagger";
import CharsRise from "@/components/motion/CharsRise";

const MODULES = [
  { name: "六爻", href: "/zhanbu/liuyao", on: features.liuyao, desc: "纳甲筮法 · 三钱起卦 · 用神生克" },
  { name: "梅花易数", href: "/zhanbu/meihua", on: features.meihua, desc: "时间起卦 · 体用生克 · 互变参断" },
  { name: "奇门遁甲", href: "/zhanbu/qimen", on: features.qimen, desc: "九宫四盘 · 值符值使 · 格局应期" },
  { name: "大六壬", href: "/zhanbu/liuren", on: features.liuren, desc: "月将贵人 · 四课三传 · 十二天将" },
  { name: "太乙神数", href: "/zhanbu/taiyi", on: features.taiyi, desc: "太乙年计 · 十六神盘 · 主客定算" },
  { name: "皇极经世", href: "/zhanbu/huangji", on: features.huangji, desc: "元会运世 · 值年卦气 · 世运推演" },
  { name: "五运六气", href: "/zhanbu/wuyun", on: features.wuyun, desc: "中运司天 · 主客六气 · 岁气相临" },
  { name: "塔罗牌", href: "/zhanbu/tarot", on: features.tarot, desc: "韦特体系 · 多种牌阵 · 正逆位解读" },
  { name: "三山国王灵签", href: "/zhanbu/lingqian", on: features.lingqian, desc: "九十二签 · 祖庙传承 · 签诗断语" },
];

export const metadata = { title: "占卜" };

export default function ZhanbuPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <Title title="占卜" />
      <header className="mb-12 text-center">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // DIVINATION
        </div>
        <h1 className="title-ornament mb-3 justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="占卜" step={200} className="text-shimmer-gold" />
        </h1>
        <p className="anim-fade-up mt-3 text-sm leading-relaxed text-paper-300 sm:text-base" style={{ animationDelay: "0.4s" }}>
          一事一占，心诚则灵。选择占法，起课问卦。
        </p>
        <div className="anim-fade-up mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-paper-400" style={{ animationDelay: "520ms" }}>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            9 ORACLE ENGINES
          </span>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            NO GUARANTEE OUTPUT
          </span>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stagger step={90}>
          {MODULES.filter((m) => m.on).map((m) => (
            <Link key={m.href} to={m.href} className="panel-console hud-frame group h-full p-6 transition-transform hover:-translate-y-1">
              <h2 className="text-xl font-bold text-paper-50 group-hover:text-gold-300">{m.name}</h2>
              <p className="mt-2 text-xs text-paper-400">{m.desc}</p>
            </Link>
          ))}
        </Stagger>
      </div>
    </div>
  );
}
