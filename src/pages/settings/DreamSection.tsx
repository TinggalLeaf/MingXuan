import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { loadSettings, saveSettings } from "@/lib/settings";
import { confirmAction, toast } from "@/lib/dialog";
import SectionCard from "./SectionCard";

export default function DreamSection() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(() => loadSettings().dreamAiParse);
  const [stats, setStats] = useState({ total: 0, lastUpdate: 0 });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setEnabled(loadSettings().dreamAiParse);
      try {
        const { dbStats } = await import("@/lib/dream");
        setStats(dbStats());
      } catch { /* ignore */ }
    };
    refresh();
    const onChange = () => refresh();
    window.addEventListener("mx-settings-changed", onChange);
    window.addEventListener("mx-dream-changed", onChange);
    return () => {
      window.removeEventListener("mx-settings-changed", onChange);
      window.removeEventListener("mx-dream-changed", onChange);
    };
  }, []);

  function toggle(v: boolean) {
    setEnabled(v);
    saveSettings({ dreamAiParse: v });
  }

  async function clearDreamDb() {
    const ok = await confirmAction("清空本地周公解梦资料库？此操作不可撤销。", {
      title: "清空资料库",
      okLabel: "清空",
      danger: true,
    });
    if (!ok) return;
    setClearing(true);
    try {
      localStorage.removeItem("mingxuan.dream.db");
      localStorage.removeItem("mingxuan.dream.history");
      window.dispatchEvent(new CustomEvent("mx-dream-changed"));
      toast("已清空", "success");
    } finally {
      setClearing(false);
    }
  }

  return (
    <SectionCard
      title="周公解梦"
      desc="支持自然语言描述梦境（如「梦见自己飞起来」）、AI 智能解析、关键字检索本地资料库。"
    >
      <label className="flex items-center gap-2 text-sm text-paper-300">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="accent-gold-500"
        />
        启用 AI 解析（结合本地资料 + 大模型做综合解读）
      </label>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
        <div className="text-xs text-paper-400">
          本地资料库：<b className="text-gold-300">{stats.total}</b> 条 · 最近更新：{stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : "从未"}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => navigate("/dream")}>
            打开解梦
          </button>
          <button type="button" className="btn-ghost !px-3 !py-1 text-xs hover:!border-cinnabar-500 hover:!text-cinnabar-400" onClick={clearDreamDb} disabled={clearing}>
            <Trash2 className="h-3 w-3" />清空资料
          </button>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
        提示：首次进入「周公解梦」页时会自动从 jiemeng.net 拉取条目入库（爬取仅在 Tauri/服务端执行；浏览器端可手动导入 JSON）。
      </p>
    </SectionCard>
  );
}
