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

export interface AiSettings {
  mode: "builtin" | "custom";
  /** custom 模式：OpenAI 兼容服务地址 */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** builtin 模式下的模型展示名 */
  builtinModel: string;
}

export const AI_DEFAULTS: AiSettings = {
  mode: "builtin",
  baseUrl: import.meta.env.VITE_AI_BASE_URL || "http://localhost:8000",
  apiKey: import.meta.env.VITE_AI_API_KEY || "",
  model: import.meta.env.VITE_AI_MODEL || "qwen-8b",
  builtinModel: "qwen-8b",
};

export const BUILTIN_MODELS = ["qwen-8b"];

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
  if (s.mode === "builtin") {
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
  if (s.mode === "builtin") {
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
  if (s.mode === "custom") {
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
