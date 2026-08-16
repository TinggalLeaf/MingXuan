import Title from "@/components/Title";
import { useState } from "react";
import type { BirthProfile } from "mingyu-core";
import type { QizhengResult } from "mingyu-core/qizheng";
import { birthProfileToQizhengInput } from "mingyu-core";
import { generateQizheng } from "mingyu-core/qizheng";
import BirthForm from "@/components/birth/BirthForm";
import CharsRise from "@/components/motion/CharsRise";
import Reveal from "@/components/motion/Reveal";
import LocationFields from "@/components/astrolabe/LocationFields";
import QizhengStarTable from "@/components/qizheng/QizhengStarTable";
import QizhengPalaces from "@/components/qizheng/QizhengPalaces";
import QizhengMansions from "@/components/qizheng/QizhengMansions";
import QizhengSources from "@/components/qizheng/QizhengSources";
import QizhengContext from "@/components/qizheng/QizhengContext";
import AiInterpret from "@/components/ai/AiInterpret";

function QizhengClient() {
  const [result, setResult] = useState<QizhengResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState({ longitude: "116.40", latitude: "39.90" });

  function handleSubmit(profile: BirthProfile) {
    setLoading(true);
    setError(null);
    try {
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
      };
      const input = birthProfileToQizhengInput(merged);
      const data = generateQizheng(input);
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
          MINGXUAN // QIZHENG
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="七政四余" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
          七政（日月五星）四余（紫炁月孛罗睺计都）· 二十八宿 · 十二宫
        </p>
      </header>

      {!result && (
        <div className="mx-auto max-w-2xl space-y-4">
          <BirthForm
            title="出生档案"
            submitLabel="开始七政排盘"
            onSubmit={handleSubmit}
            loading={loading}
          />
          <LocationFields value={coords} onChange={setCoords} />
          <p className="text-center text-[11px] text-paper-500">
            七政四余需精确时分与经纬度；缺省时使用北京（39.90°N, 116.40°E）。
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
          <div className="console-label">MINGXUAN // QIZHENG · RESULT</div>
          <Reveal variant="up">
            <QizhengContext
              ctx={result.calculationContext}
              mingGong={result.mingGong}
              shenGong={result.shenGong}
              mingZhu={result.mingZhu}
            />
          </Reveal>
          <Reveal variant="up" delay={100}>
            <QizhengStarTable stars={result.stars} />
          </Reveal>
          <Reveal variant="scale" delay={160}>
            <QizhengPalaces
              palaces={result.twelvePalaces}
              stars={result.stars}
              mingGong={result.mingGong}
            />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <QizhengMansions stars={result.stars} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <QizhengSources sources={result.positionSources} />
          </Reveal>
          <Reveal variant="up" delay={120}>
            <AiInterpret topic="七政四余星盘" data={result} />
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
export default function QizhengPage() {
  return (
    <Title title="七政四余">
      <QizhengClient />
    </Title>
  );
}
