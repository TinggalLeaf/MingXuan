/**
 * 桌面端自动更新提示器
 *
 * 启动后异步检查 GitHub Releases；发现新版本时弹出 toast。
 * Tauri 桌面端调用 `check`；浏览器端忽略（无 native 能力）。
 */

import { useEffect, useRef, useState } from "react";
import { Download, X, RefreshCw } from "lucide-react";
import { alertInfo } from "@/lib/dialog";

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  date?: string;
}

export default function Updater() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const trigger = useRef<number>(Date.now());

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    async function check() {
      // 浏览器环境：跳过
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (!isTauri) return;

      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const r = await check();
        if (cancelled) return;
        if (r?.available) {
          const notes = (r as any).body ?? (r as any).notes ?? "";
          setInfo({
            available: true,
            version: r.version ?? "",
            notes,
            date: r.date ?? "",
          });
          // 桌面通知（Web 通知 API）
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`明玄 ${r.version} 已发布`, { body: notes?.slice(0, 120) });
            }
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn("[updater] check failed:", e);
      }
      // 每 6 小时再检查一次
      timer = window.setTimeout(check, 6 * 3600 * 1000);
    }

    // 启动后 3 秒再检查，避免阻塞首屏
    const start = window.setTimeout(check, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (dismissed || !info?.available) return null;

  async function install() {
    setInstalling(true);
    setProgress(0);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update?.available) {
        setInstalling(false);
        return;
      }
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((evt: any) => {
        if (evt.event === "Progress") {
          total += evt.data.contentLength ?? 0;
          downloaded += evt.data.chunkLength ?? 0;
          if (total > 0) setProgress(Math.round((downloaded / total) * 100));
        } else if (evt.event === "Finished") {
          setProgress(100);
        }
      });
      // Rust 端会自动重启应用
      trigger.current = Date.now();
    } catch (e) {
      await alertInfo(`更新失败：${(e as Error).message}`, { title: "应用更新", kind: "error" });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 anim-fade-up">
      <div className="card-xuan flex items-start gap-3 p-4 shadow-2xl" style={{ maxWidth: 480 }}>
        <div className="rounded-full bg-gold-500/15 p-2 text-gold-300">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-paper-50">
            明玄 v{info.version} 已发布
            <span className="ml-2 rounded border border-gold-500/30 px-1.5 py-0.5 text-[10px] tracking-widest text-gold-500">
              UPDATE
            </span>
          </div>
          {info.notes && (
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-paper-300">{info.notes}</p>
          )}
          {installing && (
            <div className="mt-2">
              <div className="h-1 w-full overflow-hidden rounded bg-ink-800">
                <div className="h-full bg-gold-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-paper-500">下载进度 {progress}%</p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {!installing && (
              <button type="button" className="btn-gold !px-3 !py-1.5 text-sm" onClick={install}>
                <Download className="h-3.5 w-3.5" />立即更新
              </button>
            )}
            {!installing && (
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setDismissed(true)}>
                <RefreshCw className="h-3.5 w-3.5" />稍后
              </button>
            )}
            <button
              type="button"
              className="ml-auto text-paper-500 hover:text-paper-100"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}