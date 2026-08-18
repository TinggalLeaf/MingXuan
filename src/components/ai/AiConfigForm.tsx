/**
 * AI 大模型配置表单（共享组件）
 *
 * 同时用于「设置中心 · AI 大模型」区块与各排盘页的 AI 设置弹窗，
 * 保证两处交互与数据一致。核心改进：
 * - 各渠道（kilo / kimi / custom）配置互相独立，切换渠道不再互相覆盖；
 * - kilo / kimi 由 Rust 后端代理云端，不再展示无意义的 baseUrl / API Key 输入；
 * - 保存前做基础校验，错误内联展示；测试连接可拉取模型列表并自动修正失效模型。
 */

import { useState } from "react";
import { Check, Loader2, RefreshCw, Database } from "lucide-react";
import {
  BUILTIN_MODELS,
  PROVIDER_DEFAULTS,
  fetchAiModels,
  loadAiSettings,
  saveAiSettings,
  type AiProvider,
  type AiSettings,
  type ProviderConfig,
  type RemoteProvider,
} from "@/lib/ai";
import { toast } from "@/lib/dialog";

export interface AiConfigFormState {
  draft: AiSettings;
  provider: AiProvider;
  /** 当前渠道配置（builtin 时为 null） */
  cfg: ProviderConfig | null;
  models: string[];
  testing: boolean;
  testState: "" | "ok" | "fail";
  error: string;
  switchProvider: (p: AiProvider) => void;
  patchConfig: (patch: Partial<ProviderConfig>) => void;
  setBuiltinModel: (m: string) => void;
  test: () => Promise<void>;
  save: () => boolean;
  /** 重新从存储载入（打开弹窗时调用，避免拿到挂载时的旧草稿） */
  reload: () => void;
}

export function useAiConfigForm(): AiConfigFormState {
  const [draft, setDraft] = useState<AiSettings>(() => loadAiSettings());
  const [models, setModels] = useState<string[]>(() => loadAiSettings().cachedModels);
  const [testing, setTesting] = useState(false);
  const [testState, setTestState] = useState<"" | "ok" | "fail">("");
  const [error, setError] = useState("");

  const provider = draft.provider;
  const cfg = provider === "builtin" ? null : draft.providers[provider as RemoteProvider];

  function switchProvider(p: AiProvider) {
    setDraft((d) => ({ ...d, provider: p }));
    setModels([]);
    setTestState("");
    setError("");
  }

  function patchConfig(patch: Partial<ProviderConfig>) {
    if (provider === "builtin") return;
    const key = provider as RemoteProvider;
    setDraft((d) => ({
      ...d,
      providers: { ...d.providers, [key]: { ...d.providers[key], ...patch } },
    }));
    setTestState("");
  }

  function setBuiltinModel(model: string) {
    setDraft((d) => ({ ...d, builtinModel: model }));
    setTestState("");
  }

  function validate(): string {
    if (provider === "custom" && cfg) {
      const url = cfg.baseUrl.trim();
      if (!url) return "请填写服务地址";
      if (!/^https?:\/\/.+/.test(url)) return "服务地址需以 http:// 或 https:// 开头";
    }
    if (provider !== "builtin" && cfg && !cfg.model.trim()) return "请填写模型名";
    return "";
  }

  async function test() {
    const v = validate();
    if (v) {
      setError(v);
      setTestState("fail");
      return;
    }
    setTesting(true);
    setTestState("");
    setError("");
    try {
      const list = await fetchAiModels(draft);
      setModels(list);
      setTestState("ok");
      // 拉到的列表里没有当前模型时自动切到第一个可用模型
      if (provider !== "builtin" && cfg && list.length > 0 && !list.includes(cfg.model)) {
        patchConfig({ model: list[0] });
      }
      if (provider === "builtin" && list.length > 0 && !list.includes(draft.builtinModel)) {
        setBuiltinModel(list[0]);
      }
    } catch (e) {
      setTestState("fail");
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setTesting(false);
    }
  }

  function save(): boolean {
    const v = validate();
    if (v) {
      setError(v);
      return false;
    }
    saveAiSettings({ ...draft, cachedModels: models });
    toast("AI 设置已保存", "success");
    return true;
  }

  function reload() {
    const s = loadAiSettings();
    setDraft(s);
    setModels(s.cachedModels);
    setTestState("");
    setError("");
  }

  return {
    draft, provider, cfg, models, testing, testState, error,
    switchProvider, patchConfig, setBuiltinModel, test, save, reload,
  };
}

export default function AiConfigForm({
  form,
  onSaved,
  saveLabel = "保存",
}: {
  form: AiConfigFormState;
  onSaved?: () => void;
  saveLabel?: string;
}) {
  const {
    draft, provider, cfg, models, testing, testState, error,
    switchProvider, patchConfig, setBuiltinModel, test, save,
  } = form;
  const def = PROVIDER_DEFAULTS[provider];
  const isRemote = provider !== "builtin";
  // kilo / kimi 由 Rust 后端代理固定上游，baseUrl/apiKey 无需展示
  const showConnectionFields = provider === "custom";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["builtin", "kilo", "kimi", "custom"] as const).map((p) => (
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
      <p className="text-[11px] leading-relaxed text-paper-400">{def.desc}</p>

      {provider === "builtin" ? (
        <div className="rounded-lg border border-jade-500/25 bg-jade-500/8 p-3">
          <p className="text-[11px] leading-relaxed text-paper-300">
            <Check className="mr-1 inline h-3 w-3 text-jade-400" />
            内置 AI 通道已就绪：由本地 Rust 后端 HMAC 签名直连 Cherry 上游，<b>无需 API Key</b>，开箱即用。
          </p>
          <label className="mt-3 block">
            <span className="console-label mb-1 block">模型</span>
            <select
              className="input-xuan w-full"
              value={draft.builtinModel}
              onChange={(e) => setBuiltinModel(e.target.value)}
            >
              {(models.length > 0 ? models : BUILTIN_MODELS).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-gold-500/15 bg-ink-900/30 p-3">
          {showConnectionFields && cfg && (
            <>
              <label className="block">
                <span className="console-label mb-1 block">服务地址（OpenAI 兼容）</span>
                <input
                  className="input-xuan w-full font-mono text-sm"
                  value={cfg.baseUrl}
                  onChange={(e) => patchConfig({ baseUrl: e.target.value })}
                  placeholder={def.baseUrl || "http://localhost:8000"}
                />
                <p className="mt-1 text-[10px] text-paper-500">默认 {def.baseUrl}，可按需修改</p>
              </label>
              <label className="block">
                <span className="console-label mb-1 block">API Key</span>
                <input
                  type="password"
                  className="input-xuan w-full font-mono text-sm"
                  value={cfg.apiKey}
                  onChange={(e) => patchConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </label>
            </>
          )}
          {cfg && (
            <div>
              <div className="console-label mb-1 flex items-center justify-between">
                <span>模型</span>
                {models.length > 0 && <span className="text-[10px] text-jade-400">已拉取 {models.length} 个</span>}
              </div>
              {models.length > 0 ? (
                <select
                  className="input-xuan w-full"
                  value={cfg.model}
                  onChange={(e) => patchConfig({ model: e.target.value })}
                >
                  {!models.includes(cfg.model) && cfg.model && (
                    <option value={cfg.model}>{cfg.model}（当前）</option>
                  )}
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input-xuan w-full font-mono text-sm"
                  value={cfg.model}
                  onChange={(e) => patchConfig({ model: e.target.value })}
                  placeholder="模型名，如 qwen-8b"
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={test} disabled={testing} className="btn-ghost !px-3 text-sm">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          测试连接
        </button>
        {testState === "ok" && (
          <span className="flex items-center gap-1 text-xs text-jade-400">
            <Check className="h-3.5 w-3.5" />通道正常
          </span>
        )}
        {testState === "fail" && (
          <span className="text-xs text-cinnabar-400">
            {error || (isRemote && provider !== "custom" ? "连接失败——请检查网络" : "连接失败——请确认服务可达且配置正确")}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (save()) onSaved?.();
          }}
          className="btn-gold ml-auto !px-5 text-sm"
        >
          {saveLabel}
        </button>
      </div>

      <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
        <Database className="mr-1 inline h-3 w-3" />
        解读请求仅包含排盘数据，不含任何个人身份信息；命盘数据存储在本地设备，不上传云端。
      </p>
    </div>
  );
}
