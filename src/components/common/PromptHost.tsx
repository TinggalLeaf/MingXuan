/**
 * Prompt 宿主：为 src/lib/dialog.ts 的 promptText() 提供应用内输入对话框。
 * 原生系统对话框没有文本输入能力，因此统一用此组件渲染（桌面端与浏览器一致）。
 * 挂载一次（App.tsx），全局可用。
 */

import { useEffect, useRef, useState } from "react";
import { PROMPT_EVENT, type PromptRequest } from "@/lib/dialog";

export default function PromptHost() {
  const [req, setReq] = useState<PromptRequest | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      const detail = (e as CustomEvent<PromptRequest>).detail;
      setValue(detail.defaultValue ?? "");
      setReq(detail);
    }
    window.addEventListener(PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(PROMPT_EVENT, onPrompt);
  }, []);

  useEffect(() => {
    if (req) {
      // 等一帧让 input 挂载后再聚焦并全选
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [req]);

  if (!req) return null;

  function close(result: string | null) {
    req!.resolve(result);
    setReq(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm"
      onClick={() => close(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={req.title}
        className="card-xuan anim-fade-up w-[min(92vw,420px)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-bold text-gold-300">{req.title}</h2>
        {req.message && <p className="mb-3 text-xs leading-relaxed text-paper-400">{req.message}</p>}
        {!req.message && <div className="mb-3" />}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            close(value.trim() || null);
          }}
        >
          <input
            ref={inputRef}
            className="input-xuan w-full"
            value={value}
            placeholder={req.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close(null);
            }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-ghost !px-4 text-sm" onClick={() => close(null)}>
              {req.cancelLabel ?? "取消"}
            </button>
            <button type="submit" className="btn-gold !px-5 text-sm">
              {req.okLabel ?? "确定"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
