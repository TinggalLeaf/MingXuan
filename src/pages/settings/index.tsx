/**
 * 明玄 · 设置中心
 *
 * 一个页面管理所有用户偏好：
 * - 命盘档案（CRUD、关系标签、设为默认）
 * - AI 大模型配置（渠道、模型、测试连接；与排盘页弹窗共用 AiConfigForm）
 * - 主题（明/暗/跟随系统）
 * - 字体（族 / 粗细 / 字号缩放）
 * - 周公解梦（启用 AI 解析、清空本地梦境资料库）
 * - 通用（减弱动效、备份恢复、清空对话等）
 *
 * 各区块实现见同目录 *.tsx；交互反馈统一走 src/lib/dialog.ts
 * （Tauri 原生确认框 + 应用内 Toast / Prompt）。
 */

import { useState } from "react";
import {
  Sparkles, User, Palette, Type, Brain, Moon, Settings as Cog, MapPin,
} from "lucide-react";
import {
  AppSettings, loadSettings, saveSettings,
} from "@/lib/settings";
import ProfilesSection from "./ProfilesSection";
import AiSection from "./AiSection";
import AiTemplateSection from "./AiTemplateSection";
import DreamSection from "./DreamSection";
import ThemeSection from "./ThemeSection";
import FontSection from "./FontSection";
import LocationSection from "./LocationSection";
import GeneralSection from "./GeneralSection";

const SECTIONS = [
  { id: "profiles", label: "命盘档案", icon: User },
  { id: "ai", label: "AI 大模型", icon: Sparkles },
  { id: "aiTemplate", label: "解读模板", icon: Brain },
  { id: "dream", label: "解梦功能", icon: Moon },
  { id: "theme", label: "主题与外观", icon: Palette },
  { id: "font", label: "字体设置", icon: Type },
  { id: "location", label: "地点服务", icon: MapPin },
  { id: "general", label: "通用", icon: Cog },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export interface SectionProps {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
}

export default function Settings() {
  const [active, setActive] = useState<SectionId>("profiles");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  function update(patch: Partial<AppSettings>) {
    const next = saveSettings(patch);
    setSettings(next);
  }

  const sectionProps: SectionProps = { settings, update };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="console-label mb-2 flex items-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // SETTINGS CENTER
        </div>
        <h1 className="console-title text-2xl">
          <span className="seq">SYS.99</span>设置中心
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          管理命盘档案、AI 大模型、外观与通用偏好。所有改动自动保存到本地。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* 侧栏 */}
        <nav className="panel-console hud-frame p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                active === s.id
                  ? "border-l-2 border-gold-400 bg-gold-500/12 font-bold text-gold-300"
                  : "border-l-2 border-transparent text-paper-400 hover:bg-ink-800 hover:text-paper-100"
              }`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* 内容区 */}
        <div className="space-y-6">
          {active === "profiles" && <ProfilesSection />}
          {active === "ai" && <AiSection />}
          {active === "aiTemplate" && <AiTemplateSection {...sectionProps} />}
          {active === "dream" && <DreamSection />}
          {active === "theme" && <ThemeSection {...sectionProps} />}
          {active === "font" && <FontSection {...sectionProps} />}
          {active === "location" && <LocationSection />}
          {active === "general" && <GeneralSection {...sectionProps} />}
        </div>
      </div>
    </div>
  );
}
