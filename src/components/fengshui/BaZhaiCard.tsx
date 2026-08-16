
import { direction } from "mingyu-core";
import type { BaZhaiResult } from "mingyu-core/bazhai";
import type { BaZhaiPalace } from "mingyu-core/direction";

const MOUNTAIN_TO_BAGUA: Record<string, string> = direction.MOUNTAIN_TO_BAGUA;
const GUA_LABEL: Record<string, string> = {
  坎: "坎 ☵", 坤: "坤 ☷", 震: "震 ☳", 巽: "巽 ☴",
  乾: "乾 ☰", 兑: "兑 ☱", 艮: "艮 ☶", 离: "离 ☲",
};

function palaceText(p: BaZhaiPalace): string {
  return `${GUA_LABEL[p.gua] ?? p.gua} · ${p.direction} (${p.degree}°)`;
}

/**
 * 八宅命卦卡：展示命卦、宅卦、命宅配合、八宫吉凶盘、四吉四凶方位。
 */
export default function BaZhaiCard({ bazhai }: { bazhai: BaZhaiResult | null }) {
  if (!bazhai) {
    return (
      <div className="panel-console p-5 sm:p-6">
        <h3 className="console-title mb-3 text-base">
          <span className="seq">01</span>八宅命卦
        </h3>
        <p className="text-sm text-paper-400">需补充出生年/性别与坐山信息方可推算。</p>
      </div>
    );
  }

  const mingGuaLabel = GUA_LABEL[bazhai.mingGua] ?? bazhai.mingGua;
  const houseGuaLabel = bazhai.houseGua ? GUA_LABEL[bazhai.houseGua] ?? bazhai.houseGua : "—";

  return (
    <div className="panel-console hud-frame space-y-5 p-5 sm:p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="console-title text-base">
          <span className="seq">01</span>八宅命卦
        </h3>
        <span className={`seal anim-seal text-xs ${bazhai.match === "相合" ? "" : ""}`}>
          命宅 {bazhai.match}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="console-label">命卦</dt>
          <dd className="mt-0.5 console-value text-base font-bold text-paper-50">{mingGuaLabel}</dd>
        </div>
        <div>
          <dt className="console-label">所属</dt>
          <dd className="mt-0.5 text-base text-gold-300">{bazhai.mingGroup}</dd>
        </div>
        <div>
          <dt className="console-label">宅卦</dt>
          <dd className="mt-0.5 text-base text-paper-50">{houseGuaLabel}</dd>
        </div>
        <div>
          <dt className="console-label">所属</dt>
          <dd className="mt-0.5 text-base text-gold-300">{bazhai.houseGroup ?? "—"}</dd>
        </div>
      </dl>

      <p className="rounded-lg border border-gold-500/15 bg-ink-900/60 px-3 py-2 text-xs leading-relaxed text-paper-300">
        {bazhai.matchAdvice}
      </p>

      <section>
        <h4 className="console-title mb-2 text-sm">
          <span className="seq">02</span>命卦大游年盘
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="border-b border-gold-500/15 text-paper-400">
                <th className="console-label px-2 py-1 text-left">方位</th>
                <th className="console-label px-2 py-1 text-left">卦</th>
                <th className="console-label px-2 py-1 text-left">星</th>
                <th className="console-label px-2 py-1 text-left">吉凶</th>
              </tr>
            </thead>
            <tbody>
              {bazhai.mingPalace.map((p: BaZhaiPalace, pIdx: number) => (
                <tr
                  key={p.gua + p.direction}
                  className="anim-fade-up border-b border-ink-700/50"
                  style={{ animationDelay: `${pIdx * 55}ms` }}
                >
                  <td className="px-2 py-1.5 text-paper-200">{palaceText(p)}</td>
                  <td className="px-2 py-1.5 text-paper-300">{GUA_LABEL[p.gua] ?? p.gua}</td>
                  <td className="px-2 py-1.5 text-paper-200">{p.label}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`anim-pop inline-block rounded px-2 py-0.5 text-[11px] ${
                        p.luck === "吉"
                          ? "bg-jade-500/20 text-jade-400"
                          : "bg-cinnabar-500/20 text-cinnabar-400"
                      }`}
                      style={{ animationDelay: `${pIdx * 55 + 140}ms` }}
                    >
                      {p.luck}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {bazhai.housePalace && (
        <section>
          <h4 className="console-title mb-2 text-sm">
            <span className="seq">03</span>宅卦大游年盘
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-gold-500/15 text-paper-400">
                  <th className="console-label px-2 py-1 text-left">方位</th>
                  <th className="console-label px-2 py-1 text-left">卦</th>
                  <th className="console-label px-2 py-1 text-left">星</th>
                  <th className="console-label px-2 py-1 text-left">吉凶</th>
                </tr>
              </thead>
              <tbody>
                {bazhai.housePalace.map((p: BaZhaiPalace, pIdx: number) => (
                  <tr
                    key={"h" + p.gua + p.direction}
                    className="anim-fade-up border-b border-ink-700/50"
                    style={{ animationDelay: `${pIdx * 55}ms` }}
                  >
                    <td className="px-2 py-1.5 text-paper-200">{palaceText(p)}</td>
                    <td className="px-2 py-1.5 text-paper-300">{GUA_LABEL[p.gua] ?? p.gua}</td>
                    <td className="px-2 py-1.5 text-paper-200">{p.label}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`anim-pop inline-block rounded px-2 py-0.5 text-[11px] ${
                          p.luck === "吉"
                            ? "bg-jade-500/20 text-jade-400"
                            : "bg-cinnabar-500/20 text-cinnabar-400"
                        }`}
                        style={{ animationDelay: `${pIdx * 55 + 140}ms` }}
                      >
                        {p.luck}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-jade-400/30 bg-jade-500/5 p-3">
          <h5 className="console-label text-jade-400">四吉方（可用）</h5>
          <ul className="mt-2 space-y-1 text-xs text-paper-200">
            {bazhai.luckyDirections.length === 0 ? (
              <li className="text-paper-500">—</li>
            ) : (
              bazhai.luckyDirections.map((p: BaZhaiPalace, pIdx: number) => (
                <li
                  key={"l" + p.gua}
                  className="anim-pop"
                  style={{ animationDelay: `${300 + pIdx * 80}ms` }}
                >
                  {p.label} · {GUA_LABEL[p.gua] ?? p.gua} · {p.direction}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-cinnabar-500/30 bg-cinnabar-500/5 p-3">
          <h5 className="console-label text-cinnabar-400">四凶方（避忌）</h5>
          <ul className="mt-2 space-y-1 text-xs text-paper-200">
            {bazhai.unluckyDirections.length === 0 ? (
              <li className="text-paper-500">—</li>
            ) : (
              bazhai.unluckyDirections.map((p: BaZhaiPalace, pIdx: number) => (
                <li
                  key={"u" + p.gua}
                  className="anim-pop"
                  style={{ animationDelay: `${300 + pIdx * 80}ms` }}
                >
                  {p.label} · {GUA_LABEL[p.gua] ?? p.gua} · {p.direction}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-paper-500">
        注：命卦大游年盘基于命卦推得；宅卦大游年盘基于坐山推得。八宫归属：{bazhai.houseGua ? MOUNTAIN_TO_BAGUA[bazhai.houseGua] ?? "—" : "—"}
      </p>
    </div>
  );
}