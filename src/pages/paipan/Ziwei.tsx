import Title from "@/components/Title";
import { useState } from "react";
import type { BirthProfile, IztroAstrolabe } from "mingyu-core";
import { birthProfileToZiweiChartInput } from "mingyu-core";
import { calculateZiweiChart } from "mingyu-core/ziwei";
import BirthForm from "@/components/birth/BirthForm";
import CharsRise from "@/components/motion/CharsRise";
import Reveal from "@/components/motion/Reveal";
import ZiweiChart from "@/components/ziwei/ZiweiChart";
import DecadalList from "@/components/ziwei/DecadalList";
import AiInterpret from "@/components/ai/AiInterpret";

interface Result {
  astrolabe: IztroAstrolabe;
  // 用于解构出便于纯数据展示的字段（运行时已是对象）
}

function ZiweiClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(profile: BirthProfile) {
    setLoading(true);
    setError(null);
    try {
      const input = birthProfileToZiweiChartInput(profile);
      const runtime = await calculateZiweiChart(input, { skipAnalysis: true });
      // runtime.astrolabe 已是 iztro FunctionalAstrolabe，可直接读取展示所需字段。
      setResult({ astrolabe: runtime.astrolabe });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`排盘失败：${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8 text-center sm:mb-10">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // ZIWEI WEIFU
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="紫微斗数" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
          以出生时辰安星排盘，十二宫垣定人伦纲纪。
        </p>
      </header>

      {!result && (
        <div className="mx-auto max-w-2xl">
          <BirthForm
            title="出生档案"
            submitLabel="开始紫微排盘"
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>
      )}

      {error && (
        <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-400">
          {error}
        </div>
      )}

      {result && (
        <div className="anim-fade-up space-y-6">
          <div className="console-label">MINGXUAN // ZIWEI WEIFU · RESULT</div>
          <Reveal variant="scale">
            <ZiweiChart astrolabe={result.astrolabe} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <DecadalList astrolabe={result.astrolabe} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <AiInterpret topic="紫微斗数命盘" data={result.astrolabe} />
          </Reveal>

          <div className="flex flex-col items-center gap-3">
            <button type="button" className="btn-ghost" onClick={reset}>
              重新排盘
            </button>
            <p className="text-center text-[11px] text-paper-500">
              排盘结果仅供传统文化研究与娱乐参考
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
export default function ZiweiPage() {
  return (
    <Title title="紫微斗数">
      <ZiweiClient />
    </Title>
  );
}
