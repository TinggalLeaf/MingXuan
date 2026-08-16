
export interface LocationFieldsProps {
  value: { longitude: string; latitude: string };
  onChange: (v: { longitude: string; latitude: string }) => void;
}

/**
 * 星盘与七政四余排盘所需的出生地经纬度补充输入。纬度可默认北京。
 */
export default function LocationFields({ value, onChange }: LocationFieldsProps) {
  return (
    <div className="panel-console space-y-3 p-4 sm:p-5">
      <div className="console-label text-center">MINGXUAN // LOCATION</div>
      <h3 className="console-title justify-center text-center text-base">
        <span className="seq">LOC</span>出生地经纬度
      </h3>
      <p className="text-center text-[11px] text-paper-500">
        星盘 / 七政四余需要精确坐标。不确定时默认北京（39.90°N, 116.40°E）。
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="console-label mb-1 block">LON · 经度（°E）</span>
          <input
            className="input-xuan w-full"
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: e.target.value })}
            placeholder="116.40"
          />
        </label>
        <label className="block">
          <span className="console-label mb-1 block">LAT · 纬度（°N）</span>
          <input
            className="input-xuan w-full"
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: e.target.value })}
            placeholder="39.90"
          />
        </label>
      </div>
    </div>
  );
}