import { useState } from "react";
import { Coins, RotateCcw } from "lucide-react";

interface LiuYaoThrowProps {
  /** 当前已得到的爻值数组（6/7/8/9），按初爻到上爻 */
  yaos: number[];
  setYaos: (v: number[]) => void;
  /** 投掷记录，按初爻到上爻 */
  coinThrows: Array<{ coins: [2 | 3, 2 | 3, 2 | 3]; total: 6 | 7 | 8 | 9 }>;
  setCoinThrows: (v: Array<{ coins: [2 | 3, 2 | 3, 2 | 3]; total: 6 | 7 | 8 | 9 }>) => void;
  /** 投满六爻后回调（用于立即起卦） */
  onComplete?: () => void;
}

const TOTAL_LABEL: Record<number, string> = {
  6: "老阴 ⚊⚋ 动",
  7: "少阳 ⚊ 刚",
  8: "少阴 ⚋ 柔",
  9: "老阳 ⚊⚊ 动",
};

/** 随机生成一次三钱投掷 */
function rollOnce(): { coins: [2 | 3, 2 | 3, 2 | 3]; total: 6 | 7 | 8 | 9 } {
  const coins: [2 | 3, 2 | 3, 2 | 3] = [
    Math.random() < 0.5 ? 2 : 3,
    Math.random() < 0.5 ? 2 : 3,
    Math.random() < 0.5 ? 2 : 3,
  ];
  const total = (coins[0] + coins[1] + coins[2]) as 6 | 7 | 8 | 9;
  return { coins, total };
}

export default function LiuYaoThrow({
  yaos,
  setYaos,
  coinThrows,
  setCoinThrows,
  onComplete,
}: LiuYaoThrowProps) {
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (yaos.length >= 6 || rolling) return;
    setRolling(true);
    setTimeout(() => {
      const r = rollOnce();
      setYaos([...yaos, r.total]);
      setCoinThrows([...coinThrows, r]);
      setRolling(false);
      if (yaos.length + 1 === 6 && onComplete) {
        setTimeout(() => onComplete(), 250);
      }
    }, 350);
  };

  const handleReset = () => {
    setYaos([]);
    setCoinThrows([]);
  };

  const finished = yaos.length >= 6;

  return (
    <section className="panel-console p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="console-label text-paper-400">手摇三钱（初爻至上爻）</span>
        <span className="console-value text-xs">
          {String(yaos.length).padStart(2, "0")} / 06
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[...Array(6)].map((_, idx) => {
          const v = yaos[idx];
          return (
            <div
              key={`${idx}-${v ?? "empty"}`}
              className={`flex h-16 flex-col items-center justify-center rounded-lg border border-gold-500/15 bg-ink-900/50 text-center text-xs ${
                v ? "anim-pop text-paper-100" : "text-paper-500"
              } ${rolling && idx === yaos.length ? "anim-shake" : ""}`}
            >
              <div className="console-label text-[10px]">第 {String(idx + 1).padStart(2, "0")} 爻</div>
              <div className="mt-1 text-sm font-bold">
                {v ? TOTAL_LABEL[v] : "·"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={`btn-gold text-sm disabled:cursor-not-allowed disabled:opacity-50 ${rolling ? "anim-shake" : ""}`}
          onClick={handleRoll}
          disabled={rolling || finished}
        >
          <Coins className="h-4 w-4" />
          {rolling ? "投掷中…" : finished ? "已满六爻" : `投掷第 ${yaos.length + 1} 爻`}
        </button>
        {yaos.length > 0 && (
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={handleReset}
            disabled={rolling}
          >
            <RotateCcw className="h-4 w-4" />
            重摇
          </button>
        )}
      </div>
    </section>
  );
}