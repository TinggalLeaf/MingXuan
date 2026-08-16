import { useMemo } from "react";
import { SolarDay } from "tyme4ts";

export interface TodayAlmanacProps {
  date: string; // YYYY-MM-DD
}

const ELEMENT_COLOR: Record<string, string> = {
  木: "text-[color:var(--color-wuxing-mu)]",
  火: "text-[color:var(--color-wuxing-huo)]",
  土: "text-[color:var(--color-wuxing-tu)]",
  金: "text-[color:var(--color-wuxing-jin)]",
  水: "text-[color:var(--color-wuxing-shui)]",
};

function parseISODate(s: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function chipColor(_thing: string): string {
  return "border-gold-500/30 text-gold-300 bg-gold-500/5";
}

/**
 * 今日黄历：基于 tyme4ts SolarDay 直接渲染该日公历/农历/干支/节气/宜忌/冲煞/胎神/彭祖百忌/时辰吉凶。
 */
export default function TodayAlmanac({ date }: TodayAlmanacProps) {
  const data = useMemo(() => {
    const parsed = parseISODate(date);
    if (!parsed) return null;
    const [y, m, d] = parsed;
    try {
      const sd = SolarDay.fromYmd(y, m, d);
      const lunar = sd.getLunarDay();
      const cycleDay = sd.getSixtyCycleDay();
      const term = sd.getTerm();
      const termName = term.getName();
      const phase = sd.getPhase();
      const week = sd.getWeek();
      const festival = sd.getFestival();
      const legalHoliday = sd.getLegalHoliday();
      const nineStar = sd.getNineStar();
      const fetal = cycleDay.getFetusDay();
      const gods = cycleDay.getGods();
      const recommends = cycleDay.getRecommends();
      const avoids = cycleDay.getAvoids();
      const duty = cycleDay.getDuty();
      const hours = cycleDay.getHours();
      return {
        solarName: sd.getName(),
        week: week.getName(),
        solarTerm: termName,
        phaseName: phase.getName(),
        festivalName: festival ? festival.getName() : null,
        legalName: legalHoliday ? legalHoliday.getName() : null,
        lunarMonthInChinese: lunar.getLunarMonth().getName(),
        lunarDayInChinese: lunar.getName(),
        ganzhiYear: lunar.getYearSixtyCycle().getName(),
        ganzhiMonth: lunar.getMonthSixtyCycle().getName(),
        ganzhiDay: cycleDay.getSixtyCycle().getName(),
        dayOfficer: duty.getName(),
        twelveStar: cycleDay.getTwelveStar().getName(),
        nineStarName: nineStar.getName(),
        nineStarElement: nineStar.getElement().getName(),
        nineStarColor: nineStar.getColor(),
        nineStarDipper: nineStar.getDipper(),
        nineStarDirection: nineStar.getDirection(),
        fetalName: fetal.getName(),
        godNames: gods.map((g: { getName: () => string; getLuck: () => { getName: () => string } }) => `${g.getName()}(${g.getLuck().getName()})`),
        recommendNames: recommends.map((t: { getName: () => string }) => t.getName()),
        avoidNames: avoids.map((t: { getName: () => string }) => t.getName()),
        pengZuText: cycleDay.getSixtyCycle().getName(),
        hours: hours.map((h: { getSixtyCycle: () => { getName: () => string }; getTwelveStar: () => { getName: () => string }; getNineStar: () => { getName: () => string }; getRecommends: () => Array<{ getName: () => string }>; getAvoids: () => Array<{ getName: () => string }> }) => ({
          name: h.getSixtyCycle().getName(),
          twelveStar: h.getTwelveStar().getName(),
          nineStar: h.getNineStar().getName(),
          recommends: h.getRecommends().map((t: { getName: () => string }) => t.getName()),
          avoids: h.getAvoids().map((t: { getName: () => string }) => t.getName()),
        })),
      };
    } catch {
      return null;
    }
  }, [date]);

  if (!data) {
    return (
      <div className="panel-console p-5 sm:p-6">
        <p className="text-sm text-paper-400">请输入合法公历日期（YYYY-MM-DD）。</p>
      </div>
    );
  }

  return (
    <div key={date} className="panel-console hud-frame anim-unroll space-y-5 p-5 sm:p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-paper-50">{data.solarName}</h3>
          <p className="mt-1 text-xs text-paper-400">
            <span className="console-label mr-1">WEEK</span>{data.week}
            <span className="console-label ml-2 mr-1">TERM</span>{data.solarTerm}
            <span className="console-label ml-2 mr-1">PHASE</span>{data.phaseName}
          </p>
        </div>
        <span className="seal anim-seal inline-block text-xs">{data.ganzhiYear} 年</span>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="console-label">LUNAR · 农历</dt>
          <dd className="mt-0.5 text-base text-paper-100">
            {data.lunarMonthInChinese}月{data.lunarDayInChinese}
          </dd>
        </div>
        <div>
          <dt className="console-label">GANZHI · 干支</dt>
          <dd className="mt-0.5 text-base text-paper-100">
            {data.ganzhiYear} {data.ganzhiMonth} {data.ganzhiDay}
          </dd>
        </div>
        <div>
          <dt className="console-label">建除十二神</dt>
          <dd className="mt-0.5 text-base text-gold-300">
            {data.dayOfficer} · {data.twelveStar}
          </dd>
        </div>
        <div>
          <dt className="console-label">NINE STAR · 九星</dt>
          <dd className={`mt-0.5 text-base ${ELEMENT_COLOR[data.nineStarElement] ?? "text-paper-100"}`}>
            {data.nineStarName}
            <span className="ml-1 text-[11px] text-paper-400">（{data.nineStarElement}）</span>
          </dd>
        </div>
      </dl>

      {data.festivalName && (
        <p className="rounded-md border border-cinnabar-500/30 bg-cinnabar-500/5 px-3 py-2 text-xs text-cinnabar-400">
          <span className="console-label mr-2 text-cinnabar-400">FESTIVAL · 节日</span>
          {data.festivalName}
        </p>
      )}
      {data.legalName && (
        <p className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2 text-xs text-gold-300">
          <span className="console-label mr-2 text-gold-300">HOLIDAY · 法定假日</span>
          {data.legalName}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-jade-400/25 bg-jade-500/5 p-3">
          <h5 className="console-label text-jade-400">宜 · RECOMMEND</h5>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {data.recommendNames.length > 0 ? (
              data.recommendNames.map((t, i) => (
                <li
                  key={i}
                  className={`rounded border px-2 py-0.5 text-[11px] ${chipColor(t)}`}
                >
                  {t}
                </li>
              ))
            ) : (
              <li className="text-xs text-paper-500">—</li>
            )}
          </ul>
        </div>
        <div className="rounded-md border border-cinnabar-500/25 bg-cinnabar-500/5 p-3">
          <h5 className="console-label text-cinnabar-400">忌 · AVOID</h5>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {data.avoidNames.length > 0 ? (
              data.avoidNames.map((t, i) => (
                <li
                  key={i}
                  className="rounded border px-2 py-0.5 text-[11px] border-cinnabar-500/30 bg-cinnabar-500/5 text-cinnabar-400"
                >
                  {t}
                </li>
              ))
            ) : (
              <li className="text-xs text-paper-500">—</li>
            )}
          </ul>
        </div>
      </div>

      <section>
        <h4 className="console-title mb-2 text-sm">
          <span className="seq">01</span>神煞 / 胎神 / 彭祖百忌
        </h4>
        <ul className="space-y-1 text-xs text-paper-200">
          <li>
            <span className="console-label mr-2">神煞</span>
            {data.godNames.length > 0 ? data.godNames.join(" · ") : "—"}
          </li>
          <li>
            <span className="console-label mr-2">胎神</span>
            {data.fetalName}
          </li>
          <li>
            <span className="console-label mr-2">日干支（彭祖百忌基）</span>
            {data.pengZuText}
          </li>
        </ul>
      </section>

      <section>
        <h4 className="console-title mb-2 text-sm">
          <span className="seq">02</span>十二时辰吉凶
        </h4>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {data.hours.map((h, idx) => (
            <div
              key={idx}
              className="anim-fade-up rounded-md border border-ink-600 bg-ink-900/60 px-2 py-1.5 text-[11px]"
              style={{ animationDelay: `${idx * 45}ms` }}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-paper-100">{h.name} 时</span>
                <span className="console-label text-paper-400">{h.twelveStar}</span>
              </div>
              <p className="mt-0.5 text-jade-400">
                {h.recommends.length > 0 ? `宜 ${h.recommends.join(" ")}` : ""}
              </p>
              {h.avoids.length > 0 && (
                <p className="text-cinnabar-400">忌 {h.avoids.join(" ")}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}