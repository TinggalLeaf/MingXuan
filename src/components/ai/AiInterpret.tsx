import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Square, RotateCcw } from "lucide-react";
import {
  buildInterpretMessages,
  chatStream,
  resolveUsableSettings,
} from "@/lib/ai";
import { registerAiContext } from "./aiContext";
import { MarkdownLite } from "./markdownLite";
import { calcConfidence, type InterpretMeta } from "@/lib/ai";

export interface AiInterpretProps {
  /** 解读主题，如「八字命盘」「奇门遁甲局」 */
  topic: string;
  /** 排盘/占卜的结构化结果数据（会被 JSON 序列化后发给 AI） */
  data: unknown;
  /** 所问之事（占卜类页面传入） */
  question?: string;
  className?: string;
}

/**
 * AI 解读面板：「AI 解读」按钮 → 流式生成解读。
 * 任何结果页嵌入：<AiInterpret topic="八字命盘" data={chart} />
 * 同时会把 {topic, data, question} 注册为全局 AI 对话上下文（供 AiChatDock 使用）。
 */
export default function AiInterpret({ topic, data, question, className = "" }: AiInterpretProps) {
  const [started, setStarted] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 注册为 AI 对话上下文：同页多个 AiInterpret 时后注册覆盖（可接受）
  useEffect(() => {
    registerAiContext({ topic, data, question });
  }, [topic, data, question]);

  // 计算置信度 / 来源（按数据完整度估算）
  const meta: InterpretMeta = useMemo(() => calcConfidence(topic, data), [topic, data]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    // 流式输出时自动滚到底部
    if (streaming && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [content, streaming]);

  async function start() {
    setStarted(true);
    setStreaming(true);
    setError("");
    setContent("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const settings = await resolveUsableSettings();
      await chatStream(
        settings,
        buildInterpretMessages(topic, question, data),
        (_delta, full) => setContent(full),
        controller.signal
      );
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "AI 解读失败");
      }
    } finally {
      setStreaming(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function reset() {
    abortRef.current?.abort();
    setStarted(false);
    setStreaming(false);
    setContent("");
    setError("");
  }

  return (
    <section className={`card-xuan anim-fade-up p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-gold-300">
          <Sparkles className="h-4 w-4" />
          AI 解读
          <span className="rounded border border-gold-500/30 px-1.5 py-0.5 text-[10px] font-normal tracking-widest text-gold-500">
            {topic}
          </span>
        </h3>
        {started && (
          <div className="flex gap-2">
            {streaming && (
              <button type="button" onClick={stop} className="btn-ghost !px-3 !py-1 text-xs">
                <Square className="h-3 w-3" /> 停止
              </button>
            )}
            {!streaming && (
              <button type="button" onClick={reset} className="btn-ghost !px-3 !py-1 text-xs">
                <RotateCcw className="h-3 w-3" /> 重新解读
              </button>
            )}
          </div>
        )}
      </div>

      {/* 来源与置信度徽章 —— 仅在已开始 AI 解读后显示 */}
      {started && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gold-500/15 bg-ink-900/40 p-3 text-xs">
          <span className="console-label">来源</span>
          {meta.sources.map((s) => (
            <span
              key={s}
              className="rounded border border-cyber-400/30 bg-cyber-400/10 px-2 py-0.5 text-cyber-300"
              title={`基于「${s}」维度的结构化数据`}
            >
              {s}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-2">
            <span className="console-label">置信度</span>
            <span
              className={`rounded px-2 py-0.5 font-bold ${
                meta.confidence === "high"
                  ? "border border-jade-400/40 bg-jade-400/15 text-jade-300"
                  : meta.confidence === "medium"
                    ? "border border-gold-500/40 bg-gold-500/15 text-gold-300"
                    : "border border-cinnabar-500/40 bg-cinnabar-500/15 text-cinnabar-300"
              }`}
              title={`基于数据完整度估算：${(meta.confidenceValue * 100).toFixed(0)}%`}
            >
              {meta.confidence === "high" ? "高" : meta.confidence === "medium" ? "中" : "低"}
              <span className="ml-1 text-[10px] opacity-70">{(meta.confidenceValue * 100).toFixed(0)}%</span>
            </span>
            {!meta.hasStructuredData && (
              <span className="text-[10px] text-paper-500">· 非结构化数据</span>
            )}
          </span>
        </div>
      )}

      {!started && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-xs leading-relaxed text-paper-400">
            将以上排盘数据交给内置 AI 通道，生成白话解读。默认免配置直连；
            也可在右上角齿轮中切换自定义 OpenAI 兼容服务。
          </p>
          <button type="button" onClick={start} className="btn-gold">
            <Sparkles className="h-4 w-4" />
            开始 AI 解读
          </button>
        </div>
      )}

      {started && (
        <div
          ref={bodyRef}
          className="max-h-[28rem] overflow-y-auto rounded-lg border border-gold-500/15 bg-ink-900/40 p-4 text-sm text-paper-200"
        >
          {content ? (
            <>
              <MarkdownLite text={content} />
              {streaming && <span className="anim-flicker ml-0.5 inline-block h-4 w-2 bg-gold-400/80" />}
            </>
          ) : (
            streaming && (
              <p className="flex items-center gap-2 text-paper-400">
                <span className="anim-twinkle inline-block h-2 w-2 rounded-full bg-gold-400" />
                正在请求 AI 解读…
              </p>
            )
          )}
          {error && (
            <p className="text-cinnabar-400">
              {error}
              <br />
              <span className="text-xs text-paper-500">
                内置通道需联网；若使用自定义服务，请在右上角齿轮中检查服务地址与模型。
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
