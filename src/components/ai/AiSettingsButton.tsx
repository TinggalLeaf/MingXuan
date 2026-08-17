import { useEffect, useRef, useState } from "react";
import { Sparkles, X, RefreshCw, Check, Loader2, ExternalLink, Database } from "lucide-react";
import {
  AI_DEFAULTS,
  BUILTIN_MODELS,
  PROVIDER_DEFAULTS,
  fetchAiModels,
  loadAiSettings,
  saveAiSettings,
  type AiSettings,
  type AiProvider,
} from "@/lib/ai";

/**
 * AI 设置弹窗
 * - 内置直连（Cherry HMAC）：零配置开箱即用
 * - Kilo 免费模型：需本地运行 kilo_auto（https://github.com/XxxXTeam/kilo_auto）
 * - Kimi 公开 Demo：需本地运行 kimi_ai_chat2api（https://github.com/XxxXTeam/kimi_ai_chat2api）
 * - 自定义 OpenAI 兼容服务：任意兼容服务（vLLM / Ollama / OneAPI 等）
 */
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
      setModels(settings.cachedModels ?? []);
    }
  }, [open]);

  function update(patch: Partial<AiSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  function switchProvider(p: AiProvider) {
    const def = PROVIDER_DEFAULTS[p];
    update({
      provider: p,
      baseUrl: def.baseUrl || settings.baseUrl,
      model: p === "builtin" ? settings.builtinModel : settings.model,
    });
    setTestResult("");
    setModels([]);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult("");
    try {
      const list = await fetchAiModels(settings);
      setModels(list);
      setTestResult("ok");
      if (settings.provider !== "builtin" && list.length > 0 && !list.includes(settings.model)) {
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
    saveAiSettings({ ...settings, cachedModels: models });
    setOpen(false);
    window.dispatchEvent(new CustomEvent("mx-ai-settings-changed"));
  }

  const provider = settings.provider;
  const def = PROVIDER_DEFAULTS[provider];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

            <div className="space-y-4">
              {/* 渠道选择：4 列网格 */}
              <div>
                <div className="console-label mb-2">PROVIDER · 渠道</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["builtin", "kilo", "kimi", "custom"] as AiProvider[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => switchProvider(p)}
                      className={`tab-chip text-center text-xs sm:text-sm ${provider === p ? "is-active" : ""}`}
                      title={PROVIDER_DEFAULTS[p].desc}
                    >
                      {PROVIDER_DEFAULTS[p].label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-paper-400">
                  {def.desc}
                  {def.docsUrl && (
                    <a
                      href={def.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex items-center text-gold-400 hover:text-gold-300"
                    >
                      查看部署文档 <ExternalLink className="ml-0.5 h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>

              {provider === "builtin" ? (
                <div className="rounded-lg border border-jade-500/25 bg-jade-500/8 p-3 text-[11px] leading-relaxed text-paper-300">
                  <p>
                    <Check className="mr-1 inline h-3 w-3 text-jade-400" />
                    内置 AI 通道已就绪：由本地 Rust 后端 HMAC 签名直连 Cherry 上游，<b>无需 API Key</b>，开箱即用。
                  </p>
                  <label className="mt-3 block">
                    <span className="console-label mb-1 block">模型</span>
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
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-gold-500/15 bg-ink-900/30 p-3">
                  <label className="block">
                    <span className="console-label mb-1 block">服务地址（OpenAI 兼容）</span>
                    <input
                      className="input-xuan w-full font-mono text-sm"
                      value={settings.baseUrl}
                      onChange={(e) => update({ baseUrl: e.target.value })}
                      placeholder={def.baseUrl || "http://localhost:8000"}
                    />
                    <p className="mt-1 text-[10px] text-paper-500">
                      默认 {def.baseUrl || "http://localhost:8000"}，可按需修改
                    </p>
                  </label>
                  <label className="block">
                    <span className="console-label mb-1 block">API Key{provider === "kilo" ? "（可留空）" : ""}</span>
                    <input
                      type="password"
                      className="input-xuan w-full font-mono text-sm"
                      value={settings.apiKey}
                      onChange={(e) => update({ apiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                  </label>
                  <div>
                    <div className="console-label mb-1 flex items-center justify-between">
                      <span>模型</span>
                      {models.length > 0 && <span className="text-[10px] text-jade-400">已拉取 {models.length} 个</span>}
                    </div>
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
                        placeholder={provider === "kilo" ? "x-ai/grok-code-fast-1:optimized:free" : "kimi-ai-chat"}
                      />
                    )}
                  </div>
                </div>
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
                    连接失败
                    {provider === "builtin"
                      ? "——请检查网络"
                      : "——请确认本地服务已启动且 baseUrl 正确"}
                  </p>
                )}
              </div>

              <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
                <Database className="mr-1 inline h-3 w-3" />
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