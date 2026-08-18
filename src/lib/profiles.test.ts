import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteProfile,
  importProfiles,
  loadProfiles,
  profileSummary,
  saveProfile,
} from "./profiles";
import type { SavedProfile } from "./profiles";

function makeEntry(label: string) {
  return {
    label,
    relation: "本人" as const,
    profile: {
      calendarType: "solar",
      gender: "male",
      year: 1990,
      month: 5,
      day: 20,
      hour: 8,
      minute: 30,
    } as unknown as SavedProfile["profile"],
  };
}

beforeEach(() => {
  localStorage.clear();
  // profiles.ts 有模块级缓存，用 importProfiles 重置为空列表
  importProfiles([]);
});

describe("saveProfile / loadProfiles / deleteProfile", () => {
  it("新增后排在最前，删除后移除", () => {
    const a = saveProfile(makeEntry("甲"));
    const b = saveProfile(makeEntry("乙"));
    let list = loadProfiles();
    expect(list.map((p) => p.id)).toEqual([b.id, a.id]);

    deleteProfile(a.id);
    list = loadProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it("保存时生成 id 与 createdAt，并广播变更事件", () => {
    let fired = false;
    window.addEventListener("mx-profiles-changed", () => { fired = true; });
    const p = saveProfile(makeEntry("测试"));
    expect(p.id).toMatch(/^p_/);
    expect(p.createdAt).toBeGreaterThan(0);
    expect(fired).toBe(true);
  });

  it("localStorage 持久化", () => {
    saveProfile(makeEntry("持久"));
    const raw = localStorage.getItem("mingxuan.profiles");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});

describe("importProfiles", () => {
  it("整体替换并返回条数", () => {
    saveProfile(makeEntry("旧"));
    const n = importProfiles([
      { id: "p_1", label: "新1", relation: "家人", profile: makeEntry("").profile, createdAt: 1 },
      { id: "p_2", label: "新2", relation: "朋友", profile: makeEntry("").profile, createdAt: 2 },
    ]);
    expect(n).toBe(2);
    expect(loadProfiles().map((p) => p.label)).toEqual(["新1", "新2"]);
  });

  it("过滤掉缺字段的脏数据", () => {
    const n = importProfiles([
      { id: "p_1", label: "有效", profile: makeEntry("").profile },
      { label: "缺 id" },
      null,
      "junk",
    ]);
    expect(n).toBe(1);
    expect(loadProfiles()[0].label).toBe("有效");
    expect(loadProfiles()[0].relation).toBe("其他");
  });

  it("非数组输入抛错", () => {
    expect(() => importProfiles({ a: 1 })).toThrow("格式不正确");
  });
});

describe("profileSummary", () => {
  it("拼接性别 / 历法 / 日期 / 时间", () => {
    const p = makeEntry("x").profile;
    expect(profileSummary(p)).toBe("乾 · 公历 1990-5-20 08:30");
  });
});
