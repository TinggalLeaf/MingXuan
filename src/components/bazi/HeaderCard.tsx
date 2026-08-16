
import type { BirthProfile } from "mingyu-core";
import type { BaziChartResult } from "mingyu-core/bazi";

interface HeaderCardProps {
  chart: BaziChartResult;
  profile?: BirthProfile;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function HeaderCard({ chart, profile }: HeaderCardProps) {
  const genderLabel = chart.gender === "male" ? "乾造" : chart.gender === "female" ? "坤造" : "命主";
  const name = profile?.name?.trim();
  const solar = `${chart.solarDate.year}年${pad(chart.solarDate.month)}月${pad(chart.solarDate.day)}日`;
  const lunar = `${chart.lunarDate.year}年 ${chart.lunarDate.monthName}${chart.lunarDate.dayName}`;
  const timeInfo = chart.timeInfo;

  return (
    <section className="panel-console hud-frame relative overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold-500/8 blur-3xl" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="console-label mb-2 flex items-center gap-2">
            <span className="seal anim-seal h-7 w-7 text-sm">命</span>
            <span>八字命盘</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-paper-50 sm:text-3xl">
            {name || "匿名命主"}
            <span className="ml-2 align-middle text-base font-bold text-gold-300">· {genderLabel}</span>
          </h1>
        </div>

        <div className="flex flex-col items-end gap-1 text-right text-[11px] text-paper-300">
          <div>
            <span className="console-label mr-1">公历</span>
            <span className="console-value">{solar}</span>
          </div>
          <div>
            <span className="console-label mr-1">农历</span>
            <span className="console-value">{lunar}</span>
          </div>
          <div>
            <span className="console-label mr-1">出生</span>
            <span className="console-value">{timeInfo?.range ?? "—"}（{timeInfo?.name ?? "—"}）</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Info label="生肖" value={chart.zodiac} index={0} />
        <Info label="星座" value={chart.constellation} index={1} />
        <Info label="日主" value={chart.dayMaster.gan} highlight index={2} />
        <Info label="月令" value={`${chart.pillars.month.zhi}${chart.monthCommander ? `（${chart.monthCommander}司令）` : ""}`} index={3} />
        <Info label="命宫" value={chart.mingGong} highlight index={4} />
        <Info label="身宫" value={chart.shenGong} index={5} />
        <Info label="胎元" value={chart.taiYuan} index={6} />
        <Info label="胎息" value={chart.taiXi} index={7} />
      </div>

      {chart.mingGua?.gua && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-paper-300">
          <span className="console-value rounded border border-gold-500/30 bg-gold-500/10 px-2 py-0.5">
            命卦 {chart.mingGua.gua} · {chart.mingGua.star} · {chart.mingGua.eastWest}
          </span>
          {chart.seasonInfo?.currentJieqi && (
            <span className="rounded border border-paper-500/30 bg-ink-900/40 px-2 py-0.5">
              <span className="console-label mr-1">节气</span>
              <span className="console-value">{chart.seasonInfo.currentJieqi} → {chart.seasonInfo.nextJieqi}</span>
            </span>
          )}
          {chart.timing?.birthPlace && (
            <span className="rounded border border-paper-500/30 bg-ink-900/40 px-2 py-0.5">
              <span className="console-label mr-1">真太阳时</span>
              <span className="console-value">{chart.timing.birthPlace}（{chart.timing.totalCorrectionMinutes >= 0 ? "+" : ""}{chart.timing.totalCorrectionMinutes} 分钟）</span>
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function Info({ label, value, highlight, index = 0 }: { label: string; value: string; highlight?: boolean; index?: number }) {
  return (
    <div
      className="anim-fade-up rounded-lg border border-gold-500/15 bg-ink-900/40 p-2 text-center"
      style={{ animationDelay: `${200 + index * 60}ms` }}
    >
      <div className="console-label">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${highlight ? "text-gold-300 console-value" : "text-paper-100"}`}>{value}</div>
    </div>
  );
}