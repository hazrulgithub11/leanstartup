export const RISK_STYLE = {
  High: { fill: "#ffd0d0", stroke: "#c92a2a" },
  Medium: { fill: "#ffe59a", stroke: "#e67700" },
  Low: { fill: "#e6eaef", stroke: "#868e96" },
} as const;

export const OUTCOME_INK: Record<string, string> = {
  Passed: "#2b8a3e",
  Failed: "#c92a2a",
  Running: "#e67700",
  Planned: "#868e96",
};

export const DECISION_STYLE = {
  Persevere: { fill: "#b2f2bb", stroke: "#2b8a3e" },
  Pivot: { fill: "#ffd8a8", stroke: "#e8590c" },
  Pause: { fill: "#dee2e6", stroke: "#495057" },
} as const;

export function statusTone(status: string): { fill: string; stroke: string; ink: string } {
  switch (status) {
    case "Testing":
      return { fill: "#fff3bf", stroke: "#f08c00", ink: "#e67700" };
    case "Pivot":
      return { fill: "#ffe8cc", stroke: "#e8590c", ink: "#d9480f" };
    case "Canvas":
      return { fill: "#dbe4ff", stroke: "#4c6ef5", ink: "#364fc7" };
    case "Persevere":
      return { fill: "#d3f9d8", stroke: "#2f9e44", ink: "#2b8a3e" };
    case "Parked":
      return { fill: "#e9ecef", stroke: "#868e96", ink: "#495057" };
    default:
      return { fill: "#f1f3f5", stroke: "#868e96", ink: "#495057" };
  }
}
