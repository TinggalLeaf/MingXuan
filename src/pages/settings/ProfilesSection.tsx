import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { loadSettings, saveSettings } from "@/lib/settings";
import {
  loadProfiles, saveProfile, deleteProfile,
  profileSummary, type SavedProfile,
} from "@/lib/profiles";
import { confirmAction, promptText, toast } from "@/lib/dialog";
import SectionCard from "./SectionCard";

export default function ProfilesSection() {
  const [list, setList] = useState<SavedProfile[]>(loadProfiles());
  const [defaultId, setDefaultId] = useState<string>(() => loadSettings().preferredChartId);

  useEffect(() => {
    const onChange = () => {
      setList(loadProfiles());
      setDefaultId(loadSettings().preferredChartId);
    };
    window.addEventListener("mx-profiles-changed", onChange);
    window.addEventListener("mx-settings-changed", onChange);
    return () => {
      window.removeEventListener("mx-profiles-changed", onChange);
      window.removeEventListener("mx-settings-changed", onChange);
    };
  }, []);

  function setDefault(id: string) {
    setDefaultId(id);
    saveSettings({ preferredChartId: id });
  }

  async function remove(p: SavedProfile) {
    const ok = await confirmAction(`确认删除命盘「${p.label}」？此操作不可撤销。`, {
      title: "删除命盘",
      okLabel: "删除",
      danger: true,
    });
    if (!ok) return;
    deleteProfile(p.id);
    if (defaultId === p.id) saveSettings({ preferredChartId: "" });
    toast("已删除", "success");
  }

  async function rename(p: SavedProfile) {
    const next = await promptText({
      title: "重命名命盘",
      defaultValue: p.label,
      placeholder: "输入新的名称",
    });
    if (next && next !== p.label) {
      saveProfile({ ...p, label: next });
      toast("已重命名", "success");
    }
  }

  return (
    <SectionCard
      title="命盘档案"
      desc="保存出生信息后可一键载入到任意排盘/合盘页。Tauri 桌面端会持久化到应用数据目录，浏览器端退化为 localStorage。"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-paper-400">共 {list.length} 个档案</span>
        {defaultId && (
          <span className="hud-chip">默认：{list.find((p) => p.id === defaultId)?.label ?? "—"}</span>
        )}
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-6 text-center text-sm text-paper-400">
          暂无命盘档案。在任意排盘页填写出生信息后，点击「存为命盘」即可保存到这里。
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li
              key={p.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 transition-colors ${
                defaultId === p.id ? "border-gold-500/50 bg-gold-500/8" : "border-gold-500/15 bg-ink-900/40"
              }`}
            >
              <span className="rounded bg-gold-500/15 px-2 py-0.5 text-[10px] text-gold-400">{p.relation}</span>
              <span className="font-bold text-paper-100">{p.label}</span>
              <span className="text-xs text-paper-400">{profileSummary(p.profile)}</span>
              <span className="ml-auto flex gap-1">
                {defaultId !== p.id && (
                  <button type="button" onClick={() => setDefault(p.id)} className="btn-ghost !px-2 !py-1 text-xs">
                    设为默认
                  </button>
                )}
                {defaultId === p.id && (
                  <span className="flex items-center gap-1 rounded border border-gold-500/40 px-2 py-0.5 text-xs text-gold-300">
                    <Check className="h-3 w-3" />默认
                  </span>
                )}
                <button type="button" onClick={() => rename(p)} className="btn-ghost !px-2 !py-1 text-xs">
                  重命名
                </button>
                <button type="button" onClick={() => remove(p)} className="btn-ghost !px-2 !py-1 text-xs hover:!border-cinnabar-500 hover:!text-cinnabar-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-lg border border-gold-500/15 p-3 text-xs leading-relaxed text-paper-500">
        <p>💡 提示：命盘档案供八字、紫微、合盘等所有排盘页快速调用；「默认命盘」会被设为新建排盘的初始值。</p>
      </div>
    </SectionCard>
  );
}
