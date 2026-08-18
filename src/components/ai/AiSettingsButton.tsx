import { useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import AiConfigForm, { useAiConfigForm } from "./AiConfigForm";

/**
 * 排盘页右上角的 AI 设置弹窗入口。
 * 表单本体与「设置中心 · AI 大模型」共用 <AiConfigForm />，数据与交互保持一致。
 */
export default function AiSettingsButton() {
  const [open, setOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const form = useAiConfigForm();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          form.reload();
          setOpen(true);
        }}
        title="AI 解读设置"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/30 text-gold-400 transition-all hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-300"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === backdropRef.current && setOpen(false)}
        >
          <div className="card-xuan anim-scale-in w-full max-w-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gold-300">
                <Sparkles className="h-5 w-5" />
                AI 解读设置
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-paper-400 transition-colors hover:text-paper-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AiConfigForm form={form} onSaved={() => setOpen(false)} saveLabel="保存设置" />
          </div>
        </div>
      )}
    </>
  );
}
