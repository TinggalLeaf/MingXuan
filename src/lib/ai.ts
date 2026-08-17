/**
 * AI 解读核心。
 *
 * 默认【内置直连】：无需任何本地服务或配置——
 *   · Tauri 桌面端：由 Rust 后端带 HMAC 签名直连 Cherry 上游（cherry_studio_proxy 同款方案）；
 *   · 浏览器开发态：前端用 WebCrypto 计算同样的签名直连。
 * 可选【自定义服务】：任意 OpenAI 兼容接口（Tauri 下经 Rust 转发规避 CORS）。
 */

import { invoke, Channel } from "@tauri-apps/api/core";

const LS_KEY = "mingxuan.ai.settings";

export type AiProvider = "builtin" | "kilo" | "kimi" | "custom";

export interface AiSettings {
  provider: AiProvider;
  /** builtin: 固定 Cherry 上游；kilo/kimi/custom: OpenAI 兼容服务 */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** builtin 模式下的模型展示名（Cherry 内置） */
  builtinModel: string;
  /** 上次拉取的模型列表缓存（仅 UI 展示用） */
  cachedModels: string[];
}

export const AI_DEFAULTS: AiSettings = {
  provider: "builtin",
  baseUrl: import.meta.env.VITE_AI_BASE_URL || "http://localhost:8000",
  apiKey: import.meta.env.VITE_AI_API_KEY || "",
  model: import.meta.env.VITE_AI_MODEL || "qwen-8b",
  builtinModel: "qwen-8b",
  cachedModels: [],
};

export const BUILTIN_MODELS = ["qwen-8b"];

/** 各 provider 的默认 baseUrl（用户可改） */
export const PROVIDER_DEFAULTS: Record<AiProvider, { baseUrl: string; label: string; desc: string; docsUrl?: string }> = {
  builtin: {
    baseUrl: "",
    label: "内置直连（Cherry）",
    desc: "由 Rust 后端 HMAC 签名直连 Cherry 上游，零配置",
  },
  kilo: {
    baseUrl: "http://localhost:8080/v1",
    label: "Kilo 免费模型",
    desc: "需先运行 kilo_auto（https://github.com/XxxXTeam/kilo_auto），开放 Kilo 全量免费模型（grok/qwen/deepseek 等）",
    docsUrl: "https://github.com/XxxXTeam/kilo_auto",
  },
  kimi: {
    baseUrl: "http://localhost:8000/v1",
    label: "Kimi 公开 Demo",
    desc: "需先运行 kimi_ai_chat2api（https://github.com/XxxXTeam/kimi_ai_chat2api），可免 Key 调用 kimi-ai-chat",
    docsUrl: "https://github.com/XxxXTeam/kimi_ai_chat2api",
  },
  custom: {
    baseUrl: "http://localhost:8000",
    label: "自定义 OpenAI 兼容服务",
    desc: "任意兼容 OpenAI Chat Completions API 的服务（vLLM / Ollama / OneAPI 等）",
  },
};

/** 是否运行在 Tauri 桌面环境 */
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...AI_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...AI_DEFAULTS };
}

export function saveAiSettings(s: AiSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ===== 模型列表 =====

export async function fetchAiModels(s: AiSettings): Promise<string[]> {
  if (s.provider === "builtin") {
    if (isTauri) return invoke<string[]>("cherry_models");
    return BUILTIN_MODELS;
  }
  if (isTauri) {
    return invoke<string[]>("ai_models", { baseUrl: s.baseUrl, apiKey: s.apiKey });
  }
  const res = await fetch(`${normalizeBaseUrl(s.baseUrl)}/v1/models`, {
    headers: s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {},
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`模型列表请求失败：HTTP ${res.status}`);
  const data = await res.json();
  return ((data?.data ?? []) as { id?: string }[]).map((m) => m.id!).filter(Boolean);
}

// ===== 流式对话 =====

export async function chatStream(
  s: AiSettings,
  messages: ChatMessage[],
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  if (s.provider === "builtin") {
    if (isTauri) return streamViaRust("cherry_chat_stream", { model: s.builtinModel, messages }, onChunk);
    return streamViaBrowserCherry(s.builtinModel, messages, onChunk, signal);
  }
  if (isTauri) {
    return streamViaRust(
      "ai_chat_stream",
      { baseUrl: s.baseUrl, apiKey: s.apiKey, model: s.model, messages },
      onChunk
    );
  }
  return streamViaBrowserFetch(s, messages, onChunk, signal);
}

/** Tauri Channel 流式接收 */
async function streamViaRust(
  command: string,
  args: Record<string, unknown>,
  onChunk: (delta: string, full: string) => void
): Promise<string> {
  let full = "";
  const channel = new Channel<string>();
  channel.onmessage = (payload) => {
    if (payload === "[DONE]") return;
    const delta = parseDelta(payload);
    if (delta) {
      full += delta;
      onChunk(delta, full);
    }
  };
  await invoke(command, { ...args, onEvent: channel });
  return full;
}

/** 浏览器：自定义 OpenAI 兼容服务直连 */
async function streamViaBrowserFetch(
  s: AiSettings,
  messages: ChatMessage[],
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${normalizeBaseUrl(s.baseUrl)}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: s.model, messages, stream: true, temperature: 0.7 }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI 请求失败：HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("AI 服务未返回数据流");
  return pumpFetchStream(res.body.getReader(), onChunk);
}

// ===== 浏览器端 Cherry 直连（WebCrypto 签名） =====

const CHERRY_BASE_URL = "https://api.cherry-ai.com";
const CHERRY_CHAT_PATH = "/chat/completions";
const CHERRY_CLIENT_ID = "cherry-studio";
const CHERRY_SIGNING_SECRET =
  "K3RNPFx19hPh1AHr5E1wBEFfi4uYUjoCFuzjDzvS9cAWD8KuKJR8FOClwUpGqRRX.GvI6I5ZrEHcGOWjO5AKhJKGmnwwGfM62XKpWqkjhvzRU2NZIinM77aTGIqhqys0g";

let cachedKey: Promise<CryptoKey> | null = null;
function cherryKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(CHERRY_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }
  return cachedKey;
}

async function cherrySign(method: string, path: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const raw = [method.toUpperCase(), path, "", CHERRY_CLIENT_ID, timestamp, body].join("\n");
  const key = await cherryKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { timestamp, signature: hex };
}

async function streamViaBrowserCherry(
  model: string,
  messages: ChatMessage[],
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const upstream = model === "qwen-8b" ? "qwen" : model;
  const body = JSON.stringify({ model: upstream, messages, stream: true, temperature: 0.7 });
  const { timestamp, signature } = await cherrySign("POST", CHERRY_CHAT_PATH, body);
  const res = await fetch(`${CHERRY_BASE_URL}${CHERRY_CHAT_PATH}`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "X-Client-ID": CHERRY_CLIENT_ID,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      "X-Title": "Cherry Studio",
      "HTTP-Referer": "https://cherry-ai.com",
    },
    body,
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI 服务返回 HTTP ${res.status}：${text.slice(0, 300)}`);
  }
  if (!res.body) throw new Error("AI 服务未返回数据流");
  return pumpFetchStream(res.body.getReader(), onChunk);
}

// ===== 公共工具 =====

async function pumpFetchStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (delta: string, full: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]" || !payload) continue;
      const delta = parseDelta(payload);
      if (delta) {
        full += delta;
        onChunk(delta, full);
      }
    }
  }
  return full;
}

function parseDelta(payload: string): string {
  try {
    const json = JSON.parse(payload);
    return json.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

/** 免配置兜底：自定义模式下若模型不可用，自动选第一个可用模型 */
export async function resolveUsableSettings(): Promise<AiSettings> {
  const s = loadAiSettings();
  if (s.provider !== "builtin") {
    try {
      const models = await fetchAiModels(s);
      if (models.length > 0 && !models.includes(s.model)) {
        const next = { ...s, model: models[0] };
        saveAiSettings(next);
        return next;
      }
    } catch {
      /* 服务未启动等情况，交给调用方报错 */
    }
  }
  return s;
}

// ===== 解读提示词 =====

import type { AppSettings } from "./settings";

const STYLE_PROMPTS: Record<AppSettings["aiTemplate"], string> = {
  concise: `采用「极简版」排版：仅输出 1) 一句话总览，2) 三条要点（用 - 列表），3) 一句行动建议。
整段控制在 150 字内，语言干净、不堆砌形容词。`,
  standard: `采用「标准版」排版：使用 H2 标题分块（建议板块：「总览」「性格与天赋」「事业财运」「感情人际」「健康与作息」「近期提示」）。
每个标题下用 1–3 段白话 + 关键信息用 **加粗** 凸显。篇幅 400–700 字。`,
  detailed: `采用「详尽版」排版：除「总览」外，依次输出
1) 性格与天赋（含具体依据）
2) 事业与财运（行业倾向、节奏）
3) 感情与人际（相处方式、注意事项）
4) 健康与作息（体质倾向、宜忌）
5) 时运节点（近期 3–6 个月要点）
6) 三条具体建议
每节用 H2 标题，行间适当用 - 列表；篇幅 800–1500 字。`,
  classical: `采用「文言版」风格：用半文半白的语气解读，避免口语化词。
输出结构：1) 总论（文言短句），2) 分项赋文（每项一两句四字对仗），3) 启示（白话一段）。
保留文言之美又不失可读性，篇幅 500–900 字。`,
};

/**
 * 来源标签：根据解读主题映射到主要数据维度。
 * UI 用此在每个 H2 标题前显示徽章，并影响置信度计算。
 */
const TOPIC_SOURCES: Record<string, string[]> = {
  八字命盘: ["四柱", "十神", "藏干", "纳音", "神煞", "大运"],
  紫微命盘: ["主星", "四化", "宫位", "神煞"],
  西洋星盘: ["行星", "相位", "宫位", "上升"],
  七政四余: ["七政", "四余", "恒星"],
  住宅风水: ["峦头", "理气", "八宅"],
  六爻: ["卦象", "世应", "动爻", "用神"],
  梅花易数: ["体卦", "用卦", "变卦", "互卦"],
  奇门遁甲: ["三奇", "八门", "九星", "天盘"],
  大六壬: ["天乙", "月将", "神煞"],
  太乙神数: ["四计", "十六神"],
  皇极经世: ["元会运世"],
  五运六气: ["主运", "客运", "客气"],
  塔罗牌: ["牌面", "正逆位"],
  解梦: ["梦境意象", "心理学"],
  周公解梦: ["意象", "传统释义"],
};

/**
 * AI 解读的来源与置信度元数据。
 * 渲染时显示在解读面板顶部。
 */
export interface InterpretMeta {
  topic: string;
  sources: string[];
  /** 基于数据完整度的粗略置信度（高 / 中 / 低） */
  confidence: "high" | "medium" | "low";
  /** 置信度数值（0-1），用于可视化 */
  confidenceValue: number;
  /** 是否基于结构化数据（结构化则置信度高） */
  hasStructuredData: boolean;
}

/** 计算置信度：根据数据完整度 + 主题匹配度 */
export function calcConfidence(topic: string, data: unknown): InterpretMeta {
  const sources = TOPIC_SOURCES[topic] ?? [topic];
  let hasStructuredData = false;
  let size = 0;
  try {
    const json = JSON.stringify(data);
    size = json?.length ?? 0;
    hasStructuredData = Array.isArray(data) || (typeof data === "object" && data !== null && Object.keys(data).length > 2);
  } catch { /* ignore */ }

  // 体积越大说明数据越丰富 → 置信度越高
  let confidenceValue: number;
  if (size > 6000) confidenceValue = 0.92;
  else if (size > 3000) confidenceValue = 0.78;
  else if (size > 1000) confidenceValue = 0.62;
  else if (size > 200) confidenceValue = 0.45;
  else confidenceValue = 0.25;

  // 数据非结构化则再降一档
  if (!hasStructuredData) confidenceValue *= 0.7;

  const confidence: InterpretMeta["confidence"] =
    confidenceValue >= 0.75 ? "high" : confidenceValue >= 0.5 ? "medium" : "low";

  return { topic, sources, confidence, confidenceValue, hasStructuredData };
}

const SYSTEM_PROMPT_BASE = `你是一位精通中华传统术数（八字、紫微斗数、奇门遁甲、大六壬、六爻、梅花易数、太乙神数、皇极经世、五运六气、风水堪舆）与西方占星、塔罗的资深命理解读师。
要求：
1. 严格基于用户提供的结构化排盘数据进行解读，引用其中具体信息（干支、十神、星曜、卦象、牌面等）作为依据，不得编造数据之外的事实。
2. 语言通俗温和、条理清晰；不做绝对化断言（如「必定」「一定」），不使用恐吓性措辞；涉及健康、重大财务决策时提醒仅供参考。
3. 中文输出，标题用 H2 或 H3（## 或 ###），关键信息用 **加粗** 凸显；需要时可使用 - 列表、> 引用、| 表格。`;

export function buildInterpretMessages(
  topic: string,
  question: string | undefined,
  data: unknown,
  settings?: AppSettings,
): ChatMessage[] {
  let json: string;
  try {
    json = JSON.stringify(data, null, 1) ?? "";
  } catch {
    json = String(data);
  }
  if (json.length > 14000) json = json.slice(0, 14000) + "\n…（数据过长已截断）";
  const style = STYLE_PROMPTS[settings?.aiTemplate ?? "standard"];
  const user =
    `【解读主题】${topic}\n` +
    (question ? `【所问之事】${question}\n` : "") +
    `【排盘数据】\n${json}\n\n` +
    style +
    `\n\n请基于以上数据进行解读。`;
  return [
    { role: "system", content: SYSTEM_PROMPT_BASE },
    { role: "user", content: user },
  ];
}
