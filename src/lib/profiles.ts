/**
 * 命盘存档库：把出生档案（本人/他人）保存到本地，供各排盘页快捷调用。
 * Tauri 桌面端持久化到应用数据目录 profiles.json（Rust 后端），
 * 浏览器端退化为 localStorage；两者通过启动时同步合并。
 */

import type { BirthProfile } from "mingyu-core";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/ai";

const LS_KEY = "mingxuan.profiles";

export interface SavedProfile {
  id: string;
  label: string;
  /** 关系标签：本人 / 家人 / 伴侣 / 朋友 / 其他 */
  relation: "本人" | "家人" | "伴侣" | "朋友" | "其他";
  profile: BirthProfile;
  createdAt: number;
}

let cache: SavedProfile[] | null = null;

/** 应用启动时调用一次：Tauri 下从磁盘载入存档并同步到内存缓存 */
export async function initProfilesStore(): Promise<void> {
  if (!isTauri) return;
  try {
    const json = await invoke<string>("read_profiles");
    const fromDisk = JSON.parse(json) as SavedProfile[];
    if (Array.isArray(fromDisk)) {
      cache = fromDisk;
      localStorage.setItem(LS_KEY, json);
      window.dispatchEvent(new CustomEvent("mx-profiles-changed"));
    }
  } catch {
    /* 首次运行等情况忽略 */
  }
}

export function loadProfiles(): SavedProfile[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      cache = JSON.parse(raw) as SavedProfile[];
      return cache;
    }
  } catch {
    /* ignore */
  }
  cache = [];
  return cache;
}

function persist(list: SavedProfile[]) {
  cache = list;
  const json = JSON.stringify(list);
  localStorage.setItem(LS_KEY, json);
  if (isTauri) {
    invoke("write_profiles", { json }).catch(() => {});
  }
  window.dispatchEvent(new CustomEvent("mx-profiles-changed"));
}

export function saveProfile(entry: Omit<SavedProfile, "id" | "createdAt">): SavedProfile {
  const list = loadProfiles();
  const saved: SavedProfile = {
    ...entry,
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  list.unshift(saved);
  persist(list);
  return saved;
}

export function deleteProfile(id: string) {
  persist(loadProfiles().filter((p) => p.id !== id));
}

/** 命盘摘要（列表展示用） */
export function profileSummary(p: BirthProfile): string {
  const cal = p.calendarType === "lunar" ? "农历" : "公历";
  const sex = p.gender === "male" ? "乾" : p.gender === "female" ? "坤" : "";
  const time =
    p.hour !== undefined
      ? `${String(p.hour).padStart(2, "0")}:${String(p.minute ?? 0).padStart(2, "0")}`
      : p.timeIndex !== undefined
        ? `时辰${p.timeIndex}`
        : "";
  return `${sex} · ${cal} ${p.year}-${p.month}-${p.day} ${time}`;
}
