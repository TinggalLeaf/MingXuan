
import { direction } from "mingyu-core";
import type { XuanKongPalace, XuanKongResult, XuanKongCombination } from "mingyu-core/xuankong";
import ScanOverlay from "@/components/common/ScanOverlay";

/**
 * 后天洛书九宫顺序（巽 - 离 - 坤 / 震 - 中 - 兑 / 艮 - 坎 - 乾）
 * 玄空飞星排盘按此 3×3 网格布局；下标 [行][列]。
 */
const PALACE_GRID: number[][] = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

/** 飞星入宫顺序（中 → 乾 → 兑 → 艮 → 离 → 坎 → 坤 → 震 → 巽）对应的入场延迟 */
const FLY_ORDER_DELAY: Record<number, number> = {
  5: 0, 6: 70, 7: 140, 8: 210, 9: 280, 1: 350, 2: 420, 3: 490, 4: 560,
};

function palaceByNumber(palaces: XuanKongPalace[], num: number): XuanKongPalace | undefined {
  return palaces.find((p: XuanKongPalace) => p.gong === num);
}

const NINE_STARS = direction.NINE_STARS;

/** 九星五行着色 */
function wuxingClass(num: number): string {
  const profile = NINE_STARS[num - 1];
  if (!profile) return "text-paper-200";
  switch (profile.element) {
    case "水":
      return "text-[color:var(--color-wuxing-shui)]";
    case "火":
      return "text-[color:var(--color-wuxing-huo)]";
    case "木":
      return "text-[color:var(--color-wuxing-mu)]";
    case "金":
      return "text-[color:var(--color-wuxing-jin)]";
    case "土":
      return "text-[color:var(--color-wuxing-tu)]";
    default:
      return "text-paper-200";
  }
}

function starName(num: number): string {
  const profile = NINE_STARS[num - 1];
  return profile ? profile.name : `${num}`;
}

function isWangShanWangXiang(combination: string): boolean {
  return combination.includes("旺山旺向");
}

export default function XuanKongGrid({ xk }: { xk: XuanKongResult | null }) {
  if (!xk) {
    return (
      <div className="panel-console p-5 sm:p-6">
        <h3 className="console-title mb-3 text-base">
          <span className="seq">02</span>玄空飞星
        </h3>
        <p className="text-sm text-paper-400">
          需补充坐山、朝向与建造/起运年份，方可排玄空飞星盘。
        </p>
      </div>
    );
  }

  const combos = xk.combinations ?? [];
  const auspiciousCount = combos.filter((c: XuanKongCombination) => c.kind === "auspicious").length;
  const inauspiciousCount = combos.filter((c: XuanKongCombination) => c.kind === "inauspicious").length;
  const wang = isWangShanWangXiang(xk.formation);
  const wangStar = xk.period.yunStar;

  return (
    <div className="panel-console hud-frame space-y-5 p-5 sm:p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="console-title text-base">
          <span className="seq">02</span>玄空飞星
        </h3>
        <span className="seal anim-seal text-xs">{xk.formation}</span>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="console-label">元运</dt>
          <dd className="mt-0.5 text-base font-bold text-paper-50">
            {xk.period.yuan} · {xk.period.yun}运
          </dd>
        </div>
        <div>
          <dt className="console-label">当旺之星</dt>
          <dd className={`mt-0.5 text-base font-bold ${wuxingClass(wangStar)}`}>
            {starName(wangStar)}（<span className="console-value">{wangStar}</span>）
          </dd>
        </div>
        <div>
          <dt className="console-label">坐山 / 朝向</dt>
          <dd className="mt-0.5 text-base text-paper-50">
            {xk.sitMountain} → {xk.facingMountain}
          </dd>
        </div>
        <div>
          <dt className="console-label">运盘区间</dt>
          <dd className="mt-0.5 console-value text-base text-paper-200">
            {xk.period.startYear}–{xk.period.endYear}
          </dd>
        </div>
      </dl>

      <div className="mx-auto max-w-md">
        <div className="hud-frame hud-scan relative grid grid-cols-3 gap-1.5 rounded-lg border border-gold-500/20 bg-ink-950/60 p-2">
          <ScanOverlay />
          {PALACE_GRID.flatMap((row, ri) =>
            row.map((gongNum, ci) => {
              const palace = palaceByNumber(xk.palaces, gongNum);
              const isCenter = gongNum === 5;
              const hasWangStar =
                !!palace && (palace.shanStar === wangStar || palace.xiangStar === wangStar);
              return (
                <div
                  key={`${ri}-${ci}-${gongNum}`}
                  className={`anim-scale-in relative flex min-h-[90px] flex-col justify-between rounded-md border p-1.5 text-center ${
                    isCenter
                      ? "border-gold-500/30 bg-ink-800"
                      : "border-ink-600 bg-ink-900"
                  }`}
                  style={{ animationDelay: `${FLY_ORDER_DELAY[gongNum] ?? 0}ms` }}
                >
                  {hasWangStar && (
                    <div className="anim-glow pointer-events-none absolute inset-0 rounded-md" />
                  )}
                  <div className="flex items-center justify-between text-[10px] text-paper-400">
                    <span className="console-label">{gongNum === 5 ? "中" : `${palace?.name ?? gongNum}`}</span>
                    <span>{palace?.direction ?? ""}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    {isCenter ? (
                      <span className="text-[10px] text-gold-500">○ 中宫 ○</span>
                    ) : (
                      palace && (
                        <>
                          <span className={`text-base font-bold ${wuxingClass(palace.shanStar)}`}>
                            {starName(palace.shanStar)}
                            <span className="ml-0.5 text-[10px] text-paper-500">
                              {palace.shanStar}
                            </span>
                          </span>
                          <span className={`text-base font-bold ${wuxingClass(palace.xiangStar)}`}>
                            {starName(palace.xiangStar)}
                            <span className="ml-0.5 text-[10px] text-paper-500">
                              {palace.xiangStar}
                            </span>
                          </span>
                        </>
                      )
                    )}
                  </div>
                  <div className="flex items-center justify-center text-[10px] text-paper-400">
                    <span className="console-label mr-1">运</span>
                    <span className="console-value">{isCenter ? "—" : palace ? palace.yunStar : "—"}</span>
                  </div>
                </div>
              );
            }),
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-paper-500">
          每宫上：山星　下：向星　右上：方位名　底部：运星
        </p>
      </div>

      <section>
        <h4 className="console-title mb-2 text-sm">
          <span className="seq">03</span>格局组合
        </h4>
        {combos.length === 0 ? (
          <p className="text-xs text-paper-400">本局未触发特殊格局。</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {combos.map((c: XuanKongCombination, idx: number) => (
              <li
                key={`${c.name}-${idx}`}
                className={`anim-fade-up rounded-md border px-3 py-2 ${
                  c.kind === "auspicious"
                    ? "border-jade-400/25 bg-jade-500/5 text-jade-400"
                    : "border-cinnabar-500/25 bg-cinnabar-500/5 text-cinnabar-400"
                }`}
                style={{ animationDelay: `${Math.min(idx * 80, 560)}ms` }}
              >
                <span className="font-bold">{c.name}</span>
                <span className="ml-2 text-paper-400">{c.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gold-500/15 bg-ink-900/60 p-3 text-xs leading-relaxed text-paper-300">
        <h5 className="console-label mb-1 text-gold-300">当旺解读</h5>
        <p>
          本宅坐 <span className="font-bold text-paper-50">{xk.sitMountain}</span>，朝{" "}
          <span className="font-bold text-paper-50">{xk.facingMountain}</span>，入
          {xk.period.yuan} · {xk.period.yun}运，当旺之星为{" "}
          <span className={`font-bold ${wuxingClass(wangStar)}`}>{starName(wangStar)}</span>
          。格局「{xk.formation}」{wang ? "，山向皆旺，最为可贵" : "，需视各宫组合细辨"}。
        </p>
        <p className="mt-1 text-paper-400">
          <span className="console-value">{auspiciousCount}</span> 处吉格 · <span className="console-value">{inauspiciousCount}</span> 处凶格 · 到山到向需配合元运使用，不可孤立判断。
        </p>
      </section>
    </div>
  );
}