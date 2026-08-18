import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  applySettings,
  loadSettings,
  saveSettings,
} from "./settings";

beforeEach(() => {
  localStorage.clear();
});

describe("loadSettings", () => {
  it("无存储时返回默认值", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("存储损坏时回落默认值", () => {
    localStorage.setItem("mingxuan.settings", "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("与已存数据合并（缺失字段用默认补齐）", () => {
    localStorage.setItem("mingxuan.settings", JSON.stringify({ themeMode: "light" }));
    const s = loadSettings();
    expect(s.themeMode).toBe("light");
    expect(s.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
  });
});

describe("saveSettings", () => {
  it("合并 patch、持久化并广播事件", () => {
    saveSettings({ themeMode: "light" });
    let detail: unknown = null;
    window.addEventListener("mx-settings-changed", (e) => {
      detail = (e as CustomEvent).detail;
    });
    const next = saveSettings({ fontScale: 1.1 });
    expect(next.themeMode).toBe("light"); // 之前的保存不丢
    expect(next.fontScale).toBe(1.1);
    expect(loadSettings().fontScale).toBe(1.1);
    expect((detail as typeof next).fontScale).toBe(1.1);
  });
});

describe("applySettings", () => {
  it("写入主题 / 字体 / 缩放到 documentElement", () => {
    applySettings({ ...DEFAULT_SETTINGS, themeMode: "light", fontScale: 1.2, reduceMotion: true });
    const root = document.documentElement;
    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.themeMode).toBe("light");
    expect(root.dataset.fontScale).toBe("1.2");
    expect(root.dataset.reduceMotion).toBe("true");
    expect(root.style.getPropertyValue("--font-scale")).toBe("1.2");
  });

  it("dark 主题映射为 dark", () => {
    applySettings({ ...DEFAULT_SETTINGS, themeMode: "dark" });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("自定义字体名被引号包裹并带系统兜底", () => {
    applySettings({ ...DEFAULT_SETTINGS, fontFamily: "custom", customFontName: "LXGW WenKai" });
    const stack = document.documentElement.style.getPropertyValue("--font-app");
    expect(stack).toContain('"LXGW WenKai"');
    expect(stack).toContain("system-ui");
  });
});
