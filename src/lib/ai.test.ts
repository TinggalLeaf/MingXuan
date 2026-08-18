import { beforeEach, describe, expect, it } from "vitest";
import {
  AI_DEFAULTS,
  activeProviderConfig,
  buildInterpretMessages,
  calcConfidence,
  loadAiSettings,
  migrateAiSettings,
  normalizeBaseUrl,
  saveAiSettings,
  type AiSettings,
} from "./ai";

beforeEach(() => {
  localStorage.clear();
});

describe("normalizeBaseUrl", () => {
  it("去掉首尾空白与末尾斜杠", () => {
    expect(normalizeBaseUrl("  http://localhost:8000/  ")).toBe("http://localhost:8000");
    expect(normalizeBaseUrl("https://api.example.com///")).toBe("https://api.example.com");
  });

  it("去掉末尾的 /v1", () => {
    expect(normalizeBaseUrl("http://localhost:8000/v1")).toBe("http://localhost:8000");
    expect(normalizeBaseUrl("https://api.example.com/v1/")).toBe("https://api.example.com");
  });
});

describe("migrateAiSettings", () => {
  it("空数据 / 非法数据返回默认值", () => {
    expect(migrateAiSettings(null)).toEqual(AI_DEFAULTS);
    expect(migrateAiSettings("junk")).toEqual(AI_DEFAULTS);
    expect(migrateAiSettings(42)).toEqual(AI_DEFAULTS);
  });

  it("迁移旧版平铺字段到对应渠道", () => {
    const legacy = {
      provider: "custom",
      baseUrl: "http://localhost:11434",
      apiKey: "sk-test",
      model: "qwen2.5:7b",
      builtinModel: "qwen-8b",
      cachedModels: ["qwen2.5:7b"],
    };
    const s = migrateAiSettings(legacy);
    expect(s.provider).toBe("custom");
    expect(s.providers.custom).toEqual({
      baseUrl: "http://localhost:11434",
      apiKey: "sk-test",
      model: "qwen2.5:7b",
    });
    // 其他渠道保持默认，互不污染
    expect(s.providers.kilo.baseUrl).toContain("kilo.ai");
    expect(s.providers.kimi.model).not.toBe("qwen2.5:7b");
    expect(s.cachedModels).toEqual(["qwen2.5:7b"]);
  });

  it("旧版平铺字段在 builtin 激活时归入 custom", () => {
    const s = migrateAiSettings({
      provider: "builtin",
      baseUrl: "http://localhost:8000",
      model: "my-model",
    });
    expect(s.providers.custom.model).toBe("my-model");
    expect(s.provider).toBe("builtin");
  });

  it("新版结构逐渠道合并，缺失字段回落默认", () => {
    const s = migrateAiSettings({
      provider: "kilo",
      providers: { kilo: { model: "x-ai/grok-4" } },
    });
    expect(s.providers.kilo.model).toBe("x-ai/grok-4");
    expect(s.providers.kilo.baseUrl).toContain("kilo.ai");
    expect(s.providers.custom.model).toBe("qwen-8b");
  });

  it("忽略非法 provider 与 cachedModels 非字符串项", () => {
    const s = migrateAiSettings({ provider: "bogus", cachedModels: ["a", 1, null, "b"] });
    expect(s.provider).toBe("builtin");
    expect(s.cachedModels).toEqual(["a", "b"]);
  });
});

describe("activeProviderConfig", () => {
  it("builtin 返回 builtinModel", () => {
    const s = migrateAiSettings({ provider: "builtin", builtinModel: "qwen-8b" });
    expect(activeProviderConfig(s)).toEqual({ baseUrl: "", apiKey: "", model: "qwen-8b" });
  });

  it("远程渠道返回各自独立配置", () => {
    const s = migrateAiSettings({
      provider: "kimi",
      providers: { kimi: { baseUrl: "https://x", apiKey: "k", model: "kimi-k2" } },
    });
    expect(activeProviderConfig(s)).toEqual({ baseUrl: "https://x", apiKey: "k", model: "kimi-k2" });
  });
});

describe("loadAiSettings / saveAiSettings", () => {
  it("无存储时返回默认值", () => {
    expect(loadAiSettings()).toEqual(AI_DEFAULTS);
  });

  it("保存后可读回，并广播变更事件", () => {
    const s: AiSettings = {
      ...AI_DEFAULTS,
      provider: "custom",
      providers: { ...AI_DEFAULTS.providers, custom: { baseUrl: "http://a", apiKey: "", model: "m" } },
    };
    let eventDetail: unknown = null;
    window.addEventListener("mx-ai-settings-changed", (e) => {
      eventDetail = (e as CustomEvent).detail;
    });
    saveAiSettings(s);
    expect(loadAiSettings()).toEqual(s);
    expect(eventDetail).toEqual(s);
  });

  it("读取旧版存储时自动迁移", () => {
    localStorage.setItem(
      "mingxuan.ai.settings",
      JSON.stringify({ provider: "custom", baseUrl: "http://old", model: "old-model" }),
    );
    const s = loadAiSettings();
    expect(s.providers.custom.baseUrl).toBe("http://old");
    expect(s.providers.custom.model).toBe("old-model");
  });
});

describe("calcConfidence", () => {
  it("数据越丰富置信度越高", () => {
    const big = calcConfidence("八字命盘", { a: "x".repeat(7000), b: 1, c: 2 });
    const small = calcConfidence("八字命盘", { a: 1 });
    expect(big.confidenceValue).toBeGreaterThan(small.confidenceValue);
    expect(big.confidence).toBe("high");
    expect(small.confidence).toBe("low");
  });

  it("非结构化数据降一档", () => {
    const structured = calcConfidence("六爻", { a: "x".repeat(2000), b: 1, c: 2 });
    const unstructured = calcConfidence("六爻", "x".repeat(2000));
    expect(unstructured.confidenceValue).toBeLessThan(structured.confidenceValue);
  });

  it("未知主题回退到主题本身作为来源", () => {
    expect(calcConfidence("不存在的主题", {}).sources).toEqual(["不存在的主题"]);
  });
});

describe("buildInterpretMessages", () => {
  it("包含主题与排盘数据，默认标准版模板", () => {
    const msgs = buildInterpretMessages("八字命盘", "今年运势", { gz: "甲子" });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].content).toContain("【解读主题】八字命盘");
    expect(msgs[1].content).toContain("【所问之事】今年运势");
    expect(msgs[1].content).toContain("标准版");
  });

  it("按设置切换模板风格", () => {
    const msgs = buildInterpretMessages("六爻", undefined, {}, { aiTemplate: "classical" } as never);
    expect(msgs[1].content).toContain("文言版");
  });

  it("超长数据被截断", () => {
    const msgs = buildInterpretMessages("八字命盘", undefined, { big: "x".repeat(20000) });
    expect(msgs[1].content).toContain("数据过长已截断");
  });
});
