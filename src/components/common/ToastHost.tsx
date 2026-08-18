/**
 * Toast 宿主：监听 src/lib/dialog.ts 的 toast() 事件，在窗口下方浮出轻量提示。
 * 挂载一次（App.tsx），全局可用。
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { TOAST_EVENT, type ToastDetail, type ToastKind } from "@/lib/dialog";

interface ToastItem extends ToastDetail {
  id: number;
}

const ICONS: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
};

const COLORS: Record<ToastKind, string> = {
  info: "text-gold-300",
  success: "text-jade-400",
  error: "text-cinnabar-400",
};

const AUTO_DISMISS_MS = 2800;

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let seq = 0;
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = ++seq;
      setItems((list) => [...list.slice(-3), { ...detail, id }]);
      window.setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className="card-xuan anim-fade-up pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm shadow-2xl"
          >
            <Icon className={`h-4 w-4 shrink-0 ${COLORS[t.kind]}`} />
            <span className="text-paper-100">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
