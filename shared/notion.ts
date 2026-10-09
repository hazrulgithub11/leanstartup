import type {
  Assumption,
  AssumptionStatus,
  CanvasBoxes,
  Decision,
  EvidenceLevel,
  Experiment,
  Idea,
  LeanCanvas,
  Learning,
  Outcome,
  Risk,
} from "./types";
import { NOTION_VERSION } from "./config";

export interface NotionRichText {
  plain_text?: string;
}

export interface NotionProperty {
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  select?: { name?: string } | null;
  status?: { name?: string } | null;
  multi_select?: { name?: string }[];
  number?: number | null;
  date?: { start?: string | null } | null;
  relation?: { id: string }[];
  checkbox?: boolean;
  url?: string | null;
  formula?: { type?: string; string?: string | null; number?: number | null; date?: { start?: string | null } | null };
}

export interface NotionPage {
  id: string;
  url?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
}

export interface NotionQueryResponse {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
}

const RISKS = new Set<Risk>(["High", "Medium", "Low"]);
const ASSUMPTION_STATUSES = new Set<AssumptionStatus>(["Untested", "Testing", "Validated", "Invalidated"]);
const OUTCOMES = new Set<Outcome>(["Planned", "Running", "Passed", "Failed"]);
const EVIDENCE = new Set<EvidenceLevel>(["Opinion", "Research", "Said", "Did"]);
const DECISIONS = new Set<Decision>(["Persevere", "Pivot", "Pause"]);

function normKey(key: string): string {
  return key.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function indexProps(properties: Record<string, NotionProperty> | undefined): Map<string, NotionProperty> {
  const map = new Map<string, NotionProperty>();
  for (const [key, value] of Object.entries(properties ?? {})) map.set(normKey(key), value);
  return map;
}

function pick(map: Map<string, NotionProperty>, ...aliases: string[]): NotionProperty | undefined {
  for (const alias of aliases) {
    const found = map.get(normKey(alias));
    if (found) return found;
  }
  return undefined;
}

export function textValue(prop?: NotionProperty): string {
  if (!prop) return "";
  const chunks = prop.title ?? prop.rich_text;
  if (chunks) return chunks.map((chunk) => chunk.plain_text ?? "").join("").trim();
  if (prop.type === "formula" && prop.formula?.string) return prop.formula.string.trim();
  return "";
}

export function choiceValue(prop?: NotionProperty): string | undefined {
  const name = prop?.select?.name ?? prop?.status?.name ?? prop?.multi_select?.find((item) => item.name)?.name;
  const trimmed = name?.trim();
  return trimmed || undefined;
}

export function numberValue(prop?: NotionProperty): number | undefined {
  if (!prop) return undefined;
  if (typeof prop.number === "number") return prop.number;
  if (typeof prop.formula?.number === "number") return prop.formula.number;
  return undefined;
}

export function dateValue(prop?: NotionProperty): string | undefined {
  const start = prop?.date?.start ?? prop?.formula?.date?.start;
  if (!start) return undefined;
  return start.slice(0, 10);
}

export function relationIds(prop?: NotionProperty): string[] {
  return (prop?.relation ?? []).map((item) => item.id).filter(Boolean);
}

function titleText(page: NotionPage, map: Map<string, NotionProperty>, ...aliases: string[]): string {
  const named = textValue(pick(map, ...aliases));
  if (named) return named;
  for (const value of Object.values(page.properties ?? {})) {
    if (value?.type === "title") {
      const text = textValue(value);
      if (text) return text;
    }
  }
  return "";
}

function asRisk(value: string | undefined): Risk {
  if (value && RISKS.has(value as Risk)) return value as Risk;
  return "Medium";
}

function asAssumptionStatus(value: string | undefined): AssumptionStatus {
  if (value && ASSUMPTION_STATUSES.has(value as AssumptionStatus)) return value as AssumptionStatus;
  return "Untested";
}

function asOutcome(value: string | undefined): Outcome {
  if (value && OUTCOMES.has(value as Outcome)) return value as Outcome;
  return "Planned";
}

function asEvidence(value: string | undefined): EvidenceLevel | undefined {
  if (value && EVIDENCE.has(value as EvidenceLevel)) return value as EvidenceLevel;
  return undefined;
}

function asDecision(value: string | undefined): Decision | undefined {
  if (value && DECISIONS.has(value as Decision)) return value as Decision;
  return undefined;
}

function fillCodes<T extends { ideaId: string; code?: string }>(items: T[], prefix: string): T[] {
  const used = new Map<string, Set<string>>();
  for (const item of items) {
    if (!item.code) continue;
    const set = used.get(item.ideaId) ?? new Set<string>();
    set.add(item.code);
    used.set(item.ideaId, set);
  }
  const next = new Map<string, number>();
  return items.map((item) => {
    if (item.code) return item;
    const set = used.get(item.ideaId) ?? new Set<string>();
    let n = next.get(item.ideaId) ?? 1;
    while (set.has(`${prefix}${n}`)) n += 1;
    const code = `${prefix}${n}`;
    set.add(code);
    used.set(item.ideaId, set);
    next.set(item.ideaId, n + 1);
    return { ...item, code };
  });
}

function emptyBoxes(): CanvasBoxes {
  return {
    problem: "",
    customerSegments: "",
    uniqueValueProposition: "",
    solution: "",
    channels: "",
    revenueStreams: "",
    costStructure: "",
    keyMetrics: "",
    unfairAdvantage: "",
  };
}

export function normalizeNotion(input: {
  ideas: NotionPage[];
  canvases: NotionPage[];
  assumptions: NotionPage[];
  experiments: NotionPage[];
  learnings: NotionPage[];
}): {
  ideas: Idea[];
  canvases: LeanCanvas[];
  assumptions: Assumption[];
  experiments: Experiment[];
  learnings: Learning[];
} {
  const ideas: Idea[] = input.ideas.map((page) => {
    const map = indexProps(page.properties);
    return {
      id: page.id,
      name: titleText(page, map, "name", "title") || "Untitled idea",
      status: choiceValue(pick(map, "status")) ?? "Brainstorm",
      problem: textValue(pick(map, "problem")),
      customerSegment: textValue(pick(map, "customer segment", "customer segments", "segment", "customer")),
      updatedAt: page.last_edited_time,
      url: page.url,
    };
  });

  const canvases: LeanCanvas[] = [];
  for (const page of input.canvases) {
    const map = indexProps(page.properties);
    const ideaId = relationIds(pick(map, "idea", "ideas"))[0];
    if (!ideaId) continue;
    const name = titleText(page, map, "canvas", "name", "title");
    const versionFromNumber = numberValue(pick(map, "version"));
    const versionFromName = name.match(/v(?:ersion)?\s*(\d+)/i);
    const boxes = emptyBoxes();
    boxes.problem = textValue(pick(map, "problem"));
    boxes.solution = textValue(pick(map, "solution"));
    boxes.uniqueValueProposition = textValue(pick(map, "unique value proposition", "uvp", "unique value"));
    boxes.unfairAdvantage = textValue(pick(map, "unfair advantage", "unfair"));
    boxes.customerSegments = textValue(pick(map, "customer segments", "customer segment", "customers"));
    boxes.keyMetrics = textValue(pick(map, "key metrics", "metrics"));
    boxes.channels = textValue(pick(map, "channels", "channel"));
    boxes.costStructure = textValue(pick(map, "cost structure", "costs"));
    boxes.revenueStreams = textValue(pick(map, "revenue streams", "revenue"));
    canvases.push({
      id: page.id,
      ideaId,
      name: name || `Lean Canvas v${versionFromNumber ?? versionFromName?.[1] ?? 1}`,
      version: versionFromNumber ?? (versionFromName ? Number(versionFromName[1]) : 1),
      date: dateValue(pick(map, "date")),
      boxes,
      url: page.url,
    });
  }

  const assumptions = fillCodes(
    input.assumptions.flatMap((page) => {
      const map = indexProps(page.properties);
      const ideaId = relationIds(pick(map, "idea", "ideas"))[0];
      if (!ideaId) return [];
      const code = textValue(pick(map, "code", "label"));
      const item: Assumption = {
        id: page.id,
        ideaId,
        statement: titleText(page, map, "statement", "name", "title") || "Untitled assumption",
        type: choiceValue(pick(map, "type", "assumption type")) ?? "",
        risk: asRisk(choiceValue(pick(map, "risk"))),
        status: asAssumptionStatus(choiceValue(pick(map, "status"))),
        code: code || undefined,
        url: page.url,
      };
      return [item];
    }),
    "A",
  );

  const experiments = fillCodes(
    input.experiments.flatMap((page) => {
      const map = indexProps(page.properties);
      const ideaId = relationIds(pick(map, "idea", "ideas"))[0];
      if (!ideaId) return [];
      const evidenceProp = pick(map, "evidence", "evidence level");
      const lockedProp = pick(map, "locked", "lock date", "locked at");
      const code = textValue(pick(map, "code", "label"));
      const item: Experiment = {
        id: page.id,
        ideaId,
        assumptionId: relationIds(pick(map, "assumption", "assumptions"))[0],
        name: titleText(page, map, "name", "title") || "Untitled experiment",
        code: code || undefined,
        method: textValue(pick(map, "method")) || undefined,
        outcome: asOutcome(choiceValue(pick(map, "outcome"))),
        successMetric: textValue(pick(map, "success metric", "metric")) || undefined,
        target: textValue(pick(map, "target", "pass line")) || undefined,
        result: textValue(pick(map, "result")) || undefined,
        evidence: evidenceProp ? asEvidence(choiceValue(evidenceProp)) : undefined,
        lockedAt: lockedProp ? dateValue(lockedProp) : undefined,
        url: page.url,
      };
      return [item];
    }),
    "E",
  );

  const learnings: Learning[] = input.learnings.flatMap((page) => {
    const map = indexProps(page.properties);
    const ideaId = relationIds(pick(map, "idea", "ideas"))[0];
    if (!ideaId) return [];
    const observed = textValue(pick(map, "observed", "we observed"));
    const learned = textValue(pick(map, "learned", "we learned"));
    const therefore = textValue(pick(map, "therefore", "therefore we will"));
    const decisionProp = pick(map, "decision");
    return [
      {
        id: page.id,
        ideaId,
        experimentId: relationIds(pick(map, "experiment", "experiments"))[0],
        insight: titleText(page, map, "insight", "name", "title") || "Untitled learning",
        date: dateValue(pick(map, "date")),
        decision: decisionProp ? asDecision(choiceValue(decisionProp)) : undefined,
        pivotType: choiceValue(pick(map, "pivot type")) ?? (textValue(pick(map, "pivot type")) || undefined),
        observed: observed || undefined,
        learned: learned || undefined,
        therefore: therefore || undefined,
        url: page.url,
      },
    ];
  });

  for (const idea of ideas) {
    const times = [idea.updatedAt];
    for (const item of [...canvases, ...assumptions, ...experiments, ...learnings]) {
      const page = [...input.canvases, ...input.assumptions, ...input.experiments, ...input.learnings].find((entry) => entry.id === item.id);
      if ("ideaId" in item && item.ideaId === idea.id && page?.last_edited_time) times.push(page.last_edited_time);
    }
    const latest = times.filter((value): value is string => Boolean(value)).sort().at(-1);
    if (latest) idea.updatedAt = latest;
  }

  return { ideas, canvases, assumptions, experiments, learnings };
}

export async function queryAllPages(
  dataSourceId: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 50; guard += 1) {
    const response = await fetchImpl(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Notion query failed for ${dataSourceId} (${response.status}): ${detail.slice(0, 280)}`);
    }
    const body = (await response.json()) as NotionQueryResponse;
    pages.push(...(body.results ?? []));
    if (!body.has_more || !body.next_cursor) break;
    cursor = body.next_cursor;
  }
  return pages;
}
