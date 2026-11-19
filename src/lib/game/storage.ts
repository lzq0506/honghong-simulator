export type Rating = "sweet" | "barely";

export interface ScenarioRecord {
  won: boolean;
  bestRating: Rating | null;
  plays: number;
}

export interface Progress {
  /** 已解锁的场景数量（从第 1 个起按顺序解锁） */
  unlockedCount: number;
  records: Record<string, ScenarioRecord>;
}

const STORAGE_KEY = "honghong-progress-v1";

export const DEFAULT_PROGRESS: Progress = { unlockedCount: 1, records: {} };

export function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Progress;
    if (
      typeof parsed.unlockedCount !== "number" ||
      typeof parsed.records !== "object" ||
      parsed.records === null
    ) {
      return DEFAULT_PROGRESS;
    }
    return parsed;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* 存储不可用时静默失败 */
  }
}
