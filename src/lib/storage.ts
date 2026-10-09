import type { Offsets } from "../../shared/layout";

const KEY = "lean-startup-lab:positions:v1";

export function loadOffsets(): Offsets {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Offsets;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOffsets(offsets: Offsets): void {
  localStorage.setItem(KEY, JSON.stringify(offsets));
}
