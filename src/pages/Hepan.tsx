import Title from "@/components/Title";
import { useEffect, useMemo, useState } from "react";
import type {
  AstrolabeData,
  BirthProfile,
  AstrolabeSynastryData,
} from "mingyu-core";
import type { BaziChartResult } from "mingyu-core/bazi";
import { birthProfileToAstrolabeInput, calculateBaziFromBirthProfile } from "mingyu-core";
import { analyzeBaziCompatibility } from "mingyu-core/bazi";
import { generateAstrolabe } from "mingyu-core/divination/astrolabe";
import { analyzeAstrolabeSynastry } from "mingyu-core/divination/astrolabe-synastry";
import BirthForm from "@/components/birth/BirthForm";
import HepanLocationFields from "@/components/hepan/LocationFields";
import Reveal from "@/components/motion/Reveal";
import CharsRise from "@/components/motion/CharsRise";
import AiInterpret from "@/components/ai/AiInterpret";
import {
  BRANCH_SIX_CLASHES,
  BRANCH_SIX_HARMS,
  BRANCH_SIX_COMBOS,
  STEM_FIVE_COMBOS,
  lookupNayin,
  stemFiveComboOf,
  branchSixComboOf,
  branchClashOf,
  branchHarmOf,
  zodiacOf,
} from "@/components/hepan/hepan-helpers";
import { charWuXing, type WuXing } from "@/lib/wuxing";

type Tab = "bazi" | "astrolabe";

interface PersonBundle {
  label: "甲" | "乙";
  name: string;
  profile: BirthProfile;
  bazi?: BaziChartResult;
  astrolabe?: AstrolabeData;
}

const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;
type PillarKey = (typeof PILLAR_KEYS)[number];

const PILLAR_LABEL: Record<PillarKey, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
};

const WX_COLOR: Record<WuXing, string> = {
  木: "text-[color:var(--color-wuxing-mu)]",
  火: "text-[color:var(--color-wuxing-huo)]",
  土: "text-[color:var(--color-wuxing-tu)]",
  金: "text-[color:var(--color-wuxing-jin)]",
  水: "text-[color:var(--color-wuxing-shui)]",
};

const WX_BG: Record<WuXing, string> = {
  木: "bg-[color:var(--color-wuxing-mu)]/15",
  火: "bg-[color:var(--color-wuxing-huo)]/15",
  土: "bg-[color:var(--color-wuxing-tu)]/15",
  金: "bg-[color:var(--color-wuxing-jin)]/15",
  水: "bg-[color:var(--color-wuxing-shui)]/15",
};

const DEFAULT_LOCATION = { longitude: "116.40", latitude: "39.90" };

const ASPECT_TONE: Record<string, string> = {
  和谐: "text-jade-400 border-jade-500/40 bg-jade-500/10",
  紧张: "text-cinnabar-400 border-cinnabar-500/40 bg-cinnabar-500/10",
  中性: "text-paper-200 border-gold-500/30 bg-ink-900/30",
};

function HepanClient() {
  const [tab, setTab] = useState<Tab>("bazi");
  const [aProfile, setAProfile] = useState<BirthProfile | null>(null);
  const [bProfile, setBProfile] = useState<BirthProfile | null>(null);
  const [aLoc, setALoc] = useState(DEFAULT_LOCATION);
  const [bLoc, setBLoc] = useState(DEFAULT_LOCATION);
  const [baziResult, setBaziResult] = useState<{
    bundle: { a: PersonBundle; b: PersonBundle };
    compat: ReturnType<typeof analyzeBaziCompatibility>;
  } | null>(null);
  const [astroResult, setAstroResult] = useState<{
    bundle: { a: PersonBundle; b: PersonBundle };
    synastry: AstrolabeSynastryData;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = aProfile && bProfile;

  function handleBaziCompute() {
    if (!aProfile || !bProfile) {
      setError("请先填写双方出生档案");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const aChart = calculateBaziFromBirthProfile(aProfile);
      const bChart = calculateBaziFromBirthProfile(bProfile);
      const compat = analyzeBaziCompatibility(aChart, bChart, {
        person1Name: aProfile.name ?? "甲",
        person2Name: bProfile.name ?? "乙",
      });
      setBaziResult({
        bundle: {
          a: { label: "甲", name: aProfile.name ?? "甲", profile: aProfile, bazi: aChart },
          b: { label: "乙", name: bProfile.name ?? "乙", profile: bProfile, bazi: bChart },
        },
        compat,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "八字合盘失败");
    } finally {
      setLoading(false);
    }
  }

  function handleAstroCompute() {
    if (!aProfile || !bProfile) {
      setError("请先填写双方出生档案");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const aMerged = mergeWithLocation(aProfile, aLoc);
      const bMerged = mergeWithLocation(bProfile, bLoc);
      const aInput = birthProfileToAstrolabeInput(aMerged);
      const bInput = birthProfileToAstrolabeInput(bMerged);
      const aChart = generateAstrolabe(aInput);
      const bChart = generateAstrolabe(bInput);
      const synastry = analyzeAstrolabeSynastry(aChart, bChart);
      setAstroResult({
        bundle: {
          a: { label: "甲", name: aProfile.name ?? "甲", profile: aProfile, astrolabe: aChart },
          b: { label: "乙", name: bProfile.name ?? "乙", profile: bProfile, astrolabe: bChart },
        },
        synastry,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "星盘合盘失败");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAProfile(null);
    setBProfile(null);
    setBaziResult(null);
    setAstroResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8 text-center sm:mb-10">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // COMPATIBILITY
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="合盘" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
          双方八字或星盘的逐项事实比对 · 合冲刑害破 · 跨盘十神与相位 · 喜忌与落宫覆盖
        </p>
        <div className="anim-fade-up mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-paper-400" style={{ animationDelay: "260ms" }}>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            DUAL SUBJECT SYNC
          </span>
          <span className="console-label flex items-center gap-2">
            <span className="hud-dot" />
            FACT-ONLY ENGINE
          </span>
        </div>
      </header>

      {/* 顶部 Tab */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className={`tab-chip ${tab === "bazi" ? "is-active" : ""}`}
          onClick={() => setTab("bazi")}
        >
          八字合盘
        </button>
        <button
          type="button"
          className={`tab-chip ${tab === "astrolabe" ? "is-active" : ""}`}
          onClick={() => setTab("astrolabe")}
        >
          星盘合盘
        </button>
      </div>

      {/* 双人输入 */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="anim-fade-right">
          <div className="console-label mb-2 text-center">SUBJECT.A // 甲</div>
          <p className="mb-2 text-center text-sm font-bold text-paper-100">
            <span className="seal mr-2">甲</span>
            第一位 · {aProfile?.name || "未填写"}
          </p>
          <BirthForm
            title="甲方出生档案"
            submitLabel="已选择甲方"
            onSubmit={(p) => {
              setAProfile(p);
              setError(null);
            }}
          />
          {tab === "astrolabe" && (
            <div className="mt-3">
              <HepanLocationFields
                value={aLoc}
                onChange={setALoc}
                hint="星盘合盘需要精确坐标；不确定时默认北京。"
              />
            </div>
          )}
        </div>

        <div className="anim-fade-left">
          <div className="console-label mb-2 text-center">SUBJECT.B // 乙</div>
          <p className="mb-2 text-center text-sm font-bold text-paper-100">
            <span className="seal mr-2">乙</span>
            第二位 · {bProfile?.name || "未填写"}
          </p>
          <BirthForm
            title="乙方出生档案"
            submitLabel="已选择乙方"
            onSubmit={(p) => {
              setBProfile(p);
              setError(null);
            }}
          />
          {tab === "astrolabe" && (
            <div className="mt-3">
              <HepanLocationFields
                value={bLoc}
                onChange={setBLoc}
                hint="星盘合盘需要精确坐标；不确定时默认北京。"
              />
            </div>
          )}
        </div>
      </div>

      {/* 计算按钮 */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-3">
          {tab === "bazi" && (
            <button
              type="button"
              className="btn-gold"
              disabled={!ready || loading}
              onClick={handleBaziCompute}
            >
              {loading ? "排盘中…" : "起八字合盘"}
            </button>
          )}
          {tab === "astrolabe" && (
            <button
              type="button"
              className="btn-gold"
              disabled={!ready || loading}
              onClick={handleAstroCompute}
            >
              {loading ? "排盘中…" : "起星盘合盘"}
            </button>
          )}
          {(baziResult || astroResult) && (
            <button type="button" className="btn-ghost" onClick={reset}>
              清除重算
            </button>
          )}
        </div>
        {!ready && (
          <p className="text-[11px] text-paper-500">
            请先填写双方出生档案后再排盘
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-2 text-sm text-cinnabar-400">
            {error}
          </p>
        )}
      </div>

      {/* 结果区 */}
      {tab === "bazi" && baziResult && (
        <BaziResult
          a={baziResult.bundle.a}
          b={baziResult.bundle.b}
          compat={baziResult.compat}
        />
      )}
      {tab === "astrolabe" && astroResult && (
        <AstrolabeResult
          a={astroResult.bundle.a}
          b={astroResult.bundle.b}
          synastry={astroResult.synastry}
        />
      )}

      <p className="mx-auto mt-12 max-w-5xl pb-8 text-center text-[11px] text-paper-500">
        合盘结果仅供传统文化研究与娱乐参考
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 八字合盘结果区                                                              */
/* -------------------------------------------------------------------------- */

function BaziResult({
  a,
  b,
  compat,
}: {
  a: PersonBundle;
  b: PersonBundle;
  compat: ReturnType<typeof analyzeBaziCompatibility>;
}) {
  const aChart = a.bazi!;
  const bChart = b.bazi!;

  const summary = useMemo(() => {
    const lines: string[] = [];
    const dmr = compat.dayMasterRelation;
    lines.push(
      `日主关系：${a.name || "甲"}为${dmr.person1Gan}（${dmr.person1Wuxing}），${b.name || "乙"}为${dmr.person2Gan}（${dmr.person2Wuxing}）。`,
    );
    lines.push(
      `${a.name || "甲"} → ${b.name || "乙"}：${dmr.person1ToPerson2}；${b.name || "乙"} → ${a.name || "甲"}：${dmr.person2ToPerson1}。`,
    );
    lines.push(
      `双向十神：${a.name || "甲"}视${b.name || "乙"}日干为「${dmr.person2GanAsPerson1TenGod}」；${b.name || "乙"}视${a.name || "甲"}日干为「${dmr.person1GanAsPerson2TenGod}」。`,
    );
    if (compat.crossPillarRelations.length > 0) {
      lines.push(
        `跨盘柱位关系命中 ${compat.crossPillarRelations.length} 条；日支（夫妻宫）关系 ${compat.spousePalaceRelations.length} 条。`,
      );
    }
    if (compat.crossBranchCombinations.length > 0) {
      lines.push(
        `跨盘三合/三会组合 ${compat.crossBranchCombinations.length} 组。`,
      );
    }
    if (compat.tenGodMappings.length > 0) {
      lines.push(`双向十神映射 ${compat.tenGodMappings.length} 条。`);
    }
    return lines.join("\n");
  }, [compat, a.name, b.name]);

  return (
    <div className="space-y-5">
      <PillarsSideBySide a={a} b={b} />
      <DayMasterBlock compat={compat} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <CrossPillarRelations compat={compat} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <CrossBranchCombinations compat={compat} />
      <TenGodMappings compat={compat} />
      <UsefulGodCoverage compat={compat} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <WuxingCompare a={aChart} b={bChart} />
      <NayinCompare a={aChart} b={bChart} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <SummaryBlock summary={summary} compat={compat} />
      <Reveal variant="up" delay={100}>
        <AiInterpret topic="双人合盘" data={{ 甲: a.name || "甲", 乙: b.name || "乙", ...compat }} />
      </Reveal>
    </div>
  );
}

function PillarsSideBySide({ a, b }: { a: PersonBundle; b: PersonBundle }) {
  const aChart = a.bazi!;
  const bChart = b.bazi!;
  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">01</span>四柱并排对照
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          天干、地支按五行着色；下行为对方干支与十神（以观察方日主为基准）。
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 p-4 sm:p-5">
        {/* 标题行 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr]">
          <div className="hidden md:block" />
          <div className="grid grid-cols-4 gap-2 text-center">
            {PILLAR_KEYS.map((k) => (
              <div key={k} className="console-label">{PILLAR_LABEL[k]}</div>
            ))}
          </div>
        </div>

        {/* 甲方：自左入场 */}
        <Reveal
          variant="left"
          className="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr]"
        >
          <div className="self-center text-center md:self-auto md:text-left">
            <p className="console-label">SUBJ.A</p>
            <p className="text-sm font-bold text-gold-300">{a.name || "甲"}</p>
            <p className="console-value text-[11px]">{aChart.solarDate.year}-{aChart.solarDate.month}-{aChart.solarDate.day}</p>
          </div>
          <PillarRow chart={aChart} tenGods={aChart.tenGods} />
        </Reveal>

        {/* 乙方：自右入场 */}
        <Reveal
          variant="right"
          delay={120}
          className="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr]"
        >
          <div className="self-center text-center md:self-auto md:text-left">
            <p className="console-label">SUBJ.B</p>
            <p className="text-sm font-bold text-gold-300">{b.name || "乙"}</p>
            <p className="console-value text-[11px]">{bChart.solarDate.year}-{bChart.solarDate.month}-{bChart.solarDate.day}</p>
          </div>
          <PillarRow chart={bChart} tenGods={bChart.tenGods} />
        </Reveal>

        {/* 隐藏干（藏干） */}
        <Reveal
          variant="left"
          delay={220}
          className="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr]"
        >
          <div className="console-label self-center text-center md:text-left">
            藏干对照
          </div>
          <HiddenRow chart={aChart} tenGods={aChart.hiddenTenGods} />
        </Reveal>
        <Reveal
          variant="right"
          delay={300}
          className="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr]"
        >
          <div className="hidden md:block" />
          <HiddenRow chart={bChart} tenGods={bChart.hiddenTenGods} />
        </Reveal>
      </div>
    </section>
  );
}

function PillarRow({
  chart,
  tenGods,
}: {
  chart: BaziChartResult;
  tenGods: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {PILLAR_KEYS.map((k) => {
        const p = chart.pillars[k];
        return (
          <div
            key={k}
            className="rounded-lg border border-gold-500/20 bg-ink-900/40 px-2 py-3"
          >
            <p className={`gz-char ${charWuXing(p.gan) ? WX_COLOR[charWuXing(p.gan)!] : ""}`}>
              {p.gan}
            </p>
            <p className={`gz-char ${charWuXing(p.zhi) ? WX_COLOR[charWuXing(p.zhi)!] : ""}`}>
              {p.zhi}
            </p>
            <p className="mt-1 text-[10px] text-paper-400">{tenGods[p.gan] ?? ""}</p>
          </div>
        );
      })}
    </div>
  );
}

function HiddenRow({
  chart,
  tenGods,
}: {
  chart: BaziChartResult;
  tenGods: Record<string, string[]>;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {PILLAR_KEYS.map((k) => {
        const hides = chart.hiddenStems[k] ?? [];
        return (
          <div
            key={k}
            className="rounded border border-gold-500/10 bg-ink-950/30 px-2 py-2 text-[11px]"
          >
            {hides.length === 0 ? (
              <span className="text-paper-500">—</span>
            ) : (
              hides.map((s, i) => (
                <span key={i} className="mr-1 inline-block">
                  <span
                    className={
                      charWuXing(s) ? WX_COLOR[charWuXing(s)!] : "text-paper-200"
                    }
                  >
                    {s}
                  </span>
                  <span className="ml-0.5 text-[9px] text-paper-500">
                    {tenGods[s]?.[0] ?? ""}
                  </span>
                </span>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

function DayMasterBlock({
  compat,
  aLabel,
  bLabel,
}: {
  compat: ReturnType<typeof analyzeBaziCompatibility>;
  aLabel: string;
  bLabel: string;
}) {
  const r = compat.dayMasterRelation;
  return (
    <section className="panel-console">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">02</span>日主双向关系
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          双方日干五行生克 + 双向十神映射。日主关系是固定分类，不证明相处质量或现实结果。
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <p className="console-label mb-1">
            {aLabel} → {bLabel}
          </p>
          <p className="text-sm text-paper-100">
            <span className={charWuXing(r.person1Gan) ? WX_COLOR[charWuXing(r.person1Gan)!] : ""}>
              {r.person1Gan}
            </span>
            （{r.person1Wuxing}）观
            <span className={charWuXing(r.person2Gan) ? WX_COLOR[charWuXing(r.person2Gan)!] : ""}>
              {r.person2Gan}
            </span>
            （{r.person2Wuxing}）：<span className="font-bold text-gold-300">{r.person1ToPerson2}</span>
          </p>
          <p className="mt-2 text-xs text-paper-400">
            对方日干作为十神：
            <span className="ml-1 rounded border border-gold-500/30 px-2 py-0.5 font-bold text-gold-300">
              {r.person2GanAsPerson1TenGod}
            </span>
          </p>
        </div>
        <div>
          <p className="console-label mb-1">
            {bLabel} → {aLabel}
          </p>
          <p className="text-sm text-paper-100">
            <span className={charWuXing(r.person2Gan) ? WX_COLOR[charWuXing(r.person2Gan)!] : ""}>
              {r.person2Gan}
            </span>
            （{r.person2Wuxing}）观
            <span className={charWuXing(r.person1Gan) ? WX_COLOR[charWuXing(r.person1Gan)!] : ""}>
              {r.person1Gan}
            </span>
            （{r.person1Wuxing}）：<span className="font-bold text-gold-300">{r.person2ToPerson1}</span>
          </p>
          <p className="mt-2 text-xs text-paper-400">
            对方日干作为十神：
            <span className="ml-1 rounded border border-gold-500/30 px-2 py-0.5 font-bold text-gold-300">
              {r.person1GanAsPerson2TenGod}
            </span>
          </p>
        </div>
      </div>
      <p className="px-5 pb-5 text-[11px] text-paper-500 sm:px-6">{r.limitation}</p>
    </section>
  );
}

function CrossPillarRelations({
  compat,
  aLabel,
  bLabel,
}: {
  compat: ReturnType<typeof analyzeBaziCompatibility>;
  aLabel: string;
  bLabel: string;
}) {
  const groups = {
    spousePalace: compat.spousePalaceRelations,
    cross: compat.crossPillarRelations.filter(
      (r) => !compat.spousePalaceRelations.some((s) => s.key === r.key),
    ),
  };

  return (
    <section className="panel-console">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">03</span>跨盘柱位关系（{aLabel} ⇄ {bLabel}）
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          含日支（夫妻宫）专项命中与四柱天干五合、地支六合/六冲/六害/三刑/同支等。命中即事实记录，不等于现实结果。
        </p>
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        {groups.spousePalace.length === 0 && groups.cross.length === 0 && (
          <p className="text-sm text-paper-500">未命中固定关系。</p>
        )}

        {groups.spousePalace.length > 0 && (
          <div>
            <p className="mb-2 flex items-baseline gap-2">
              <span className="console-label">SPOUSE.PALACE</span>
              <span className="text-xs font-bold text-cinnabar-400">
                日支 · 夫妻宫关系（{groups.spousePalace.length} 条）
              </span>
            </p>
            <ul className="space-y-2">
              {groups.spousePalace.map((r, i) => (
                <PillarRelationRow key={r.key} r={r} idx={i} aLabel={aLabel} bLabel={bLabel} />
              ))}
            </ul>
          </div>
        )}

        {groups.cross.length > 0 && (
          <div>
            <p className="mb-2 flex items-baseline gap-2">
              <span className="console-label">OTHER.PILLARS</span>
              <span className="text-xs text-paper-400">
                其余柱位关系（{groups.cross.length} 条）
              </span>
            </p>
            <ul className="space-y-2">
              {groups.cross.map((r, i) => (
                <PillarRelationRow key={r.key} r={r} idx={i} aLabel={aLabel} bLabel={bLabel} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function PillarRelationRow({
  r,
  idx = 0,
  aLabel,
  bLabel,
}: {
  r: ReturnType<typeof analyzeBaziCompatibility>["crossPillarRelations"][number];
  idx?: number;
  aLabel: string;
  bLabel: string;
}) {
  const isPositive =
    r.type === "六合" || r.type === "五合候选" || r.type === "同支";
  const isNegative = r.type === "六冲" || r.type === "天干冲";
  return (
    <li className="flex items-baseline gap-3 rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-2 text-sm">
      <span
        className={`anim-pop rounded px-2 py-0.5 text-[11px] font-bold ${
          isPositive
            ? "bg-jade-500/15 text-jade-400"
            : isNegative
              ? "bg-cinnabar-500/15 text-cinnabar-400"
              : "bg-paper-100/10 text-paper-200"
        }`}
        style={{ animationDelay: `${Math.min(idx, 8) * 90}ms` }}
      >
        {r.type}
      </span>
      <span className="text-paper-300">
        {aLabel}
        <span className="ml-1 text-paper-500">
          {PILLAR_LABEL[r.person1Pillar as PillarKey]}
        </span>
        <span
          className={`mx-1 ${charWuXing(r.person1Value) ? WX_COLOR[charWuXing(r.person1Value)!] : ""}`}
        >
          {r.person1Value}
        </span>
        <span className="mx-1 text-paper-500">⇄</span>
        {bLabel}
        <span className="ml-1 text-paper-500">
          {PILLAR_LABEL[r.person2Pillar as PillarKey]}
        </span>
        <span
          className={`mx-1 ${charWuXing(r.person2Value) ? WX_COLOR[charWuXing(r.person2Value)!] : ""}`}
        >
          {r.person2Value}
        </span>
      </span>
      {r.transformWuxing && (
        <span className="ml-auto text-[11px] text-gold-300">
          化 {r.transformWuxing}
        </span>
      )}
    </li>
  );
}

function CrossBranchCombinations({
  compat,
}: {
  compat: ReturnType<typeof analyzeBaziCompatibility>;
}) {
  if (compat.crossBranchCombinations.length === 0) {
    return (
      <section className="panel-console">
        <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
          <h2 className="console-title text-base">
            <span className="seq">04</span>跨盘三合/三会
          </h2>
        </header>
        <p className="p-5 text-sm text-paper-500 sm:p-6">
          未跨盘凑齐三合/三会所需地支成员。
        </p>
      </section>
    );
  }

  return (
    <section className="panel-console">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">04</span>跨盘三合/三会
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          三个地支成员跨越两人命盘齐备即记录；齐备不等于成局/成化/关系稳定。
        </p>
      </header>
      <ul className="space-y-2 p-5 sm:p-6">
        {compat.crossBranchCombinations.map((c) => (
          <li
            key={c.key}
            className="rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-gold-300">{c.name}</span>
              <span className="text-[11px] text-paper-500">{c.type}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2 text-xs">
              {c.members.map((m, i) => (
                <span key={i} className="rounded border border-gold-500/20 bg-ink-950/30 px-2 py-0.5">
                  <span
                    className={
                      charWuXing(m.branch) ? WX_COLOR[charWuXing(m.branch)!] : ""
                    }
                  >
                    {m.branch}
                  </span>
                  <span className="ml-1 text-paper-500">
                    {m.sources
                      .map((s) => `${s.person === "person1" ? "甲" : "乙"}${PILLAR_LABEL[s.pillar as PillarKey]}`)
                      .join(" · ")}
                  </span>
                </span>
              ))}
            </div>
            {c.note && <p className="mt-1 text-[11px] text-paper-500">{c.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TenGodMappings({
  compat,
}: {
  compat: ReturnType<typeof analyzeBaziCompatibility>;
}) {
  if (compat.tenGodMappings.length === 0) return null;

  return (
    <section className="panel-console">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">05</span>双向十神映射（{compat.tenGodMappings.length} 条）
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          对方某柱天干与地支本气相对观察方日主的十神分类。
        </p>
      </header>
      <ul className="grid gap-2 p-5 sm:grid-cols-2 sm:p-6">
        {compat.tenGodMappings.map((m) => (
          <li
            key={m.key}
            className="rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-2 text-xs"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-paper-300">
                {m.observer === "person1" ? "甲方观察" : "乙方观察"} ·{" "}
                {PILLAR_LABEL[m.pillar as PillarKey]}
              </span>
              <span className="rounded border border-gold-500/30 px-2 py-0.5 text-[11px] font-bold text-gold-300">
                {m.stemTenGod}
              </span>
            </div>
            <p className="mt-1 text-paper-400">
              天干
              <span
                className={`mx-1 ${charWuXing(m.stem) ? WX_COLOR[charWuXing(m.stem)!] : ""}`}
              >
                {m.stem}
              </span>
              / 地支
              <span
                className={`mx-1 ${charWuXing(m.branch) ? WX_COLOR[charWuXing(m.branch)!] : ""}`}
              >
                {m.branch}
              </span>
              本气十神：
              <span className="font-bold text-paper-200">{m.branchMainQiTenGod}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UsefulGodCoverage({
  compat,
  aLabel,
  bLabel,
}: {
  compat: ReturnType<typeof analyzeBaziCompatibility>;
  aLabel: string;
  bLabel: string;
}) {
  if (compat.usefulGodCoverage.length === 0) return null;
  return (
    <section className="panel-console">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">06</span>喜忌五行覆盖
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          提供方（一方命盘）是否出现受益方（另一方）既有喜用或忌神五行。仅事实。
        </p>
      </header>
      <ul className="space-y-3 p-5 sm:p-6">
        {compat.usefulGodCoverage.map((c) => (
          <li
            key={c.key}
            className="rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-3"
          >
            <p className="mb-1 text-sm font-bold text-paper-100">
              {c.provider === "person1" ? aLabel : bLabel} 提供 →
              {c.beneficiary === "person1" ? aLabel : bLabel} 受用
              {c.status === "资料不足" && (
                <span className="ml-2 rounded bg-paper-100/10 px-2 py-0.5 text-[11px] text-paper-300">
                  资料不足
                </span>
              )}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="flex items-baseline gap-2">
                  <span className="console-label">FAVORABLE</span>
                  <span className="text-[11px] font-bold text-jade-400">
                    喜用命中（{c.favorable.length}）
                  </span>
                </p>
                <p className="mt-1 text-xs text-paper-300">
                  {c.favorable.length === 0
                    ? "—"
                    : c.favorable
                        .map((f) => `${f.wuxing}（${f.sources.map((s) => `${PILLAR_LABEL[s.pillar as PillarKey]}${s.value}`).join("、")}）`)
                        .join("；")}
                </p>
              </div>
              <div>
                <p className="flex items-baseline gap-2">
                  <span className="console-label">UNFAVORABLE</span>
                  <span className="text-[11px] font-bold text-cinnabar-400">
                    忌神命中（{c.unfavorable.length}）
                  </span>
                </p>
                <p className="mt-1 text-xs text-paper-300">
                  {c.unfavorable.length === 0
                    ? "—"
                    : c.unfavorable
                        .map((u) => `${u.wuxing}（${u.sources.map((s) => `${PILLAR_LABEL[s.pillar as PillarKey]}${s.value}`).join("、")}）`)
                        .join("；")}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WuxingCompare({ a, b }: { a: BaziChartResult; b: BaziChartResult }) {
  const ca = countWuxing(a);
  const cb = countWuxing(b);
  const max = Math.max(...Object.values(ca), ...Object.values(cb), 1);

  // mount 后再铺开宽度，触发对比条生长过渡
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="panel-console">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">07</span>五行分布对比
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          天干权重 2、地支 1、藏干 1。占比供相对比较，不替代五行力量打分。
        </p>
      </header>
      <div className="space-y-3 p-5 sm:p-6">
        {(Object.keys(WX_COLOR) as WuXing[]).map((wx, wxIdx) => (
          <div key={wx} className="flex items-center gap-3">
            <span className={`w-8 text-sm font-bold ${WX_COLOR[wx]}`}>{wx}</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="console-label w-8">甲</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-ink-800">
                  <div
                    className={`h-full ${WX_BG[wx]} border-r border-current transition-[width] duration-700 ease-out`}
                    style={{
                      width: grown ? `${(ca[wx] / max) * 100}%` : "0%",
                      transitionDelay: `${wxIdx * 80}ms`,
                    }}
                  />
                </div>
                <span className="console-value w-6 text-right text-[11px]">{ca[wx]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="console-label w-8">乙</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-ink-800">
                  <div
                    className={`h-full ${WX_BG[wx]} border-r border-current transition-[width] duration-700 ease-out`}
                    style={{
                      width: grown ? `${(cb[wx] / max) * 100}%` : "0%",
                      transitionDelay: `${wxIdx * 80 + 60}ms`,
                    }}
                  />
                </div>
                <span className="console-value w-6 text-right text-[11px]">{cb[wx]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NayinCompare({
  a,
  b,
  aLabel,
  bLabel,
}: {
  a: BaziChartResult;
  b: BaziChartResult;
  aLabel: string;
  bLabel: string;
}) {
  const aNayin = lookupNayin(a.pillars.year.ganZhi);
  const bNayin = lookupNayin(b.pillars.year.ganZhi);
  const aZodiac = zodiacOf(a.pillars.year.zhi);
  const bZodiac = zodiacOf(b.pillars.year.zhi);

  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">08</span>纳音年命 + 生肖
        </h2>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/30 p-3">
          <p className="console-label">{aLabel}</p>
          <p className="mt-1 text-base font-bold console-value text-gold-300">
            {aZodiac} · {a.pillars.year.ganZhi}
          </p>
          <p className="mt-1 text-xs text-paper-300">年命纳音：<span className="console-value">{aNayin}</span></p>
        </div>
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/30 p-3">
          <p className="console-label">{bLabel}</p>
          <p className="mt-1 text-base font-bold console-value text-gold-300">
            {bZodiac} · {b.pillars.year.ganZhi}
          </p>
          <p className="mt-1 text-xs text-paper-300">年命纳音：<span className="console-value">{bNayin}</span></p>
        </div>
        <p className="col-span-2 text-[11px] text-paper-500">
          年命纳音仅记分类，生肖用于标记年支关系，不证明现实合婚结果。
        </p>
      </div>
    </section>
  );
}

function SummaryBlock({
  summary,
  compat,
}: {
  summary: string;
  compat: ReturnType<typeof analyzeBaziCompatibility>;
}) {
  return (
    <section className="panel-console hud-frame anim-unroll">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">09</span>综合评述（事实陈述）
        </h2>
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        <pre className="whitespace-pre-wrap rounded-lg border border-gold-500/15 bg-ink-900/40 p-4 text-sm leading-relaxed text-paper-200">
{summary}
        </pre>

        {compat.counterEvidence.length > 0 && (
          <div>
            <p className="console-label mb-1">反证与覆盖</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-paper-400">
              {compat.counterEvidence.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {compat.limitations.length > 0 && (
          <div>
            <p className="console-label mb-1">边界说明</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-paper-500">
              {compat.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 星盘合盘结果区                                                              */
/* -------------------------------------------------------------------------- */

function AstrolabeResult({
  a,
  b,
  synastry,
}: {
  a: PersonBundle;
  b: PersonBundle;
  synastry: AstrolabeSynastryData;
}) {
  const aChart = a.astrolabe!;
  const bChart = b.astrolabe!;
  const summary = synastry.summaryFact;

  return (
    <div className="space-y-5">
      <ChartMeta a={a} b={b} />
      <AspectTable synastry={synastry} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <HouseOverlayTable synastry={synastry} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <SynastrySummary summary={summary} />
      {synastry.limitations.length > 0 && (
        <section className="panel-console">
          <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
            <h2 className="console-title text-base">
              <span className="seq">99</span>边界说明
            </h2>
          </header>
          <ul className="list-disc space-y-1 p-5 text-xs text-paper-400 sm:p-6">
            {synastry.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
      <ChartMetaPlanets a={aChart} b={bChart} aLabel={a.name || "甲"} bLabel={b.name || "乙"} />
      <Reveal variant="up" delay={100}>
        <AiInterpret topic="双人合盘" data={{ 甲: a.name || "甲", 乙: b.name || "乙", ...synastry }} />
      </Reveal>
    </div>
  );
}

function ChartMeta({ a, b }: { a: PersonBundle; b: PersonBundle }) {
  const ac = a.astrolabe!;
  const bc = b.astrolabe!;
  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">01</span>本命盘元信息
        </h2>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <ChartMetaRow label="甲" chart={ac} name={a.name} />
        <ChartMetaRow label="乙" chart={bc} name={b.name} />
      </div>
    </section>
  );
}

function ChartMetaRow({
  label,
  chart,
  name,
}: {
  label: string;
  chart: AstrolabeData;
  name?: string;
}) {
  return (
    <div className="rounded-lg border border-gold-500/15 bg-ink-900/30 p-3 text-sm">
      <p className="console-label">
        <span className="seal mr-1">{label}</span>
        <span className="console-value">{name ?? "—"}</span>
      </p>
      <p className="mt-1 text-paper-200">
        上升星座：
        <span className="console-value text-gold-300">
          {chart.angles?.find((a) => a.name === "上升")?.sign ?? "—"}
        </span>
      </p>
      <p className="text-paper-200">
        日：<span className="console-value text-gold-300">{chart.planets?.find((p) => p.name === "太阳")?.sign ?? "—"}</span>
      </p>
      <p className="text-paper-200">
        月：<span className="console-value text-gold-300">{chart.planets?.find((p) => p.name === "月亮")?.sign ?? "—"}</span>
      </p>
    </div>
  );
}

function AspectTable({
  synastry,
  aLabel,
  bLabel,
}: {
  synastry: AstrolabeSynastryData;
  aLabel: string;
  bLabel: string;
}) {
  if (synastry.aspects.length === 0) {
    return (
      <section className="panel-console">
        <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
          <h2 className="console-title text-base">
            <span className="seq">02</span>跨盘相位
          </h2>
        </header>
        <p className="p-5 text-sm text-paper-500 sm:p-6">未命中相位。</p>
      </section>
    );
  }

  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">02</span>跨盘相位
          <span className="ml-2 console-value text-xs">({synastry.aspects.length} 条)</span>
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          含容许度信息。命中只证明几何角距进入容许范围，不证明相处结果或事件概率。
        </p>
      </header>
      <div className="overflow-x-auto p-5 sm:p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-500/20 text-left text-paper-500">
              <th className="console-label py-2 pr-2">{aLabel}</th>
              <th className="console-label py-2 pr-2">{bLabel}</th>
              <th className="console-label py-2 pr-2">相位</th>
              <th className="console-label py-2 pr-2">角距</th>
              <th className="console-label py-2 pr-2">容许度</th>
              <th className="console-label py-2 pr-2">倾向</th>
            </tr>
          </thead>
          <tbody>
            {synastry.aspects.map((a, i) => {
              const tone = ASPECT_TONE[a.tendency] ?? ASPECT_TONE.中性;
              return (
                <tr
                  key={a.key}
                  className={`anim-fade-up border-b border-gold-500/10 ${tone}`}
                  style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
                >
                  <td className="py-2 pr-2">
                    <span className="font-mono text-xs console-value text-paper-400">{a.person1}</span>
                    <span className="ml-1 text-paper-100">{a.point1Name}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <span className="font-mono text-xs console-value text-paper-400">{a.person2}</span>
                    <span className="ml-1 text-paper-100">{a.point2Name}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <span className="font-bold">{a.type}</span>
                    <span className="ml-1 text-paper-400">{a.symbol}</span>
                  </td>
                  <td className="py-2 pr-2 text-xs font-mono console-value text-paper-300">
                    {a.actualAngle.toFixed(2)}°
                  </td>
                  <td className="py-2 pr-2 text-xs font-mono console-value text-paper-300">
                    ±{a.allowedOrb}°（{a.closeness}）
                  </td>
                  <td className="py-2 pr-2 text-xs">{a.tendency}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HouseOverlayTable({
  synastry,
  aLabel,
  bLabel,
}: {
  synastry: AstrolabeSynastryData;
  aLabel: string;
  bLabel: string;
}) {
  if (synastry.houseOverlays.length === 0) {
    return (
      <section className="panel-console">
        <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
          <h2 className="console-title text-base">
            <span className="seq">03</span>跨盘落宫
          </h2>
        </header>
        <p className="p-5 text-sm text-paper-500 sm:p-6">未命中落宫。</p>
      </section>
    );
  }

  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">03</span>跨盘落宫
          <span className="ml-2 console-value text-xs">({synastry.houseOverlays.length} 条)</span>
        </h2>
        <p className="mt-1 text-[11px] text-paper-500">
          访客计算点位于宫主本命盘的哪一宫。
        </p>
      </header>
      <div className="grid gap-2 p-5 sm:p-6 md:grid-cols-2">
        {synastry.houseOverlays.map((h) => (
          <div
            key={h.key}
            className="rounded-lg border border-gold-500/15 bg-ink-900/30 px-3 py-2 text-xs"
          >
            <p className="font-bold text-paper-100">
              {h.ownerPerson === "person1" ? aLabel : bLabel}命宫 → 访客
              {h.pointName}
            </p>
            <p className="mt-1 text-paper-400">
              访客 {h.visitor} 落在第 <span className="console-value text-gold-300">{h.house}</span> 宫
              （{h.houseStart.toFixed(1)}°–{h.houseEnd.toFixed(1)}°）
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SynastrySummary({
  summary,
}: {
  summary: AstrolabeSynastryData["summaryFact"];
}) {
  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">04</span>证据汇总
        </h2>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        <Stat label="返回相位" value={summary.returnedAspectCount} />
        <Stat label="跨盘落宫" value={summary.houseOverlayCount} />
        <Stat label="匹配对" value={summary.matchedAspectCount} />
      </div>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="console-label mb-2">相位类型分布</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(summary.aspectTypeCounts).map(([k, v]) => (
            <span
              key={k}
              className="rounded border border-gold-500/30 bg-ink-900/30 px-2 py-1"
            >
              {k}：<span className="font-bold console-value text-gold-300">{v}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-paper-400">
          倾向分布：
          和谐 <span className="console-value text-jade-400">{summary.tendencyCounts["和谐"]}</span> ·
          中性 <span className="console-value text-paper-200">{summary.tendencyCounts["中性"]}</span> ·
          紧张 <span className="console-value text-cinnabar-400">{summary.tendencyCounts["紧张"]}</span>
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-gold-500/15 bg-ink-900/30 p-3 text-center">
      <p className="console-label">{label}</p>
      <p className="mt-1 text-2xl font-bold console-value text-gold-300">{value}</p>
    </div>
  );
}

function ChartMetaPlanets({
  a,
  b,
  aLabel,
  bLabel,
}: {
  a: AstrolabeData;
  b: AstrolabeData;
  aLabel: string;
  bLabel: string;
}) {
  return (
    <section className="panel-console hud-frame">
      <header className="border-b border-gold-500/15 px-5 py-3 sm:px-6">
        <h2 className="console-title text-base">
          <span className="seq">05</span>行星位置速览
        </h2>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <PlanetList label={aLabel} chart={a} />
        <PlanetList label={bLabel} chart={b} />
      </div>
    </section>
  );
}

function PlanetList({ label, chart }: { label: string; chart: AstrolabeData }) {
  const pts = (chart.planets ?? []).slice(0, 10);
  return (
    <div className="rounded-lg border border-gold-500/15 bg-ink-900/30 p-3 text-sm">
      <p className="console-label">{label}</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {pts.map((p) => (
          <li key={p.name} className="flex justify-between">
            <span className="text-paper-300">{p.name}</span>
            <span className="console-value text-gold-300">
              {p.sign} {p.degree}°
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 工具                                                                        */
/* -------------------------------------------------------------------------- */

function mergeWithLocation(profile: BirthProfile, loc: { longitude: string; latitude: string }) {
  const lng = Number(loc.longitude);
  const lat = Number(loc.latitude);
  return {
    ...profile,
    hour: profile.hour ?? 12,
    minute: profile.minute ?? 0,
    location: {
      ...(profile.location ?? {}),
      longitude: Number.isFinite(lng) ? lng : 116.4,
      latitude: Number.isFinite(lat) ? lat : 39.9,
      timezone: profile.location?.timezone ?? 8,
    },
    useTrueSolarTime: false,
  };
}

/**
 * 本地五行计数（hepan-helpers.ts 中 countWuxing 使用了 charWuxingClass
 * 返回 CSS 类名而非 WuXing 枚举，存在 bug；此处用 charWuXing 重写一份）。
 */
function countWuxing(chart: BaziChartResult): Record<WuXing, number> {
  const counts: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const k of PILLAR_KEYS) {
    const p = chart.pillars[k];
    const wg = charWuXing(p.gan);
    if (wg) counts[wg] += 2;
    const wz = charWuXing(p.zhi);
    if (wz) counts[wz] += 1;
    for (const h of chart.hiddenStems[k] ?? []) {
      const wh = charWuXing(h);
      if (wh) counts[wh] += 1;
    }
  }
  return counts;
}

// 抑制未使用告警（hepan-helpers 中导出的部分查表暂未直接引用，留作扩展）
void STEM_FIVE_COMBOS;
void BRANCH_SIX_COMBOS;
void BRANCH_SIX_CLASHES;
void BRANCH_SIX_HARMS;
void stemFiveComboOf;
void branchSixComboOf;
void branchClashOf;
void branchHarmOf;
export default function HepanPage() {
  return (
    <Title title="合盘">
      <HepanClient />
    </Title>
  );
}
