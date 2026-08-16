import Title from "@/components/Title";
import { useMemo, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import type { BirthProfile } from "mingyu-core";
import type { BaziChartResult } from "mingyu-core/bazi";
import { calculateBaziFromBirthProfile } from "mingyu-core";

import BirthForm from "@/components/birth/BirthForm";
import CharsRise from "@/components/motion/CharsRise";
import Reveal from "@/components/motion/Reveal";
import HeaderCard from "@/components/bazi/HeaderCard";
import PillarTable from "@/components/bazi/PillarTable";
import WuxingBars from "@/components/bazi/WuxingBars";
import DayMasterPanel from "@/components/bazi/DayMasterPanel";
import LuckTimeline from "@/components/bazi/LuckTimeline";
import WarningsPanel from "@/components/bazi/WarningsPanel";
import AiInterpret from "@/components/ai/AiInterpret";

interface ChartState {
  chart: BaziChartResult;
  profile: BirthProfile;
}

function BaziClient() {
  const [state, setState] = useState<ChartState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentAge = useMemo(() => {
    if (!state) return undefined;
    const solar = state.chart.solarDate;
    const today = new Date();
    let age = today.getFullYear() - solar.year;
    const m = today.getMonth() + 1 - solar.month;
    if (m < 0 || (m === 0 && today.getDate() < solar.day)) age--;
    return Math.max(0, age);
  }, [state]);

  function handleSubmit(profile: BirthProfile) {
    setLoading(true);
    setError(null);
    try {
      const chart = calculateBaziFromBirthProfile(profile);
      setState({ chart, profile });
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "排盘失败，请检查输入或稍后重试。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setState(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 页头 */}
      <header className="mb-8 text-center sm:mb-10">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // BAZI
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="八字排盘" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
          以出生时刻定四柱五行，审视格局用神、流年大运与神煞空亡。
        </p>
      </header>

      {!state && (
        <div className="mx-auto max-w-2xl animate-fade-up">
          <BirthForm
            title="请输入出生资料"
            submitLabel={loading ? "排盘中…" : "开始排盘"}
            onSubmit={handleSubmit}
            loading={loading}
          />
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 p-4 text-sm text-cinnabar-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-bold">排盘失败</div>
                <div className="mt-1 text-[12px] leading-relaxed">{error}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {state && (
        <div className="anim-fade-up space-y-5 sm:space-y-6">
          <div className="console-label">MINGXUAN // BAZI · RESULT</div>
          {/* 工具条 */}
          <div className="flex items-center justify-between">
            <div className="console-label flex items-center gap-2">
              <span className="hud-dot" />
              <span className="console-value">
                {state.profile.useTrueSolarTime ? "TRUE-SOLAR" : "STANDARD"}
              </span>
              <span className="mx-1 text-paper-600">·</span>
              <span className="console-value">
                {state.profile.calendarType === "lunar" ? "LUNAR" : "SOLAR"}
              </span>
            </div>
            <button type="button" className="btn-ghost" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              重新排盘
            </button>
          </div>

          <Reveal variant="up">
            <HeaderCard chart={state.chart} profile={state.profile} />
          </Reveal>
          <Reveal variant="up" delay={90}>
            <PillarTable chart={state.chart} />
          </Reveal>
          <Reveal variant="up" delay={180}>
            <WuxingBars chart={state.chart} />
          </Reveal>
          <Reveal variant="up" delay={90}>
            <DayMasterPanel chart={state.chart} />
          </Reveal>
          <Reveal variant="left" delay={90}>
            <LuckTimeline chart={state.chart} currentAge={currentAge} />
          </Reveal>
          <Reveal variant="up" delay={90}>
            <WarningsPanel chart={state.chart} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <AiInterpret topic="八字命盘" data={state.chart} />
          </Reveal>
        </div>
      )}

      <footer className="mt-12 border-t border-gold-500/15 pt-4 text-center text-[11px] text-paper-500">
        排盘结果仅供传统文化研究与娱乐参考。
      </footer>
    </div>
  );
}
export default function BaziPage() {
  return (
    <Title title="八字排盘">
      <BaziClient />
    </Title>
  );
}
