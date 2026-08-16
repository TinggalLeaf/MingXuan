
import type { QizhengCalculationContext } from "mingyu-core/qizheng";

export interface QizhengContextProps {
  ctx: QizhengCalculationContext;
  mingGong: number;
  shenGong: number;
  mingZhu: string;
}

export default function QizhengContext({ ctx, mingGong, shenGong, mingZhu }: QizhengContextProps) {
  return (
    <div className="panel-console hud-frame grid gap-4 p-4 sm:p-5 sm:grid-cols-2">
      <div>
        <h3 className="console-title text-base">
          <span className="seq">01</span>命盘核心
        </h3>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="console-label self-center">命宫</dt>
          <dd className="text-paper-200">第 <span className="console-value">{mingGong}</span> 宫</dd>
          <dt className="console-label self-center">身宫</dt>
          <dd className="text-paper-200">第 <span className="console-value">{shenGong}</span> 宫</dd>
          <dt className="console-label self-center">命主</dt>
          <dd className="text-gold-300 font-bold console-value">{mingZhu}</dd>
          <dt className="console-label self-center">本地时间</dt>
          <dd className="console-value text-paper-200">{ctx.localDateTime}</dd>
          <dt className="console-label self-center">UTC</dt>
          <dd className="console-value text-paper-200">{ctx.utcDateTime}</dd>
          <dt className="console-label self-center">时区</dt>
          <dd className="console-value text-paper-200">UTC{ctx.timezone >= 0 ? "+" : ""}{ctx.timezone}</dd>
          <dt className="console-label self-center">经度</dt>
          <dd className="console-value text-paper-200">{ctx.longitude.toFixed(4)}°E</dd>
          <dt className="console-label self-center">纬度</dt>
          <dd className="console-value text-paper-200">{ctx.latitude.toFixed(4)}°N</dd>
          <dt className="console-label self-center">地点来源</dt>
          <dd className="text-paper-300">{ctx.locationSource}</dd>
          <dt className="console-label self-center">时区来源</dt>
          <dd className="text-paper-300">{ctx.timezoneSource}</dd>
        </dl>
      </div>

      <div>
        <h3 className="console-title text-base">
          <span className="seq">02</span>宫位时间口径
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-paper-300">
          {ctx.palaceTimeNote ?? "采用传统命身十二宫时间口径。"}
        </p>
        {ctx.coordinatePipeline && ctx.coordinatePipeline.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer console-label">坐标计算链路</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-paper-500">
              {ctx.coordinatePipeline.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}