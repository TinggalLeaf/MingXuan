import SectionCard from "./SectionCard";
import type { SectionProps } from "./index";

const TEMPLATES = [
  { id: "concise", label: "极简版", desc: "一句话总览 + 三条要点 + 一句建议。150 字内，适合快问快答。" },
  { id: "standard", label: "标准版（推荐）", desc: "总览 / 性格 / 事业 / 感情 / 健康 / 近期 六大板块，400–700 字。" },
  { id: "detailed", label: "详尽版", desc: "六大板块 + 三条具体行动建议，800–1500 字。" },
  { id: "classical", label: "文言版", desc: "半文半白、四字对仗，文言之美又不失可读性。500–900 字。" },
] as const;

export default function AiTemplateSection({ settings, update }: SectionProps) {
  return (
    <SectionCard
      title="AI 解读模板"
      desc="所有 AI 解读页（八字、紫微、六爻等）会按所选风格生成固定结构。Markdown 输出会自动用富样式渲染。"
    >
      <div className="space-y-2">
        {TEMPLATES.map((t) => (
          <label
            key={t.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              settings.aiTemplate === t.id
                ? "border-gold-500/60 bg-gold-500/8"
                : "border-gold-500/15 bg-ink-900/40 hover:border-gold-500/30"
            }`}
          >
            <input
              type="radio"
              name="aiTemplate"
              className="mt-1 accent-gold-500"
              checked={settings.aiTemplate === t.id}
              onChange={() => update({ aiTemplate: t.id })}
            />
            <div>
              <div className="font-bold text-paper-100">{t.label}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-paper-400">{t.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={settings.markdownEnhanced}
          onChange={(e) => update({ markdownEnhanced: e.target.checked })}
          className="accent-gold-500"
        />
        启用 Markdown 富样式渲染（标题小圆点、引用朱线、表格金边）
      </label>
    </SectionCard>
  );
}
