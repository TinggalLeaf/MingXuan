import { useEffect, useRef, useState } from "react";
import { MessageSquareText, X, Send, Square, Trash2, Sparkles } from "lucide-react";
import { chatStream, resolveUsableSettings, type ChatMessage } from "@/lib/ai";
import { useAiContext, type AiContext } from "./aiContext";
import { MarkdownLite } from "./markdownLite";

const LS_CHAT_KEY = "mingxuan.ai.chat";
/** 上下文 JSON 摘要上限 */
const CONTEXT_CAP = 12000;
/** localStorage 持久化的最大消息数 */
const HISTORY_CAP = 60;

interface UiMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_SYSTEM = `你是一位精通中华传统术数（八字、紫微斗数、奇门遁甲、大六壬、六爻、梅花易数、太乙神数、皇极经世、五运六气、风水堪舆）与西方占星、塔罗的资深命理咨询师，正在与用户进行连续对话。
要求：
1. 若附带了「当前排盘上下文」，回答必须基于其中的数据（干支、十神、星曜、卦象、牌面等），引用具体信息作为依据，不得编造数据之外的事实。
2. 语言通俗温和、简洁有条理，像与老师傅当面交谈；适当使用小标题与条目，中文输出。
3. 不做绝对化断言（如"必定""一定"），不使用恐吓性措辞；涉及健康、重大财务决策时提醒仅供参考。
4. 用户会连续追问，请结合对话历史与命盘上下文作答；用户跑题时可简短回答后温和引回。`;

function buildSystemMessage(ctx: AiContext | null): string {
  if (!ctx) {
    return (
      CHAT_SYSTEM +
      "\n\n【当前排盘上下文】无。用户尚未载入任何命盘/占卜结果；若问题依赖具体命盘数据，请温和提示用户先到相应页面排盘后再来提问。"
    );
  }
  let json: string;
  try {
    json = JSON.stringify(ctx.data) ?? "";
  } catch {
    json = String(ctx.data);
  }
  if (json.length > CONTEXT_CAP) json = json.slice(0, CONTEXT_CAP) + "\n…（数据过长已截断）";
  return (
    CHAT_SYSTEM +
    `\n\n【当前排盘上下文】\n主题：${ctx.topic}\n` +
    (ctx.question ? `所问之事：${ctx.question}\n` : "") +
    `数据：\n${json}\n请围绕以上数据回答用户接下来的提问。`
  );
}

function loadHistory(): UiMessage[] {
  try {
    const raw = localStorage.getItem(LS_CHAT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((m): m is UiMessage => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-HISTORY_CAP);
  } catch {
    return [];
  }
}

export interface AiChatDockProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * 连续 AI 对话面板：桌面端为右侧 flex 兄弟栏，移动端为全屏抽屉。
 * 自动感知当前页面 AiInterpret 注册的排盘/占卜上下文。
 */
export default function AiChatDock({ open, onToggle }: AiChatDockProps) {
  const ctx = useAiContext();
  const [messages, setMessages] = useState<UiMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 持久化对话历史
  useEffect(() => {
    try {
      localStorage.setItem(LS_CHAT_KEY, JSON.stringify(messages.slice(-HISTORY_CAP)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  // 新消息/流式输出时滚到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // 展开时聚焦输入框
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError("");
    const history: UiMessage[] = [...messages, { role: "user", content: text }];
    // 先放入用户消息与空的 AI 占位
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const apiMessages: ChatMessage[] = [
      { role: "system", content: buildSystemMessage(ctx) },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const settings = await resolveUsableSettings();
      await chatStream(
        settings,
        apiMessages,
        (_delta, full) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: full };
            return next;
          });
        },
        controller.signal
      );
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "AI 请求失败");
        // 移除空占位，避免留下空白气泡
        setMessages((prev) =>
          prev.length > 0 && prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content
            ? prev.slice(0, -1)
            : prev
        );
      }
    } finally {
      setStreaming(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function clear() {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages([]);
    setError("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  if (!open) {
    // 收起态：右侧边缘竖向把手
    return (
      <button
        type="button"
        onClick={onToggle}
        title="AI 问盘"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-lg border border-r-0 border-gold-500/30 bg-ink-950/90 px-1.5 py-4 text-gold-400 backdrop-blur-md transition-all hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-300"
      >
        <MessageSquareText className="h-4 w-4" />
        <span
          className="text-[11px] tracking-[0.35em]"
          style={{ writingMode: "vertical-rl" }}
        >
          AI 问盘
        </span>
        <span className="hud-dot" />
      </button>
    );
  }

  return (
    <aside className="anim-fade-left fixed inset-0 z-50 flex flex-col bg-ink-950 lg:static lg:z-auto lg:h-auto lg:w-[360px] lg:shrink-0 lg:border-l lg:border-gold-500/15 lg:bg-ink-900/40">
      {/* 头部 */}
      <div className="flex shrink-0 items-center justify-between border-b border-gold-500/15 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-gold-400" />
          <span className="console-label shrink-0">AI 问盘</span>
          <span className="hud-chip truncate" title={ctx ? `${ctx.topic}${ctx.question ? ` · ${ctx.question}` : ""}` : "未载入命盘"}>
            {ctx ? `上下文：${ctx.topic}${ctx.question ? ` · ${ctx.question}` : ""}` : "未载入命盘"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={clear}
            title="清空对话"
            className="flex h-7 w-7 items-center justify-center rounded-md text-paper-400 transition-colors hover:bg-ink-800 hover:text-cinnabar-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            title="收起"
            className="flex h-7 w-7 items-center justify-center rounded-md text-paper-400 transition-colors hover:bg-ink-800 hover:text-paper-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageSquareText className="h-8 w-8 text-gold-500/40" />
            <p className="text-xs leading-relaxed text-paper-400">
              {ctx
                ? `已载入「${ctx.topic}」作为上下文，可直接针对命盘连续追问。`
                : "当前未载入命盘，可先排盘再来问；也可以直接聊聊命理话题。"}
            </p>
            {ctx && (
              <div className="flex flex-wrap justify-center gap-2">
                {["这份结果总体如何？", "有哪些值得注意的地方？", "给一些趋避建议"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-full border border-gold-500/25 px-3 py-1 text-[11px] text-paper-300 transition-colors hover:border-gold-500/60 hover:text-gold-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className={`ml-auto max-w-[85%] rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-sm text-paper-100 ${i === messages.length - 1 || i === messages.length - 2 ? "anim-fade-up" : ""}`}
            >
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className={`mr-auto max-w-[94%] rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2 text-sm text-paper-200 ${i === messages.length - 1 ? "anim-fade-up" : ""}`}
            >
              {m.content ? (
                <>
                  <MarkdownLite text={m.content} />
                  {streaming && i === messages.length - 1 && (
                    <span className="anim-flicker ml-0.5 inline-block h-4 w-2 bg-gold-400/80" />
                  )}
                </>
              ) : (
                streaming && i === messages.length - 1 && (
                  <p className="flex items-center gap-2 text-paper-400">
                    <span className="anim-twinkle inline-block h-2 w-2 rounded-full bg-gold-400" />
                    正在思考…
                  </p>
                )
              )}
            </div>
          )
        )}

        {error && (
          <p className="rounded-lg border border-cinnabar-500/30 bg-cinnabar-500/10 px-3 py-2 text-xs text-cinnabar-400">
            {error}
            <br />
            <span className="text-paper-500">内置通道需联网；自定义服务请在右上角齿轮中检查配置。</span>
          </p>
        )}
      </div>

      {/* 输入区 */}
      <div className="shrink-0 border-t border-gold-500/15 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={ctx ? "针对当前命盘继续提问…（Enter 发送，Shift+Enter 换行）" : "向 AI 提问…（Enter 发送，Shift+Enter 换行）"}
            className="input-xuan min-h-[44px] flex-1 resize-none text-sm"
          />
          {streaming ? (
            <button type="button" onClick={stop} title="停止生成" className="btn-ghost !px-3">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!input.trim()}
              title="发送"
              className="btn-gold !px-3"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
