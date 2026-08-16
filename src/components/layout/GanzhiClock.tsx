import { useEffect, useState } from "react";
import { SolarTime } from "tyme4ts";

/** 实时干支时钟（公历 + 农历 + 四柱干支，每秒刷新） */
export default function GanzhiClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  let gz = "";
  let lunar = "";
  try {
    const st = SolarTime.fromYmdHms(
      now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours(), now.getMinutes(), now.getSeconds()
    );
    const lh = st.getLunarHour();
    const ec = lh.getEightChar();
    gz = `${ec.getYear()} ${ec.getMonth()} ${ec.getDay()} ${ec.getHour()}`;
    lunar = `农历${lh.getLunarDay().getLunarMonth().getName()}${lh.getLunarDay().getName()}`;
  } catch {
    /* ignore */
  }

  const clock = now.toLocaleTimeString("zh-CN", { hour12: false });

  if (compact) {
    return (
      <span className="font-mono text-[11px] tracking-wider text-cyber-300/80">
        {gz} · {clock}
      </span>
    );
  }

  return (
    <div className="font-mono text-[11px] leading-relaxed text-paper-400">
      <div className="flex items-center gap-2">
        <span className="hud-dot" />
        <span className="text-cyber-300">{clock}</span>
      </div>
      <div className="mt-1 text-gold-400/90">{gz}</div>
      <div className="text-paper-500">{lunar}</div>
    </div>
  );
}
