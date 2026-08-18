import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  loadLocationConfig, saveLocationConfig, searchLocation,
  type LocationConfig, type LocationResult,
} from "@/lib/location";
import { toast } from "@/lib/dialog";
import SectionCard from "./SectionCard";

export default function LocationSection() {
  const [draft, setDraft] = useState<LocationConfig>(loadLocationConfig());
  const [testQ, setTestQ] = useState("北京");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [error, setError] = useState("");

  function update(patch: Partial<LocationConfig>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function save() {
    saveLocationConfig(draft);
    toast("地点服务设置已保存", "success");
  }

  async function runTest() {
    setTesting(true);
    setError("");
    try {
      const r = await searchLocation(testQ);
      setResults(r);
      if (!r.length) setError("无结果。可检查 Key 是否正确 / 网络是否可达。");
    } catch (e) {
      setError(`调用失败：${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <SectionCard
      title="地点服务（经纬度自动查询）"
      desc="配置地图服务后，出生档案输入地点即可自动填经度（替代手动填写）。API Key 仅存本地；请求经 Rust 后端转发，不在浏览器暴露。"
    >
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "local", label: "本地库（无需 Key）" },
          { id: "amap", label: "高德地图" },
          { id: "baidu", label: "百度地图" },
        ] as const).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => update({ provider: p.id })}
            className={`tab-chip text-center text-sm ${draft.provider === p.id ? "is-active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {draft.provider !== "local" && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="console-label mb-1 block">API Key</span>
            <input
              className="input-xuan w-full font-mono text-sm"
              value={draft.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder={draft.provider === "amap" ? "高德 Web 端 JS API Key" : "百度 LBS 云 AK"}
            />
          </label>
          <p className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-paper-500">
            {draft.provider === "amap" ? (
              <>高德申请：<b>lbs.amap.com/dev/key/app</b>，创建「Web 端 / JS API」类型 Key。</>
            ) : (
              <>百度申请：<b>lbsyun.baidu.com/apiconsole/key</b>，勾选「Place 检索」与「逆地理编码」。</>
            )}
            <br />
            Key 仅存储于本地设备，请求通过 Rust 后端转发（<code className="rounded bg-ink-800 px-1">location_lookup</code> 命令），前端代码不暴露。
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-gold !px-3 text-sm" onClick={save}>保存</button>
        <input
          className="input-xuan flex-1"
          placeholder="测试关键词，如 北京 / 上海浦东"
          value={testQ}
          onChange={(e) => setTestQ(e.target.value)}
        />
        <button type="button" className="btn-ghost !px-3 text-sm" onClick={runTest} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "测试搜索"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-cinnabar-400">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3">
          <div className="console-label mb-2">命中 {results.length} 条</div>
          <ul className="space-y-1.5">
            {results.slice(0, 6).map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs">
                <span className="text-paper-100">{r.name}</span>
                <span className="font-mono text-paper-400">
                  {r.longitude.toFixed(4)}, {r.latitude.toFixed(4)} · {r.source}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
