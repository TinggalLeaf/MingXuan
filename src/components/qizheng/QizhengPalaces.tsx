
import type { QizhengStar, QizhengSignBranch } from "mingyu-core/qizheng";

export interface QizhengPalacesProps {
  palaces: { palace: string; signIndex: number; signBranch: QizhengSignBranch }[];
  stars: QizhengStar[];
  mingGong: number;
}

export default function QizhengPalaces({ palaces, stars, mingGong }: QizhengPalacesProps) {
  const starsByPalace = new Map<string, QizhengStar[]>();
  for (const s of stars) {
    const arr = starsByPalace.get(s.palace) ?? [];
    arr.push(s);
    starsByPalace.set(s.palace, arr);
  }

  return (
    <div className="panel-console p-4 sm:p-5">
      <h3 className="console-title mb-3 text-base">
        <span className="seq">03</span>十二宫位
        <span className="ml-2 console-value text-xs">命宫 = 第 {mingGong} 宫</span>
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {palaces.map((p, idx) => {
          const starList = starsByPalace.get(p.palace) ?? [];
          const isMing = idx + 1 === mingGong;
          return (
            <div
              key={p.signBranch}
              className={`panel-console hud-frame anim-scale-in p-3 ${isMing ? "ring-1 ring-cinnabar-500/55" : ""}`}
              style={{ animationDelay: `${Math.min(idx * 50, 550)}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="console-label">第 {idx + 1} 宫</span>
                <span className="text-base font-bold text-gold-300">{p.palace}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="gz-char text-[16px] leading-none text-paper-200">
                  {p.signBranch}
                </span>
                <span className="console-value text-[10px]">宫支 {p.signBranch}</span>
              </div>
              <div className="mt-2 border-t border-gold-500/10 pt-1.5">
                {starList.length === 0 ? (
                  <p className="text-[11px] text-paper-500">无星曜</p>
                ) : (
                  <ul className="space-y-0.5 text-xs">
                    {starList.map((s) => (
                      <li key={s.name} className="flex items-center justify-between">
                        <span
                          className={
                            s.kind === "七政"
                              ? "font-bold text-paper-200"
                              : "text-cinnabar-400"
                          }
                        >
                          {s.name}
                        </span>
                        <span className="console-value text-[10px]">
                          {s.xiu}
                          {s.retrograde ? " ·逆" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}