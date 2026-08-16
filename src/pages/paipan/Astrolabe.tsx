import Title from "@/components/Title";
import { useState } from "react";
import type { BirthProfile, AstrolabeData, AstrolabeBirthInput } from "mingyu-core";
import { birthProfileToAstrolabeInput } from "mingyu-core";
import { generateAstrolabe } from "mingyu-core/divination/astrolabe";
import BirthForm from "@/components/birth/BirthForm";
import CharsRise from "@/components/motion/CharsRise";
import Reveal from "@/components/motion/Reveal";
import AstrolabeWheel from "@/components/astrolabe/AstrolabeWheel";
import PlanetTable from "@/components/astrolabe/PlanetTable";
import HouseTable from "@/components/astrolabe/HouseTable";
import AspectTable from "@/components/astrolabe/AspectTable";
import AstrolabeSummary from "@/components/astrolabe/AstrolabeSummary";
import LocationFields from "@/components/astrolabe/LocationFields";
import AiInterpret from "@/components/ai/AiInterpret";

function AstrolabeClient() {
  const [result, setResult] = useState<AstrolabeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState({ longitude: "116.40", latitude: "39.90" });

  function handleSubmit(profile: BirthProfile) {
    setLoading(true);
    setError(null);
    try {
      // 星盘需要精确时分 + 经纬度。补充地点坐标，缺失则用默认值。
      const lng = Number(coords.longitude);
      const lat = Number(coords.latitude);
      const merged: BirthProfile = {
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
      const input: AstrolabeBirthInput = birthProfileToAstrolabeInput(merged);
      const data = generateAstrolabe(input);
      setResult(data);
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
          MINGXUAN // ASTROLABE
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="西洋星盘" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
          Placidus 宫位制 · 十大星体相位 · 元素模式分布
        </p>
      </header>

      {!result && (
        <div className="mx-auto max-w-2xl space-y-4">
          <BirthForm
            title="出生档案"
            submitLabel="开始星盘排盘"
            onSubmit={handleSubmit}
            loading={loading}
          />
          <LocationFields value={coords} onChange={setCoords} />
          <p className="text-center text-[11px] text-paper-500">
            星盘排盘需要精确时分与出生地经纬度，请尽量补全；纬度缺省时默认北京（39.90°N, 116.40°E）。
          </p>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-400">
          {error}
        </div>
      )}

      {result && (
        <div className="anim-fade-up space-y-6">
          <div className="console-label">MINGXUAN // ASTROLABE · RESULT</div>
          <Reveal variant="up">
            <AstrolabeSummary data={result} />
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
            <div className="space-y-6">
              <Reveal variant="left" delay={100}>
                <PlanetTable data={result} />
              </Reveal>
              <Reveal variant="left" delay={200}>
                <HouseTable data={result} />
              </Reveal>
            </div>
            <Reveal variant="scale" delay={150} className="hud-frame">
              <AstrolabeWheel data={result} />
            </Reveal>
          </div>
          <Reveal variant="up" delay={120}>
            <AspectTable data={result} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <AiInterpret topic="西洋星盘" data={result} />
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
export default function AstrolabePage() {
  return (
    <Title title="西洋星盘">
      <AstrolabeClient />
    </Title>
  );
}
