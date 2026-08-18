import { Download, RefreshCw, Trash2, Upload } from "lucide-react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/settings";
import { AI_DEFAULTS, loadAiSettings, migrateAiSettings, saveAiSettings } from "@/lib/ai";
import { importProfiles, loadProfiles } from "@/lib/profiles";
import { alertInfo, confirmAction, toast } from "@/lib/dialog";
import SectionCard from "./SectionCard";
import type { SectionProps } from "./index";

export default function GeneralSection({ settings, update }: SectionProps) {
  async function clearChat() {
    const ok = await confirmAction("清空全部 AI 对话历史？", {
      title: "清空对话",
      okLabel: "清空",
      danger: true,
    });
    if (!ok) return;
    localStorage.removeItem("mingxuan.ai.chat");
    toast("已清空", "success");
  }

  function exportAll() {
    const dump: Record<string, unknown> = {
      version: 1,
      exportedAt: Date.now(),
      settings: loadSettings(),
      ai: loadAiSettings(),
      profiles: loadProfiles(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mingxuan-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("备份已导出", "success");
  }

  function importAll(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = ""; // 允许重复选择同一文件
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.settings) saveSettings(data.settings);
        if (data.ai) saveAiSettings(migrateAiSettings(data.ai));
        if (data.profiles) importProfiles(data.profiles);
        toast("备份已导入", "success");
      } catch (e) {
        alertInfo(`导入失败：${(e as Error).message}`, { title: "导入备份", kind: "error" });
      }
    };
    reader.readAsText(file);
  }

  async function resetAll() {
    const ok = await confirmAction("恢复全部设置为默认值？命盘档案与 AI 对话历史不会被清除。", {
      title: "恢复默认设置",
      okLabel: "恢复默认",
      danger: true,
    });
    if (!ok) return;
    saveSettings(DEFAULT_SETTINGS);
    saveAiSettings(AI_DEFAULTS);
    toast("已恢复默认设置", "success");
  }

  return (
    <SectionCard
      title="通用"
      desc="减弱动效偏好、备份与恢复、对话清理。"
    >
      <label className="flex items-center gap-2 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(e) => update({ reduceMotion: e.target.checked })}
          className="accent-gold-500"
        />
        减弱动效（关闭扫描线、闪烁、光晕呼吸等装饰动画）
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !px-3 text-sm" onClick={exportAll}>
          <Download className="h-4 w-4" />导出备份
        </button>
        <label className="btn-ghost !px-3 text-sm cursor-pointer">
          <Upload className="h-4 w-4" />导入备份
          <input type="file" accept="application/json" className="hidden" onChange={importAll} />
        </label>
        <button type="button" className="btn-ghost !px-3 text-sm" onClick={clearChat}>
          <Trash2 className="h-4 w-4" />清空 AI 对话
        </button>
        <button type="button" className="btn-ghost !px-3 text-sm hover:!border-cinnabar-500 hover:!text-cinnabar-400" onClick={resetAll}>
          <RefreshCw className="h-4 w-4" />恢复默认设置
        </button>
      </div>

      <p className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
        明玄 1.0 · 设置中心版本 2 · 全部数据仅存储于本地设备。
      </p>
    </SectionCard>
  );
}
