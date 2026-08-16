import { useEffect, useRef, useState } from "react";
import { Sparkles, Settings, X, RefreshCw, Check, Loader2 } from "lucide-react";
import {
  AI_DEFAULTS,
  BUILTIN_MODELS,
  fetchAiModels,
  loadAiSettings,
  saveAiSettings,
  type AiSettings,
} from "@/lib/ai";

/** AI 设置按钮（顶栏齿轮）+ 配置弹窗。默认内置直连，无需任何配置。 */
export default function AiSettingsButton() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AiSettings>(AI_DEFAULTS);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | "">("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings());
      setTestResult("");
      setModels([]);
    }
  }, [open]);

  function update(patch: Partial<AiSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  async function testConnection() {
    setTesting(true);
    setTestResult("");
    try {
      const list = await fetchAiModels(settings);
      setModels(list);
      setTestResult("ok");
      if (settings.mode === "custom" && list.length > 0 && !list.includes(settings.model)) {
        update({ model: list[0] });
      }
    } catch {
      setModels([]);
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    saveAiSettings(settings);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("mx-ai-settings-changed"));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AI 解读设置"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/30 text-gold-400 transition-all hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-300"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === backdropRef.current && setOpen(false)}
        >
          <div className="card-xuan anim-scale-in w-full max-w-md p-6">
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

            <div className="space-y-4">
              {/* 模式切换 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update({ mode: "builtin" })}
                  className={`tab-chip text-center text-sm ${settings.mode === "builtin" ? "is-active" : ""}`}
                >
                  内置直连（推荐）
                </button>
                <button
                  type="button"
                  onClick={() => update({ mode: "custom" })}
                  className={`tab-chip text-center text-sm ${settings.mode === "custom" ? "is-active" : ""}`}
                >
                  自定义服务
                </button>
              </div>

              {settings.mode === "builtin" ? (
                <>
                  <p className="rounded-lg border border-jade-500/25 bg-jade-500/8 p-3 text-[11px] leading-relaxed text-paper-300">
                    内置 AI 通道已就绪：由本地 Rust 后端加密直连，无需 API Key、无需启动任何服务，开箱即用。
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-xs text-paper-400">模型</span>
                    <select
                      className="input-xuan w-full"
                      value={settings.builtinModel}
                      onChange={(e) => update({ builtinModel: e.target.value })}
                    >
                      {(models.length > 0 ? models : BUILTIN_MODELS).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs text-paper-400">服务地址（OpenAI 兼容）</span>
                    <input
                      className="input-xuan w-full font-mono text-sm"
                      value={settings.baseUrl}
                      onChange={(e) => update({ baseUrl: e.target.value })}
                      placeholder="http://localhost:8000"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-paper-400">API Key（可留空）</span>
                    <input
                      type="password"
                      className="input-xuan w-full font-mono text-sm"
                      value={settings.apiKey}
                      onChange={(e) => update({ apiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-xs text-paper-400">模型</span>
                    {models.length > 0 ? (
                      <select
                        className="input-xuan w-full"
                        value={settings.model}
                        onChange={(e) => update({ model: e.target.value })}
                      >
                        {models.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input-xuan w-full font-mono text-sm"
                        value={settings.model}
                        onChange={(e) => update({ model: e.target.value })}
                        placeholder="qwen-8b"
                      />
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testing}
                  className="btn-ghost !px-3 text-sm"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  测试连接
                </button>
                {testResult === "ok" && (
                  <p className="flex items-center gap-1 text-xs text-jade-400">
                    <Check className="h-3.5 w-3.5" /> 通道正常
                  </p>
                )}
                {testResult === "fail" && (
                  <p className="text-xs text-cinnabar-400">
                    连接失败{settings.mode === "builtin" ? "——请检查网络" : "——请确认服务已启动"}
                  </p>
                )}
              </div>

              <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
                解读请求仅包含排盘数据，不含任何个人身份信息；命盘数据存储在本地设备，不上传云端。
              </p>

              <button type="button" onClick={handleSave} className="btn-gold w-full">
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
