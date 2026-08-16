export interface HepanLocationValue {
  longitude: string;
  latitude: string;
}

export interface HepanLocationFieldsProps {
  value: HepanLocationValue;
  onChange: (v: HepanLocationValue) => void;
  /** 显示在标题旁的提示文字 */
  hint?: string;
}

/**
 * 合盘模块本地经纬度输入（星盘合盘使用）。
 * 与 components/astrolabe/LocationFields 行为一致，但放在合盘组件内复用。
 */
export default function HepanLocationFields({ value, onChange, hint }: HepanLocationFieldsProps) {
  return (
    <div className="panel-console space-y-3 p-4 sm:p-5">
      <div className="console-label mb-1 text-center">MINGXUAN // COMPATIBILITY</div>
      <h3 className="console-title justify-center text-base">
        <span className="seq">LOC</span>出生地经纬度
      </h3>
      <p className="text-center text-[11px] text-paper-500">
        {hint ?? "星盘合盘需要精确坐标；不确定时默认北京（39.90°N, 116.40°E）。"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="console-label mb-1 block">LON · 经度（°E）</span>
          <input
            className="input-xuan w-full font-mono"
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: e.target.value })}
            placeholder="116.40"
          />
        </label>
        <label className="block">
          <span className="console-label mb-1 block">LAT · 纬度（°N）</span>
          <input
            className="input-xuan w-full font-mono"
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: e.target.value })}
            placeholder="39.90"
          />
        </label>
      </div>
    </div>
  );
}