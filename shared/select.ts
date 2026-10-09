import type { Assumption, BoardPayload, Experiment, Idea, LeanCanvas, Learning } from "./types";
import { evidenceRank } from "./text";

const RISK_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function latestCanvas(board: BoardPayload, ideaId: string): LeanCanvas | undefined {
  const list = board.canvases.filter((canvas) => canvas.ideaId === ideaId);
  if (list.length === 0) return undefined;
  return [...list].sort((a, b) => b.version - a.version || (b.date ?? "").localeCompare(a.date ?? ""))[0];
}

export function assumptionsFor(board: BoardPayload, ideaId: string): Assumption[] {
  return board.assumptions.filter((item) => item.ideaId === ideaId);
}

export function experimentsFor(board: BoardPayload, ideaId: string): Experiment[] {
  return board.experiments.filter((item) => item.ideaId === ideaId);
}

export function learningsFor(board: BoardPayload, ideaId: string): Learning[] {
  return board.learnings.filter((item) => item.ideaId === ideaId);
}

export function latestDecision(board: BoardPayload, ideaId: string): Learning | undefined {
  return learningsFor(board, ideaId)
    .filter((item) => item.decision)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .at(-1);
}

export function deriveNow(board: BoardPayload, ideaId: string): string {
  const experiments = experimentsFor(board, ideaId);
  if (experiments.some((item) => item.outcome === "Running")) return "Measure";
  const decision = latestDecision(board, ideaId);
  if (decision?.decision === "Pause") return "Pause";
  if (decision?.decision === "Pivot" || decision?.decision === "Persevere") return "Pivot / Persevere";
  if (experiments.length) return "Experiment";
  if (assumptionsFor(board, ideaId).length) return "Assumptions";
  if (latestCanvas(board, ideaId)) return "Canvas";
  return "Idea";
}

export function summaryLine(board: BoardPayload, idea: Idea): string {
  const assumptions = assumptionsFor(board, idea.id);
  if (assumptions.length === 0 && idea.status === "Brainstorm") return "No assumptions yet";
  const open = assumptions.filter((item) => item.status === "Untested" || item.status === "Testing");
  const pool = (open.length ? open : assumptions).slice().sort((a, b) => {
    const byRisk = (RISK_RANK[a.risk] ?? 9) - (RISK_RANK[b.risk] ?? 9);
    if (byRisk !== 0) return byRisk;
    return (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true });
  });
  if (pool[0]) return pool[0].statement;
  return idea.problem || "No problem written yet";
}

export function loopLabel(board: BoardPayload, ideaId: string): string {
  const decision = latestDecision(board, ideaId);
  const canvas = latestCanvas(board, ideaId);
  if (decision?.decision === "Pivot") {
    const version = canvas ? `Canvas v${canvas.version}` : "the canvas";
    const type = decision.pivotType ? ` (${decision.pivotType})` : "";
    return `pivot · ${version}${type}`;
  }
  if (decision?.decision === "Pause") return "paused";
  return "next loop: Build > Measure > Learn";
}

export function primaryExperiment(experiments: Experiment[], assumptionId: string): Experiment | undefined {
  const rank: Record<string, number> = { Running: 0, Passed: 1, Failed: 2, Planned: 3 };
  return experiments
    .filter((item) => item.assumptionId === assumptionId)
    .slice()
    .sort((a, b) => (rank[a.outcome] ?? 9) - (rank[b.outcome] ?? 9))[0];
}

export function learningForExperiment(learnings: Learning[], experimentId: string): Learning | undefined {
  return learnings.find((item) => item.experimentId === experimentId);
}

export function validationNote(assumption: Assumption, experiments: Experiment[]): string | undefined {
  const linked = experiments.filter((item) => item.assumptionId === assumption.id && item.evidence);
  if (linked.length === 0) return undefined;
  const best = linked.reduce((top, item) => (evidenceRank(item.evidence) > evidenceRank(top) ? item.evidence! : top), linked[0].evidence!);
  if (assumption.status === "Validated" && best !== "Did") {
    return "Only “Did” evidence can mark an assumption Validated.";
  }
  const softPass = linked.find((item) => item.outcome === "Passed" && item.evidence && item.evidence !== "Did");
  if (assumption.status !== "Validated" && softPass?.evidence) {
    return `Passed, but “${softPass.evidence}” can't validate. ${assumption.code ?? "This"} stays ${assumption.status}.`;
  }
  if (best === "Did" && assumption.status === "Validated") return "Validated from what people did.";
  return undefined;
}
