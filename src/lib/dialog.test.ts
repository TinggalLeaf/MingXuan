import { describe, expect, it, vi } from "vitest";
import {
  PROMPT_EVENT,
  TOAST_EVENT,
  confirmAction,
  promptText,
  toast,
  type PromptRequest,
  type ToastDetail,
} from "./dialog";

describe("toast", () => {
  it("广播 mx-toast 事件并携带文本与类型", () => {
    const seen: ToastDetail[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent<ToastDetail>).detail);
    window.addEventListener(TOAST_EVENT, listener);
    toast("已保存", "success");
    toast("出错了", "error");
    window.removeEventListener(TOAST_EVENT, listener);
    expect(seen).toEqual([
      { text: "已保存", kind: "success" },
      { text: "出错了", kind: "error" },
    ]);
  });

  it("默认类型为 info", () => {
    const seen: ToastDetail[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent<ToastDetail>).detail);
    window.addEventListener(TOAST_EVENT, listener);
    toast("提示");
    window.removeEventListener(TOAST_EVENT, listener);
    expect(seen[0].kind).toBe("info");
  });
});

describe("confirmAction（浏览器回退）", () => {
  it("同意时返回 true", async () => {
    window.confirm = vi.fn(() => true);
    expect(await confirmAction("确认删除？")).toBe(true);
    expect(window.confirm).toHaveBeenCalledWith("确认删除？");
  });

  it("拒绝时返回 false", async () => {
    window.confirm = vi.fn(() => false);
    expect(await confirmAction("确认删除？", { danger: true })).toBe(false);
  });
});

describe("promptText", () => {
  it("广播 mx-prompt 事件，宿主 resolve 后返回输入值", async () => {
    const listener = (e: Event) => {
      const req = (e as CustomEvent<PromptRequest>).detail;
      expect(req.title).toBe("重命名命盘");
      expect(req.defaultValue).toBe("旧名字");
      req.resolve("新名字");
    };
    window.addEventListener(PROMPT_EVENT, listener);
    const result = await promptText({ title: "重命名命盘", defaultValue: "旧名字" });
    window.removeEventListener(PROMPT_EVENT, listener);
    expect(result).toBe("新名字");
  });

  it("宿主取消时 resolve 为 null", async () => {
    const listener = (e: Event) => {
      (e as CustomEvent<PromptRequest>).detail.resolve(null);
    };
    window.addEventListener(PROMPT_EVENT, listener);
    const result = await promptText({ title: "重命名" });
    window.removeEventListener(PROMPT_EVENT, listener);
    expect(result).toBeNull();
  });
});
