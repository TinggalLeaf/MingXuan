/**
 * 明玄 · 统一弹窗与提示层
 *
 * 取代浏览器原生的 alert / confirm / prompt：
 * - 确认与警告：Tauri 桌面端走原生系统对话框（tauri-plugin-dialog），
 *   浏览器开发态退化为 window.confirm / window.alert。
 * - 轻量反馈（已保存 / 已清空 等）：一律用应用内 Toast，不打断操作。
 * - 文本输入（重命名等）：应用内 Prompt 对话框（原生对话框没有输入框），
 *   由 <PromptHost /> 以 Promise 方式驱动。
 */

import { isTauri } from "./ai";

// ===== Toast =====

export type ToastKind = "info" | "success" | "error";

export interface ToastDetail {
  text: string;
  kind: ToastKind;
}

export const TOAST_EVENT = "mx-toast";

/** 轻量提示：在窗口下方浮出，几秒后自动消失 */
export function toast(text: string, kind: ToastKind = "info") {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { text, kind } }));
}

// ===== 确认框 =====

export interface ConfirmOptions {
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
  /** 危险操作（删除/清空）：原生对话框用 warning 样式 */
  danger?: boolean;
}

/** 需要用户确认的二次确认框；返回用户是否同意 */
export async function confirmAction(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  if (isTauri) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(message, {
      title: opts.title ?? "明玄",
      kind: opts.danger ? "warning" : "info",
      okLabel: opts.okLabel ?? "确定",
      cancelLabel: opts.cancelLabel ?? "取消",
    });
  }
  return window.confirm(message);
}

/** 需要用户读完并点掉的重要提示（一般用于错误）；成功反馈请用 toast */
export async function alertInfo(
  message: string,
  opts: { title?: string; kind?: "info" | "error" } = {},
): Promise<void> {
  if (isTauri) {
    const { message: show } = await import("@tauri-apps/plugin-dialog");
    await show(message, {
      title: opts.title ?? "明玄",
      kind: opts.kind === "error" ? "error" : "info",
    });
    return;
  }
  window.alert(message);
}

// ===== 输入框 =====

export interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  okLabel?: string;
  cancelLabel?: string;
}

export interface PromptRequest extends PromptOptions {
  resolve: (value: string | null) => void;
}

export const PROMPT_EVENT = "mx-prompt";

/** 应用内文本输入对话框；取消时 resolve 为 null */
export function promptText(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent<PromptRequest>(PROMPT_EVENT, { detail: { ...opts, resolve } }),
    );
  });
}
