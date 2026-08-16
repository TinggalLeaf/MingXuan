/**
 * AI 对话上下文注册机制（轻量全局 store）。
 *
 * 各结果页的 <AiInterpret> 在 mount / 数据变化时调用 registerAiContext()，
 * 把当前页的排盘/占卜结果登记为全局「当前上下文」；
 * AiChatDock 通过 useAiContext() 订阅，发送对话时将其注入 system 消息。
 * 同页多个 AiInterpret 时后注册覆盖（可接受）。
 */

import { useSyncExternalStore } from "react";

export interface AiContext {
  /** 解读主题，如「八字命盘」「奇门遁甲局」 */
  topic: string;
  /** 排盘/占卜的结构化结果数据 */
  data: unknown;
  /** 所问之事（占卜类页面传入） */
  question?: string;
}

let current: AiContext | null = null;
const listeners = new Set<() => void>();

export function registerAiContext(ctx: AiContext) {
  current = ctx;
  listeners.forEach((l) => l());
}

export function getAiContext(): AiContext | null {
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAiContext(): AiContext | null {
  return useSyncExternalStore(subscribe, getAiContext);
}
