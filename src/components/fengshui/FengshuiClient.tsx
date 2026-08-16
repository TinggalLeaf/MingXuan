
import { useMemo, useState } from "react";
import BirthForm from "@/components/birth/BirthForm";
import CharsRise from "@/components/motion/CharsRise";
import { bazhai, residentialFengshui, xuankong } from "mingyu-core";
import type { BirthProfile } from "mingyu-core";
import type { ResidentialFengshuiResult } from "mingyu-core/residential-fengshui";
import BaZhaiCard from "@/components/fengshui/BaZhaiCard";
import XuanKongGrid from "@/components/fengshui/XuanKongGrid";
import AdviceCard from "@/components/fengshui/AdviceCard";
import OrientationPicker from "@/components/fengshui/OrientationPicker";
import AiInterpret from "@/components/ai/AiInterpret";

/** 从 BirthProfile 抽出 (year, month, day)；有真太阳时则需 hour */
function extractBirthDate(p: BirthProfile): {
  year: number;
  month: number;
  day: number;
} {
  return { year: p.year, month: p.month, day: p.day };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 60 }, (_, i) => CURRENT_YEAR - 30 + i);

export default function FengshuiClient() {
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [sitMountain, setSitMountain] = useState("");
  const [facingMountain, setFacingMountain] = useState("");
  const [houseYear, setHouseYear] = useState<number>(CURRENT_YEAR);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResidentialFengshuiResult | null>(null);
  const [error, setError] = useState("");

  function handleBirth(p: BirthProfile) {
    setProfile(p);
    setError("");
  }

  function handleAnalyze() {
    setError("");
    if (!profile) {
      setError("请先填写宅主出生信息");
      return;
    }
    if (!sitMountain || !facingMountain) {
      setError("请填写坐山与朝向");
      return;
    }
    if (!Number.isFinite(houseYear) || houseYear < 1864 || houseYear > CURRENT_YEAR + 5) {
      setError(`建造/起运年份需在 1864–${CURRENT_YEAR + 5} 之间`);
      return;
    }

    setSubmitting(true);
    try {
      // 用 setTimeout 让 React 先渲染 loading 状态
      const birth = extractBirthDate(profile);
      const r = residentialFengshui.generateResidentialFengshui({
        year: houseYear,
        birthYear: birth.year,
        birthMonth: birth.month,
        birthDay: birth.day,
        gender: profile.gender === "unspecified" ? undefined : profile.gender,
        sitMountain,
        facingMountain,
      });
      setResult(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`排盘失败：${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  const xkPreview = useMemo(() => {
    if (!sitMountain || !facingMountain) return null;
    try {
      return xuankong.generateXuanKong({
        year: houseYear,
        sitMountain,
        facingMountain,
      });
    } catch {
      return null;
    }
  }, [sitMountain, facingMountain, houseYear]);

  const bazhaiPreview = useMemo(() => {
    if (!profile || !sitMountain) return null;
    const birth = extractBirthDate(profile);
    try {
      return bazhai.analyzeBaZhai({
        birthYear: birth.year,
        birthMonth: birth.month,
        birthDay: birth.day,
        gender: profile.gender === "unspecified" ? undefined : profile.gender,
        sitMountain,
      });
    } catch {
      return null;
    }
  }, [profile, sitMountain]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // FENGSHUI
        </div>
        <h1 className="title-ornament mb-3 justify-center text-3xl font-bold text-paper-50 sm:text-4xl">
          <CharsRise text="住宅风水" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="text-sm leading-relaxed text-paper-300 sm:text-base">
          宅主命卦 · 八宅方位 · 玄空飞星 · 综合建议
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="anim-fade-up space-y-4 lg:col-span-2">
          <BirthForm title="宅主出生信息" submitLabel="保存宅主" onSubmit={handleBirth} />

          <div className="panel-console hud-frame space-y-4 p-5 sm:p-6">
            <h3 className="console-title text-base">
              <span className="seq">01</span>房屋资料
            </h3>
            <OrientationPicker
              sitMountain={sitMountain}
              facingMountain={facingMountain}
              onSitChange={setSitMountain}
              onFacingChange={setFacingMountain}
            />
            <label className="block">
              <span className="console-label mb-1 block">YEAR · 建造 / 起运年份（定元运）</span>
              <select
                className="input-xuan w-full"
                value={houseYear}
                onChange={(e) => setHouseYear(Number(e.target.value))}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p className="rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-3 py-2 text-sm text-cinnabar-400">
                <span className="console-label mr-2 text-cinnabar-400">ERR</span>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              className="btn-gold w-full"
              disabled={submitting}
            >
              {submitting ? "排盘中…" : "开始排盘"}
            </button>
          </div>
        </section>

        <section className="anim-fade-up space-y-5 lg:col-span-3" style={{ animationDelay: "120ms" }}>
          <BaZhaiCard bazhai={result?.bazhai ?? bazhaiPreview} />
          <XuanKongGrid xk={result?.xuankong ?? xkPreview} />
          {result && <AdviceCard result={result} />}
          {result && <AiInterpret topic="住宅风水" data={result} />}
        </section>
      </div>

      <p className="console-label mt-10 text-center text-paper-500">
        结果仅供传统文化研究与娱乐参考。
      </p>
    </div>
  );
}