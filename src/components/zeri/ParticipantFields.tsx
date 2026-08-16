import { SHICHEN_OPTIONS } from "@/components/birth/BirthForm";

export interface ParticipantInput {
  id: string;
  name: string;
  gender: "男" | "女" | "";
  year: string;
  month: string;
  day: string;
  timeIndex: string;
  dateType: "solar" | "lunar";
  isLeapMonth: boolean;
}

export interface ParticipantFieldsProps {
  participant: ParticipantInput;
  onChange: (p: ParticipantInput) => void;
  onRemove: () => void;
  index: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 121 }, (_, i) => CURRENT_YEAR - 100 + i);

/**
 * 择日参与人简易档案：与 mingyu-core AlamanacParticipantInput 同构（不含 hour/minute，出生时辰用 timeIndex）。
 */
export default function ParticipantFields({
  participant,
  onChange,
  onRemove,
  index,
}: ParticipantFieldsProps) {
  return (
    <div className="rounded-lg border border-gold-500/15 bg-ink-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h5 className="console-title text-xs">
          <span className="seq">{String(index + 1).padStart(2, "0")}</span>参与人
        </h5>
        <button
          type="button"
          onClick={onRemove}
          className="console-label text-paper-400 hover:text-cinnabar-400"
        >
          移除 · REMOVE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="console-label mb-0.5 block">NAME · 姓名</span>
          <input
            className="input-xuan w-full text-sm"
            value={participant.name}
            onChange={(e) => onChange({ ...participant, name: e.target.value })}
            placeholder="如张三"
          />
        </label>
        <label className="block">
          <span className="console-label mb-0.5 block">GENDER · 性别</span>
          <select
            className="input-xuan w-full text-sm"
            value={participant.gender}
            onChange={(e) =>
              onChange({ ...participant, gender: e.target.value as "男" | "女" | "" })
            }
          >
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <label className="block">
          <span className="console-label mb-0.5 block">YEAR · 年</span>
          <select
            className="input-xuan w-full text-sm"
            value={participant.year}
            onChange={(e) => onChange({ ...participant, year: e.target.value })}
          >
            <option value="">—</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="console-label mb-0.5 block">MON · 月</span>
          <select
            className="input-xuan w-full text-sm"
            value={participant.month}
            onChange={(e) => onChange({ ...participant, month: e.target.value })}
          >
            <option value="">—</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="console-label mb-0.5 block">DAY · 日</span>
          <select
            className="input-xuan w-full text-sm"
            value={participant.day}
            onChange={(e) => onChange({ ...participant, day: e.target.value })}
          >
            <option value="">—</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="console-label mb-0.5 block">CAL · 历法</span>
          <select
            className="input-xuan w-full text-sm"
            value={participant.dateType}
            onChange={(e) =>
              onChange({ ...participant, dateType: e.target.value as "solar" | "lunar" })
            }
          >
            <option value="solar">公历</option>
            <option value="lunar">农历</option>
          </select>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="console-label mb-0.5 block">SHICHEN · 出生时辰</span>
          <select
            className="input-xuan w-full text-sm"
            value={participant.timeIndex}
            onChange={(e) => onChange({ ...participant, timeIndex: e.target.value })}
          >
            <option value="">—</option>
            {SHICHEN_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {participant.dateType === "lunar" ? (
          <label className="flex items-end gap-2 pb-1 text-xs text-paper-300">
            <input
              type="checkbox"
              checked={participant.isLeapMonth}
              onChange={(e) => onChange({ ...participant, isLeapMonth: e.target.checked })}
              className="accent-gold-500"
            />
            闰月
          </label>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}