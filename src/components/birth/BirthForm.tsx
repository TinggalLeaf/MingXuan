import { useEffect, useState } from "react";
import type { BirthProfile } from "mingyu-core";
import { paipanDefaults } from "@/lib/config";
import {
  loadProfiles,
  saveProfile,
  deleteProfile,
  profileSummary,
  type SavedProfile,
} from "@/lib/profiles";
import { searchLocation, type LocationResult } from "@/lib/location";
import { Search, Loader2 } from "lucide-react";

export const SHICHEN_OPTIONS = [
  { value: 0, label: "早子时 00:00–01:00" },
  { value: 1, label: "丑时 01:00–03:00" },
  { value: 2, label: "寅时 03:00–05:00" },
  { value: 3, label: "卯时 05:00–07:00" },
  { value: 4, label: "辰时 07:00–09:00" },
  { value: 5, label: "巳时 09:00–11:00" },
  { value: 6, label: "午时 11:00–13:00" },
  { value: 7, label: "未时 13:00–15:00" },
  { value: 8, label: "申时 15:00–17:00" },
  { value: 9, label: "酉时 17:00–19:00" },
  { value: 10, label: "戌时 19:00–21:00" },
  { value: 11, label: "亥时 21:00–23:00" },
  { value: 12, label: "晚子时 23:00–24:00" },
];

export interface BirthFormProps {
  title?: string;
  submitLabel?: string;
  onSubmit: (profile: BirthProfile) => void;
  loading?: boolean;
}

const currentYear = new Date().getFullYear();

/**
 * 共享出生档案表单：公历/农历、时辰/精确时分、真太阳时开关、出生地点搜索。
 * 输出 mingyu-core 的 BirthProfile。
 */
export default function BirthForm({
  title,
  submitLabel = "开始排盘",
  onSubmit,
  loading,
}: BirthFormProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [year, setYear] = useState(1995);
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [timeMode, setTimeMode] = useState<"shichen" | "precise">("shichen");
  const [timeIndex, setTimeIndex] = useState(6);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [useTrueSolarTime, setUseTrueSolarTime] = useState(paipanDefaults.trueSolarTime);
  const [longitude, setLongitude] = useState("116.40");
  const [latitude, setLatitude] = useState("39.90");
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedProfile[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saveRelation, setSaveRelation] = useState<SavedProfile["relation"]>("本人");
  const [savedTip, setSavedTip] = useState("");

  // 地点搜索
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<LocationResult[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  useEffect(() => {
    setSaved(loadProfiles());
    const onChange = () => setSaved(loadProfiles());
    window.addEventListener("mx-profiles-changed", onChange);
    return () => window.removeEventListener("mx-profiles-changed", onChange);
  }, []);

  // 地点输入防抖搜索
  useEffect(() => {
    if (!locQuery.trim() || locQuery.trim().length < 1) {
      setLocResults([]);
      return;
    }
    const ctrl = setTimeout(async () => {
      setLocLoading(true);
      try {
        const r = await searchLocation(locQuery);
        setLocResults(r);
      } finally {
        setLocLoading(false);
      }
    }, 300);
    return () => clearTimeout(ctrl);
  }, [locQuery]);

  function applyLocation(r: LocationResult) {
    setLocationName(r.name);
    setLongitude(r.longitude.toFixed(4));
    setLatitude(r.latitude.toFixed(4));
    setLocOpen(false);
    setLocQuery("");
    setLocResults([]);
  }

  /** 加载已存命盘到表单 */
  function applySaved(p: SavedProfile) {
    const b = p.profile;
    setName(b.name ?? p.label);
    if (b.gender === "male" || b.gender === "female") setGender(b.gender);
    setCalendarType(b.calendarType);
    setYear(b.year);
    setMonth(b.month);
    setDay(b.day);
    setIsLeapMonth(Boolean(b.isLeapMonth));
    if (b.hour !== undefined) {
      setTimeMode("precise");
      setHour(b.hour);
      setMinute(b.minute ?? 0);
    } else if (b.timeIndex !== undefined) {
      setTimeMode("shichen");
      setTimeIndex(b.timeIndex);
    }
    setUseTrueSolarTime(Boolean(b.useTrueSolarTime));
    if (b.location?.longitude !== undefined) {
      setLongitude(String(b.location.longitude));
      if (b.location.latitude !== undefined) setLatitude(String(b.location.latitude));
    }
  }

  /** 当前表单值 → BirthProfile（提交与保存共用） */
  function buildProfile(): BirthProfile {
    const profile: BirthProfile = {
      name: name || undefined,
      gender,
      calendarType,
      year,
      month,
      day,
      isLeapMonth: calendarType === "lunar" ? isLeapMonth : undefined,
      useTrueSolarTime,
    };
    if (timeMode === "precise" || useTrueSolarTime) {
      profile.hour = hour;
      profile.minute = minute;
    } else {
      profile.timeIndex = timeIndex;
    }
    if (useTrueSolarTime) {
      profile.location = {
        longitude: Number(longitude),
        latitude: Number(latitude) || 0,
        timezone: 8,
      };
    }
    return profile;
  }

  function handleSave() {
    const label = name.trim() || "未命名";
    saveProfile({ label, relation: saveRelation, profile: buildProfile() });
    setShowSave(false);
    setSavedTip(`已保存「${label}」`);
    setTimeout(() => setSavedTip(""), 2500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (year < 1900 || year > 2100) {
      setError("年份需在 1900–2100 之间");
      return;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      setError("请输入合法的月/日");
      return;
    }
    if (useTrueSolarTime) {
      const lng = Number(longitude);
      if (!Number.isFinite(lng) || lng < 70 || lng > 140) {
        setError("真太阳时需填写合法经度（70–140°E）");
        return;
      }
    }
    onSubmit(buildProfile());
  }

  const years = Array.from({ length: 201 }, (_, i) => currentYear - 100 + i);

  return (
    <form onSubmit={handleSubmit} className="panel-console hud-frame space-y-4 p-5 sm:p-6">
      {title && (
        <div className="text-center">
          <div className="console-label mb-2 flex items-center justify-center gap-2">
            <span className="hud-dot" />
            MINGXUAN // BIRTH PROFILE
          </div>
          <h3 className="console-title justify-center text-center text-lg">
            <span className="seq">INPUT</span>
            {title}
          </h3>
        </div>
      )}

      {/* 命盘存档：快捷载入 */}
      {saved.length > 0 && (
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-2">已存命盘 · 快捷载入</div>
          <div className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <span key={s.id} className="group inline-flex items-center gap-1 rounded-full border border-gold-500/25 bg-ink-800/60 py-1 pl-3 pr-1.5 text-xs text-paper-200 transition-colors hover:border-gold-500/50">
                <button
                  type="button"
                  onClick={() => applySaved(s)}
                  className="transition-colors hover:text-gold-300"
                  title={profileSummary(s.profile)}
                >
                  <span className="mr-1 rounded bg-gold-500/15 px-1 text-[10px] text-gold-400">{s.relation}</span>
                  {s.label}
                </button>
                <button
                  type="button"
                  onClick={() => deleteProfile(s.id)}
                  className="rounded-full px-1 text-paper-500 transition-colors hover:text-cinnabar-400"
                  title="删除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 block">
          <span className="console-label mb-1 block">NAME · 姓名（选填）</span>
          <input
            className="input-xuan w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="匿名"
          />
        </label>
        <label className="block">
          <span className="console-label mb-1 block">GENDER · 性别</span>
          <select
            className="input-xuan w-full"
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female")}
          >
            <option value="male">乾造（男）</option>
            <option value="female">坤造（女）</option>
          </select>
        </label>
        <label className="block">
          <span className="console-label mb-1 block">CAL · 历法</span>
          <select
            className="input-xuan w-full"
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar")}
          >
            <option value="solar">公历</option>
            <option value="lunar">农历</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="console-label mb-1 block">YEAR · 年</span>
          <select
            className="input-xuan w-full"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="console-label mb-1 block">MON · 月</span>
          <select
            className="input-xuan w-full"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="console-label mb-1 block">DAY · 日</span>
          <select
            className="input-xuan w-full"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      {calendarType === "lunar" && (
        <label className="flex items-center gap-2 text-sm text-paper-300">
          <input
            type="checkbox"
            checked={isLeapMonth}
            onChange={(e) => setIsLeapMonth(e.target.checked)}
            className="accent-gold-500"
          />
          闰月
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="console-label mb-1 block">MODE · 时间方式</span>
          <select
            className="input-xuan w-full"
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value as "shichen" | "precise")}
          >
            <option value="shichen">传统时辰</option>
            <option value="precise">精确时分</option>
          </select>
        </label>
        {timeMode === "shichen" ? (
          <label className="block">
            <span className="console-label mb-1 block">SHICHEN · 时辰</span>
            <select
              className="input-xuan w-full"
              value={timeIndex}
              onChange={(e) => setTimeIndex(Number(e.target.value))}
            >
              {SHICHEN_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="console-label mb-1 block">HOUR · 时</span>
              <input
                type="number" min={0} max={23}
                className="input-xuan w-full"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="console-label mb-1 block">MIN · 分</span>
              <input
                type="number" min={0} max={59}
                className="input-xuan w-full"
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
              />
            </label>
          </div>
        )}
      </div>

      {/* 出生地点 + 经度 */}
      <div className="space-y-2 rounded-lg border border-gold-500/15 p-3">
        <label className="flex items-center gap-2 text-sm text-paper-300">
          <input
            type="checkbox"
            checked={useTrueSolarTime}
            onChange={(e) => setUseTrueSolarTime(e.target.checked)}
            className="accent-gold-500"
          />
          使用真太阳时（需经度，用于精确排盘）
        </label>
        {useTrueSolarTime && (
          <>
            <label className="block">
              <span className="console-label mb-1 block">LOCATION · 出生地点（搜索后自动填经纬度）</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-500" />
                <input
                  className="input-xuan w-full pl-9"
                  value={locQuery || locationName}
                  onFocus={() => setLocOpen(true)}
                  onChange={(e) => {
                    setLocQuery(e.target.value);
                    setLocOpen(true);
                  }}
                  placeholder="输入城市/区县名，如 北京、浦东、徐汇"
                />
                {locOpen && (locQuery || locResults.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gold-500/25 bg-ink-950 shadow-xl">
                    {locLoading && (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-paper-400">
                        <Loader2 className="h-3 w-3 animate-spin" />搜索中…
                      </div>
                    )}
                    {locResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyLocation(r)}
                        className="flex w-full items-start justify-between gap-3 border-b border-ink-700/60 px-3 py-2 text-left text-xs hover:bg-ink-800/80 last:border-b-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-paper-100">{r.name}</span>
                        <span className="shrink-0 font-mono text-paper-400">
                          {r.longitude.toFixed(4)}, {r.latitude.toFixed(4)}
                          <span className="ml-1 text-[10px] text-gold-400">{r.source}</span>
                        </span>
                      </button>
                    ))}
                    {!locLoading && locResults.length === 0 && locQuery && (
                      <div className="px-3 py-2 text-xs text-paper-500">
                        无结果。可到「设置 → 地点服务」配置高德/百度 API Key。
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="console-label mb-1 block">LON · 经度（°E）</span>
                <input
                  className="input-xuan w-full font-mono text-sm"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="116.40"
                />
              </label>
              <label className="block">
                <span className="console-label mb-1 block">LAT · 纬度（°N）</span>
                <input
                  className="input-xuan w-full font-mono text-sm"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="39.90"
                />
              </label>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-3 py-2 text-sm text-cinnabar-400">
          <span className="console-label mr-2 text-cinnabar-400">ERR</span>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-gold flex-1" disabled={loading}>
          {loading ? "排盘中…" : submitLabel}
        </button>
        <button
          type="button"
          className="btn-ghost shrink-0"
          onClick={() => setShowSave((v) => !v)}
          title="保存到命盘存档，下次一键载入"
        >
          存为命盘
        </button>
      </div>

      {showSave && (
        <div className="anim-fade-up flex items-center gap-2 rounded-lg border border-gold-500/20 bg-ink-900/50 p-3">
          <span className="console-label text-paper-400">RELATION · 关系</span>
          <select
            className="input-xuan !py-1.5 text-sm"
            value={saveRelation}
            onChange={(e) => setSaveRelation(e.target.value as SavedProfile["relation"])}
          >
            {(["本人", "家人", "伴侣", "朋友", "其他"] as const).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="button" className="btn-gold !px-4 !py-1.5 text-sm" onClick={handleSave}>
            确认保存
          </button>
        </div>
      )}
      {savedTip && (
        <p className="anim-fade-up text-center text-xs text-jade-400">{savedTip}</p>
      )}
    </form>
  );
}