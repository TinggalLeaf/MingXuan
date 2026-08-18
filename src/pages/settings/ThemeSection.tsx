import { FONT_PRESETS } from "@/lib/settings";
import SectionCard from "./SectionCard";
import type { SectionProps } from "./index";

export default function ThemeSection({ settings, update }: SectionProps) {
  return (
    <SectionCard
      title="主题与外观"
      desc="明玄支持三种主题模式。浅色主题切换宣纸底色，更适合长时间阅读。"
    >
      <div className="grid grid-cols-3 gap-2">
        {(["dark", "light", "system"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => update({ themeMode: m })}
            className={`tab-chip text-center ${settings.themeMode === m ? "is-active" : ""}`}
          >
            {m === "dark" ? "深邃墨色" : m === "light" ? "素雅宣纸" : "跟随系统"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-paper-300">
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-1">当前主题</div>
          <div className="text-base font-bold text-gold-300">
            {settings.themeMode === "dark" ? "深邃墨色" : settings.themeMode === "light" ? "素雅宣纸" : "跟随系统"}
          </div>
        </div>
        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-1">当前字体</div>
          <div className="text-base font-bold text-gold-300">
            {settings.fontFamily === "custom" ? settings.customFontName || "自定义" : (FONT_PRESETS.find((f) => f.id === settings.fontFamily)?.label ?? "宋体")}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
