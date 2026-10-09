import type { CanvasBoxes, EvidenceLevel, Experiment } from "./types";

export const EVIDENCE_LEVELS: EvidenceLevel[] = ["Opinion", "Research", "Said", "Did"];

export const CANVAS_FIELDS: { key: keyof CanvasBoxes; n: number; title: string; area: string }[] = [
  { key: "problem", n: 1, title: "Problem", area: "problem" },
  { key: "solution", n: 4, title: "Solution", area: "solution" },
  { key: "uniqueValueProposition", n: 3, title: "Unique Value Proposition", area: "uvp" },
  { key: "unfairAdvantage", n: 9, title: "Unfair Advantage", area: "unfair" },
  { key: "customerSegments", n: 2, title: "Customer Segments", area: "customer" },
  { key: "keyMetrics", n: 8, title: "Key Metrics", area: "metrics" },
  { key: "channels", n: 5, title: "Channels", area: "channels" },
  { key: "costStructure", n: 7, title: "Cost Structure", area: "cost" },
  { key: "revenueStreams", n: 6, title: "Revenue Streams", area: "revenue" },
];

export function seedFrom(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 100000);
}

export function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const dateOnly = iso.slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDayMonth(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatAgo(iso?: string, now = Date.now()): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, (now - then) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86400) return `${Math.max(1, Math.round(seconds / 3600))}h ago`;
  if (seconds < 172800) return "yesterday";
  return formatDate(iso) ?? "";
}

/** Locked pass line. Target wins; the success metric is the fallback. */
export function passLine(experiment: Experiment): string | undefined {
  const target = experiment.target?.trim();
  if (target) return `We are right if ${target}`;
  const metric = experiment.successMetric?.trim();
  if (metric) return `We are right if ${metric}`;
  return undefined;
}

export interface ScoreBar {
  value: number;
  total: number;
  target?: number;
}

export function scoreBar(result?: string, target?: string): ScoreBar | null {
  if (!result) return null;
  const ofMatch = result.match(/(\d+(?:\.\d+)?)\s*(?:of|\/)\s*(\d+(?:\.\d+)?)/i);
  if (ofMatch) {
    const value = Number(ofMatch[1]);
    const total = Number(ofMatch[2]);
    if (!total) return null;
    const targetMatch = target?.match(/(\d+(?:\.\d+)?)/);
    return { value, total, target: targetMatch ? Number(targetMatch[1]) : undefined };
  }
  const versus = result.match(/(\d+(?:\.\d+)?)\s*vs\.?\s*(\d+(?:\.\d+)?)/i);
  if (versus) {
    const value = Number(versus[1]);
    const mark = Number(versus[2]);
    return { value, total: Math.max(value, mark, 1), target: mark };
  }
  return null;
}

export function evidenceRank(level?: EvidenceLevel): number {
  if (!level) return -1;
  return EVIDENCE_LEVELS.indexOf(level);
}

/** Only behaviour (Did) is strong enough to call an assumption Validated. */
export function evidenceValidates(level?: EvidenceLevel): boolean {
  return level === "Did";
}
