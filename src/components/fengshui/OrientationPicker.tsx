
import { direction } from "mingyu-core";

const MOUNTAINS: string[] = direction.TWENTY_FOUR_MOUNTAINS;
const DEGREES: Record<string, number> = direction.BAGUA_DEGREE;

export interface OrientationPickerProps {
  sitMountain: string;
  facingMountain: string;
  onSitChange: (v: string) => void;
  onFacingChange: (v: string) => void;
}

/**
 * 二十四山选择器：坐山 + 朝向。子山 0°，每山 15°。
 * 实际命盘依赖 mingyu-core.direction 提供的罗盘表，避免硬编码偏移。
 */
export default function OrientationPicker({
  sitMountain,
  facingMountain,
  onSitChange,
  onFacingChange,
}: OrientationPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="console-label mb-1 block">SIT · 坐山（房屋背向）</span>
        <select
          className="input-xuan w-full"
          value={sitMountain}
          onChange={(e) => onSitChange(e.target.value)}
        >
          <option value="">请选择</option>
          {MOUNTAINS.map((m) => (
            <option key={m} value={m}>
              {m}山 · {DEGREES[m] ?? 0}°
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="console-label mb-1 block">FACE · 朝向（大门向方）</span>
        <select
          className="input-xuan w-full"
          value={facingMountain}
          onChange={(e) => onFacingChange(e.target.value)}
        >
          <option value="">请选择</option>
          {MOUNTAINS.map((m) => (
            <option key={m} value={m}>
              {m}向 · {DEGREES[m] ?? 0}°
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}