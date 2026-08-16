
/**
 * 人生K线 · 单年详批面板
 * 点击蜡烛后在右侧或弹层显示：年龄/年份/干支/大运、十神、冲合刑害、六维条形、断语、OHLC
 */

import type { KLinePoint } from "@/lib/kline/types";
import { charWuxingClass } from "@/lib/wuxing";

const DIM_LABEL: Array<[keyof KLinePoint["dimensionScores"], string]> = [
  ["career", "事业"],
  ["wealth", "财富"],
  ["marriage", "姻缘"],
  ["health", "健康"],
  ["family", "六亲"],
];

export interface YearDetailProps {
  point: KLinePoint;
  onClose?: () => void;
}

export default function YearDetail({ point, onClose }: YearDetailProps) {
  const gz = point.ganZhi;
  const gzCls0 = charWuxingClass(gz.charAt(0));
  const gzCls1 = charWuxingClass(gz.charAt(1));
  const up = point.close >= point.open;

  return (
    <div className="panel-console hud-frame anim-fade-right space-y-4 p-5">
      <header className="flex items-start justify-between gap-3 border-b border-gold-500/15 pb-3">
        <div>
          <div className="console-label">
            <span className="console-value">{point.year}</span> 年 · <span className="console-value">{point.age}</span> 岁 · YEAR DETAIL
          </div>
          <h3 className="console-title mt-1 text-base">
            <span className="seq">DT</span>
            <span className={`gz-char ${gzCls0}`}>{gz.charAt(0)}</span>
            <span className={`gz-char ${gzCls1}`}>{gz.charAt(1)}</span>
            <span className="text-sm text-paper-400">流年干支</span>
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gold-500/20 px-2 py-1 text-xs text-paper-400 hover:border-gold-500 hover:text-gold-300"
          >
            关闭
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">天干十神</div>
          <div className="text-base font-bold text-gold-300">{point.tenGod}</div>
        </div>
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">地支主气</div>
          <div className="text-base font-bold text-gold-300">{point.tenGodZhi}</div>
        </div>
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">所属大运</div>
          <div className="text-base text-paper-100">
            {point.daYun}（<span className="console-value">{point.daYunStartAge}</span> 岁起）
          </div>
        </div>
        <div className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2">
          <div className="console-label">流年五行</div>
          <div className="text-base text-paper-100">{point.wuxing}</div>
        </div>
      </div>

      <div>
        <div className="console-label mb-1">K 线四值 · OHLC</div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "开", val: point.open },
            { label: "收", val: point.close },
            { label: "高", val: point.high },
            { label: "低", val: point.low },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-md border border-gold-500/15 bg-ink-900/60 px-2 py-2"
            >
              <div className="console-label">{c.label}</div>
              <div className="text-lg font-bold console-value text-paper-50">{c.val}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center text-xs text-paper-400">
          均分 <span className="text-gold-300 font-bold console-value">{point.score}</span>
          <span className={`ml-2 ${up ? "text-cinnabar-400" : "text-jade-400"}`}>
            {up ? "▲ 阳线" : "▼ 阴线"}
          </span>
        </div>
      </div>

      <div>
        <div className="console-label mb-2">六维走势</div>
        <div className="space-y-1.5">
          {DIM_LABEL.map(([k, label]) => {
            const v = point.dimensionScores[k];
            const pct = Math.max(0, Math.min(100, v));
            return (
              <div key={k} className="flex items-center gap-2">
                <div className="console-label w-12">{label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full bg-gold-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="console-value w-10 text-right text-xs">
                  {v.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="console-label mb-1">冲合刑害</div>
        {point.relations.length === 0 ? (
          <div className="text-xs text-paper-400">无显著关系。</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {point.relations.map((r, idx) => (
              <span
                key={idx}
                className={`seal anim-seal text-[10px] tracking-normal ${
                  r.delta >= 0 ? "" : ""
                }`}
                style={{
                  background:
                    r.delta >= 0 ? "var(--color-gold-500)" : "var(--color-cinnabar-500)",
                  animationDelay: `${idx * 100}ms`,
                }}
                title={`${r.between}（${r.delta > 0 ? "+" : ""}${r.delta}）`}
              >
                {r.kind}
              </span>
            ))}
          </div>
        )}
        {point.relations.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-paper-400">
            {point.relations.map((r, idx) => (
              <li key={idx}>
                <span className={r.delta >= 0 ? "text-gold-300" : "text-cinnabar-400"}>
                  {r.kind}
                </span>
                ：{r.between}
                <span className="ml-2 console-value text-paper-500">
                  ({r.delta > 0 ? "+" : ""}{r.delta})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="console-label mb-1">流年断语</div>
        <p className="rounded-md border border-gold-500/15 bg-ink-900/60 px-3 py-2 text-sm leading-relaxed text-paper-100">
          {point.reason}
        </p>
      </div>
    </div>
  );
}
