
import type { BaziChartResult } from "mingyu-core/bazi";
import { charWuxingClass, ganYinYang } from "@/lib/wuxing";
import TermTip from "@/components/common/TermTip";

interface DayMasterPanelProps {
  chart: BaziChartResult;
}

export default function DayMasterPanel({ chart }: DayMasterPanelProps) {
  const dm = chart.dayMaster;
  const strength = chart.analysis?.dayMasterStrength;
  const pattern = chart.analysis?.mingGe;
  const useful = chart.analysis?.usefulGod;

  const yy = ganYinYang(dm.gan) ?? "—";
  const wxClass = charWuxingClass(dm.gan);

  return (
    <section className="panel-console hud-frame anim-fade-up p-4 sm:p-6">
      <h2 className="console-title mb-4 text-base">
        <span className="seq">03</span>日主 · 格局 · 用神
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="anim-fade-up rounded-xl border border-gold-500/20 bg-ink-900/40 p-4 text-center" style={{ animationDelay: "120ms" }}>
          <div className="console-label mb-2">日主（命主）</div>
          <div className={`gz-char anim-pop ${wxClass}`} style={{ animationDelay: "280ms" }}>{dm.gan}</div>
          <div className="mt-1 text-sm text-paper-200">
            <span className="console-value">{dm.element}</span> · {yy}
          </div>
          <div className="mt-0.5 text-[11px] text-paper-400">
            日柱 <span className="console-value">{chart.pillars.day.ganZhi}</span>
          </div>
        </div>

        <div className="anim-fade-up rounded-xl border border-gold-500/20 bg-ink-900/40 p-4" style={{ animationDelay: "240ms" }}>
          <div className="console-label mb-2">旺衰</div>
          <div className="text-base font-bold text-gold-300">
            {strength?.status ?? "—"}
          </div>
          {strength?.details && (
            <ul className="mt-2 space-y-1 text-[11px] text-paper-300">
              <li>月令：{strength.details.timely ? "得令" : "失令"} · {strength.details.seasonalEffect}</li>
              <li>月将：{strength.details.commanderEffect}</li>
              <li>格局：{strength.details.formationEffect}</li>
              <li>有根：{strength.details.hasStrongRoot ? "强根" : strength.details.hasRoot ? "有根" : "无根"}</li>
              <li>帮扶：{strength.details.hasSupport ? "有" : "无"}</li>
              <li>克泄：{strength.details.hasConstraint ? "有" : "无"}</li>
            </ul>
          )}
        </div>

        <div className="anim-fade-up rounded-xl border border-gold-500/20 bg-ink-900/40 p-4" style={{ animationDelay: "360ms" }}>
          <div className="console-label mb-2">格局</div>
          <div className="text-base font-bold text-paper-100">
            {pattern?.pattern ?? "—"}
          </div>
          {pattern?.basis && (
            <div className="mt-1 text-[11px] text-paper-300">{pattern.basis}</div>
          )}
          <div className="mt-3 console-label">用神</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(useful?.useful ?? "—").split(/[、，]/).filter(Boolean).map((u, uIdx) => (
              <TermTip key={`u-${u}`} term={u} className="anim-pop rounded border border-jade-400/40 bg-jade-500/15 px-2 py-0.5 text-xs text-jade-400" style={{ animationDelay: `${480 + uIdx * 70}ms` }} />
            ))}
          </div>
          <div className="mt-2 console-label">忌神</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(useful?.avoid ?? "—").split(/[、，]/).filter(Boolean).map((u, uIdx) => (
              <TermTip key={`a-${u}`} term={u} className="anim-pop rounded border border-cinnabar-500/40 bg-cinnabar-500/15 px-2 py-0.5 text-xs text-cinnabar-400" style={{ animationDelay: `${560 + uIdx * 70}ms` }} />
            ))}
          </div>
        </div>
      </div>

      {/* 白话注释：旺衰 / 格局 / 用神 三概念的通俗说明 */}
      <div className="anim-fade-up mt-3 rounded-lg border border-cyber-500/20 bg-ink-900/30 px-3 py-2.5 text-[11px] leading-relaxed text-paper-300" style={{ animationDelay: "200ms" }}>
        <span className="inline-flex items-center gap-1.5 console-label text-cyber-300">
          <span className="hud-dot" />
          白话注解
        </span>
        <p className="mt-1">
          <span className="text-gold-400">旺衰</span>：日主（代表自己）在整个命局中的强弱。
          得令、有根、有帮扶则偏强；失令、无根、多克泄则偏弱。身强宜泄宜克，身弱宜生宜扶。
        </p>
        <p className="mt-1">
          <span className="text-gold-400">格局</span>：命局组合的整体形态，决定命主行事的主要方式与倾向。
        </p>
        <p className="mt-1">
          <span className="text-gold-400">用神</span>：最能平衡命局、对日主最有益的五行或十神，是判断喜忌的核心；
          相对的<span className="text-cinnabar-400">忌神</span>则是加剧失衡、宜避开的五行。
        </p>
      </div>

      {useful?.primaryReason && (
        <p className="mt-3 rounded-lg border border-gold-500/10 bg-ink-900/30 px-3 py-2 text-[11px] leading-relaxed text-paper-300">
          <span className="console-label mr-2 text-gold-400">取用思路</span>
          {useful.primaryReason}
        </p>
      )}

      {(useful?.favorableWuxing?.length ?? 0) > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
          <div className="rounded border border-jade-400/30 bg-jade-500/10 p-2">
            <div className="console-label">喜用五行</div>
            <div className="mt-0.5 text-jade-400">{(useful?.favorableWuxing ?? []).join(" ")}</div>
          </div>
          <div className="rounded border border-cinnabar-500/30 bg-cinnabar-500/10 p-2">
            <div className="console-label">忌讳五行</div>
            <div className="mt-0.5 text-cinnabar-400">{(useful?.unfavorableWuxing ?? []).join(" ") || "—"}</div>
          </div>
          <div className="rounded border border-gold-500/20 bg-ink-900/40 p-2">
            <div className="console-label">首选用神</div>
            <div className="mt-0.5 console-value text-gold-300">{useful?.primaryUseful ?? "—"}</div>
          </div>
          <div className="rounded border border-gold-500/20 bg-ink-900/40 p-2">
            <div className="console-label">首要忌神</div>
            <div className="mt-0.5 text-cinnabar-400">{useful?.primaryAvoid ?? "—"}</div>
          </div>
        </div>
      )}
    </section>
  );
}