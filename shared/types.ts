export type IdeaStatus =
  | "Brainstorm"
  | "Canvas"
  | "Testing"
  | "Persevere"
  | "Pivot"
  | "Parked"
  | (string & {});

export type Risk = "High" | "Medium" | "Low";

export type AssumptionStatus = "Untested" | "Testing" | "Validated" | "Invalidated";

export type Outcome = "Planned" | "Running" | "Passed" | "Failed";

export type EvidenceLevel = "Opinion" | "Research" | "Said" | "Did";

export type Decision = "Persevere" | "Pivot" | "Pause";

export interface Idea {
  id: string;
  name: string;
  status: string;
  problem: string;
  customerSegment: string;
  updatedAt?: string;
  url?: string;
}

export interface CanvasBoxes {
  problem: string;
  customerSegments: string;
  uniqueValueProposition: string;
  solution: string;
  channels: string;
  revenueStreams: string;
  costStructure: string;
  keyMetrics: string;
  unfairAdvantage: string;
}

export interface LeanCanvas {
  id: string;
  ideaId: string;
  name: string;
  version: number;
  date?: string;
  boxes: CanvasBoxes;
  url?: string;
}

export interface Assumption {
  id: string;
  ideaId: string;
  statement: string;
  type: string;
  risk: Risk;
  status: AssumptionStatus;
  code?: string;
  url?: string;
}

export interface Experiment {
  id: string;
  ideaId: string;
  assumptionId?: string;
  name: string;
  code?: string;
  method?: string;
  outcome: Outcome;
  successMetric?: string;
  target?: string;
  result?: string;
  /** Optional until Experiments.Evidence exists in Notion. */
  evidence?: EvidenceLevel;
  /** Optional until Experiments.Locked exists in Notion. */
  lockedAt?: string;
  url?: string;
}

export interface Learning {
  id: string;
  ideaId: string;
  experimentId?: string;
  insight: string;
  date?: string;
  decision?: Decision;
  pivotType?: string;
  /** Optional parts of a Strategyzer learning card. Hidden when absent. */
  observed?: string;
  learned?: string;
  therefore?: string;
  url?: string;
}

export interface BoardPayload {
  source: "notion" | "example";
  syncedAt: string;
  ideas: Idea[];
  canvases: LeanCanvas[];
  assumptions: Assumption[];
  experiments: Experiment[];
  learnings: Learning[];
}

export interface BoardError {
  source: "notion";
  error: string;
  syncedAt: string;
}
