import type { BoardPayload, Idea } from "./types";
import { latestCanvas, loopLabel } from "./select";

export type SectionId = "idea" | "assumptions" | "experiment" | "measure" | "learn" | "decision";

export const SECTION_ORDER: SectionId[] = ["idea", "assumptions", "experiment", "measure", "learn", "decision"];

export const SECTION_LABEL: Record<SectionId, string> = {
  idea: "1  Idea",
  assumptions: "2  Assumptions",
  experiment: "3  Experiment",
  measure: "4  Measure",
  learn: "5  Learn",
  decision: "6  Pivot / Persevere",
};

export type CardKind =
  | "idea"
  | "canvas"
  | "assumption"
  | "experiment"
  | "measure"
  | "learning"
  | "decision"
  | "empty"
  | "summary";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutCard {
  id: string;
  kind: CardKind;
  entityId: string;
  ideaId: string;
  section: SectionId;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface LayoutFrame {
  id: string;
  ideaId?: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  mode: "full" | "cluster";
  overview: boolean;
}

export interface LayoutSection {
  ideaId: string;
  section: SectionId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutArrow {
  id: string;
  fromId: string;
  toId: string;
  kind: "test" | "loop";
  label?: string;
}

export interface BoardLayout {
  frames: LayoutFrame[];
  cards: LayoutCard[];
  sections: LayoutSection[];
  arrows: LayoutArrow[];
  bounds: Rect;
  overviewBounds: Rect;
}

export type Offsets = Record<string, { dx: number; dy: number }>;

const PAD_X = 28;
const PAD_BOTTOM = 30;
const HEADER = 104;
const COL_GAP = 24;
const CARD_GAP = 12;
const ORIGIN_X = 72;
const ORIGIN_Y = 56;
const FRAME_GAP = 84;
const LOOP_PAD = 52;
const IDEA_W = 214;
const IDEA_H = 240;
const CANVAS_W = 640;
const CANVAS_H = 460;
const STICKY_W = 184;
const STICKY_H = 124;
const EXP_W = 224;
const ROW_H = 146;
const MEASURE_W = 184;
const LEARN_W = 204;
const LEARN_H = 136;
const DECISION = 158;
const EMPTY_W = 172;
const EMPTY_H = 78;
const CLUSTER_INNER = 312;
const SUMMARY_H = 104;

interface LocalCard {
  id: string;
  kind: CardKind;
  entityId: string;
  section: SectionId;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface Column {
  section: SectionId;
  w: number;
  cards: LocalCard[];
}

function columnHeight(column: Column): number {
  if (column.cards.length === 0) return 0;
  return Math.max(...column.cards.map((card) => card.y + card.h));
}

export function ideaRichness(board: BoardPayload, ideaId: string): number {
  const assumptions = board.assumptions.filter((item) => item.ideaId === ideaId).length;
  const experiments = board.experiments.filter((item) => item.ideaId === ideaId).length;
  const learnings = board.learnings.filter((item) => item.ideaId === ideaId).length;
  const canvas = board.canvases.some((item) => item.ideaId === ideaId) ? 2 : 0;
  return assumptions + experiments * 2 + learnings + canvas;
}

export function frameIdFor(ideaId: string): string {
  return `frame:${ideaId}`;
}

function buildColumns(board: BoardPayload, idea: Idea): {
  columns: Column[];
  loopFrom?: string;
  loopTo?: string;
  loopText?: string;
} {
  const assumptions = board.assumptions.filter((item) => item.ideaId === idea.id);
  const experiments = board.experiments.filter((item) => item.ideaId === idea.id);
  const learnings = board.learnings.filter((item) => item.ideaId === idea.id);
  const canvas = latestCanvas(board, idea.id);
  const pipeline = assumptions.length > 0 || experiments.length > 0 || learnings.length > 0;
  const columns: Column[] = [];

  const ideaCards: LocalCard[] = [
    {
      id: `idea:${idea.id}`,
      kind: "idea",
      entityId: idea.id,
      section: "idea",
      x: 0,
      y: 0,
      w: IDEA_W,
      h: IDEA_H,
    },
  ];
  let ideaW = IDEA_W;
  if (canvas) {
    ideaCards.push({
      id: `canvas:${canvas.id}`,
      kind: "canvas",
      entityId: canvas.id,
      section: "idea",
      x: IDEA_W + CARD_GAP,
      y: 0,
      w: CANVAS_W,
      h: CANVAS_H,
    });
    ideaW = IDEA_W + CARD_GAP + CANVAS_W;
  } else if (pipeline) {
    ideaCards.push({
      id: `empty-canvas:${idea.id}`,
      kind: "empty",
      entityId: idea.id,
      section: "idea",
      x: IDEA_W + CARD_GAP,
      y: 0,
      w: 210,
      h: EMPTY_H,
      label: "No canvas yet",
    });
    ideaW = IDEA_W + CARD_GAP + 210;
  }
  columns.push({ section: "idea", w: ideaW, cards: ideaCards });

  if (!pipeline) return { columns };

  columns.push({
    section: "assumptions",
    w: assumptions.length ? STICKY_W : EMPTY_W,
    cards: assumptions.length
      ? assumptions.map((item, index) => ({
          id: `assumption:${item.id}`,
          kind: "assumption" as const,
          entityId: item.id,
          section: "assumptions" as const,
          x: 0,
          y: index * (STICKY_H + CARD_GAP),
          w: STICKY_W,
          h: STICKY_H,
        }))
      : [
          {
            id: `empty-assumptions:${idea.id}`,
            kind: "empty",
            entityId: idea.id,
            section: "assumptions",
            x: 0,
            y: 0,
            w: EMPTY_W,
            h: EMPTY_H,
            label: "No assumptions yet",
          },
        ],
  });

  if (experiments.length) {
    columns.push({
      section: "experiment",
      w: EXP_W,
      cards: experiments.map((item, index) => ({
        id: `experiment:${item.id}`,
        kind: "experiment" as const,
        entityId: item.id,
        section: "experiment" as const,
        x: 0,
        y: index * (ROW_H + CARD_GAP),
        w: EXP_W,
        h: ROW_H,
      })),
    });
    columns.push({
      section: "measure",
      w: MEASURE_W,
      cards: experiments.map((item, index) => ({
        id: `measure:${item.id}`,
        kind: "measure" as const,
        entityId: item.id,
        section: "measure" as const,
        x: 0,
        y: index * (ROW_H + CARD_GAP),
        w: MEASURE_W,
        h: ROW_H,
      })),
    });
  } else {
    columns.push({
      section: "experiment",
      w: EMPTY_W,
      cards: [
        {
          id: `empty-experiment:${idea.id}`,
          kind: "empty",
          entityId: idea.id,
          section: "experiment",
          x: 0,
          y: 0,
          w: EMPTY_W,
          h: EMPTY_H,
          label: "No experiments yet",
        },
      ],
    });
  }

  columns.push({
    section: "learn",
    w: learnings.length ? LEARN_W : EMPTY_W,
    cards: learnings.length
      ? learnings.map((item, index) => ({
          id: `learning:${item.id}`,
          kind: "learning" as const,
          entityId: item.id,
          section: "learn" as const,
          x: 0,
          y: index * (LEARN_H + CARD_GAP),
          w: LEARN_W,
          h: LEARN_H,
        }))
      : [
          {
            id: `empty-learn:${idea.id}`,
            kind: "empty",
            entityId: idea.id,
            section: "learn",
            x: 0,
            y: 0,
            w: EMPTY_W,
            h: EMPTY_H,
            label: "No learning yet",
          },
        ],
  });

  const decided = [...learnings].reverse().find((item) => item.decision);
  const contentSoFar = Math.max(...columns.map(columnHeight), DECISION);
  columns.push({
    section: "decision",
    w: DECISION,
    cards: [
      {
        id: `decision:${idea.id}`,
        kind: "decision",
        entityId: decided?.id ?? idea.id,
        section: "decision",
        x: 0,
        y: Math.max(0, (contentSoFar - DECISION) / 2),
        w: DECISION,
        h: DECISION,
        label: decided ? undefined : "No decision yet",
      },
    ],
  });

  const hasLoop = Boolean(canvas && decided);
  return {
    columns,
    loopFrom: hasLoop ? `decision:${idea.id}` : undefined,
    loopTo: hasLoop && canvas ? `canvas:${canvas.id}` : undefined,
    loopText: hasLoop ? loopLabel(board, idea.id) : undefined,
  };
}

function placeFrame(
  board: BoardPayload,
  idea: Idea,
  originX: number,
  originY: number,
  overview: boolean,
): { frame: LayoutFrame; cards: LayoutCard[]; sections: LayoutSection[]; arrows: LayoutArrow[] } {
  const built = buildColumns(board, idea);
  const contentH = Math.max(...built.columns.map(columnHeight), 80);
  let cursor = 0;
  const cards: LayoutCard[] = [];
  const sections: LayoutSection[] = [];
  for (const column of built.columns) {
    sections.push({
      ideaId: idea.id,
      section: column.section,
      label: SECTION_LABEL[column.section],
      x: originX + PAD_X + cursor,
      y: originY + 70,
      w: column.w,
      h: 26,
    });
    for (const card of column.cards) {
      cards.push({
        ...card,
        ideaId: idea.id,
        x: originX + PAD_X + cursor + card.x,
        y: originY + HEADER + card.y,
      });
    }
    cursor += column.w + COL_GAP;
  }
  const frame: LayoutFrame = {
    id: frameIdFor(idea.id),
    ideaId: idea.id,
    title: idea.name,
    x: originX,
    y: originY,
    w: PAD_X * 2 + cursor - COL_GAP,
    h: HEADER + contentH + PAD_BOTTOM + (built.loopFrom ? LOOP_PAD : 0),
    mode: "full",
    overview,
  };
  const arrows: LayoutArrow[] = [];
  if (built.loopFrom && built.loopTo) {
    arrows.push({ id: `loop:${idea.id}`, fromId: built.loopFrom, toId: built.loopTo, kind: "loop", label: built.loopText });
  }
  for (const experiment of board.experiments.filter((item) => item.ideaId === idea.id)) {
    if (!experiment.assumptionId) continue;
    const fromId = `assumption:${experiment.assumptionId}`;
    const toId = `experiment:${experiment.id}`;
    if (cards.some((card) => card.id === fromId) && cards.some((card) => card.id === toId)) {
      arrows.push({ id: `arrow:${experiment.id}`, fromId, toId, kind: "test" });
    }
  }
  return { frame, cards, sections, arrows };
}

function union(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 480, h: 320 };
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { x, y, w: right - x, h: bottom - y };
}

export function layoutBoard(board: BoardPayload, options?: { status?: string }): BoardLayout {
  const status = options?.status && options.status !== "all" ? options.status : undefined;
  const ideas = status ? board.ideas.filter((idea) => idea.status === status) : board.ideas.slice();
  const ranked = ideas
    .slice()
    .sort((a, b) => ideaRichness(board, b.id) - ideaRichness(board, a.id) || ideas.indexOf(a) - ideas.indexOf(b));
  const featuredIds = new Set(ranked.filter((idea) => ideaRichness(board, idea.id) >= 6).slice(0, 2).map((idea) => idea.id));
  const featured = ideas.filter((idea) => featuredIds.has(idea.id));
  const others = ideas.filter((idea) => !featuredIds.has(idea.id));
  const useCluster = featured.length > 0 && others.length > 0;

  const frames: LayoutFrame[] = [];
  const cards: LayoutCard[] = [];
  const sections: LayoutSection[] = [];
  const arrows: LayoutArrow[] = [];

  let cursorY = ORIGIN_Y;
  let maxRight = ORIGIN_X;
  for (const idea of featured) {
    const placed = placeFrame(board, idea, ORIGIN_X, cursorY, true);
    frames.push(placed.frame);
    cards.push(...placed.cards);
    sections.push(...placed.sections);
    arrows.push(...placed.arrows);
    cursorY += placed.frame.h + FRAME_GAP;
    maxRight = Math.max(maxRight, placed.frame.x + placed.frame.w);
  }

  if (featured.length === 0) {
    let stackY = ORIGIN_Y;
    for (const idea of ideas) {
      const placed = placeFrame(board, idea, ORIGIN_X, stackY, true);
      frames.push(placed.frame);
      cards.push(...placed.cards);
      sections.push(...placed.sections);
      arrows.push(...placed.arrows);
      stackY += placed.frame.h + FRAME_GAP;
    }
  }

  if (useCluster) {
    const clusterX = maxRight + 64;
    const clusterY = ORIGIN_Y;
    const header = 72;
    const pad = 16;
    others.forEach((idea, index) => {
      cards.push({
        id: `summary:${idea.id}`,
        kind: "summary",
        entityId: idea.id,
        ideaId: idea.id,
        section: "idea",
        x: clusterX + pad,
        y: clusterY + header + index * (SUMMARY_H + 14),
        w: CLUSTER_INNER,
        h: SUMMARY_H,
      });
    });
    frames.push({
      id: "cluster",
      title: "Other ideas",
      subtitle: `${others.length} frame${others.length === 1 ? "" : "s"} · zoom in to open`,
      x: clusterX,
      y: clusterY,
      w: CLUSTER_INNER + pad * 2,
      h: header + others.length * (SUMMARY_H + 14) - 14 + pad,
      mode: "cluster",
      overview: true,
    });
    let detailY = union(frames.filter((frame) => frame.overview)).y + union(frames.filter((frame) => frame.overview)).h + 180;
    for (const idea of others) {
      const placed = placeFrame(board, idea, ORIGIN_X, detailY, false);
      frames.push(placed.frame);
      cards.push(...placed.cards);
      sections.push(...placed.sections);
      arrows.push(...placed.arrows);
      detailY += placed.frame.h + FRAME_GAP;
    }
  }

  const bounds = union(frames);
  const overviewBounds = union(frames.filter((frame) => frame.overview));
  return { frames, cards, sections, arrows, bounds, overviewBounds };
}

export function applyOffsets(layout: BoardLayout, offsets: Offsets): BoardLayout {
  if (Object.keys(offsets).length === 0) return layout;
  const shiftOf = (id: string) => offsets[id] ?? { dx: 0, dy: 0 };

  const movedFrames = layout.frames.map((frame) => {
    const shift = shiftOf(frame.id);
    return { ...frame, x: frame.x + shift.dx, y: frame.y + shift.dy };
  });

  const cards = layout.cards.map((card) => {
    const frameShift = card.kind === "summary" ? shiftOf("cluster") : shiftOf(frameIdFor(card.ideaId));
    const own = shiftOf(card.id);
    return { ...card, x: card.x + frameShift.dx + own.dx, y: card.y + frameShift.dy + own.dy };
  });

  const sections = layout.sections.map((section) => {
    const shift = shiftOf(frameIdFor(section.ideaId));
    return { ...section, x: section.x + shift.dx, y: section.y + shift.dy };
  });

  const frames = movedFrames.map((frame) => {
    const mine =
      frame.mode === "cluster"
        ? cards.filter((card) => card.kind === "summary")
        : cards.filter((card) => card.ideaId === frame.ideaId && card.kind !== "summary");
    let x = frame.x;
    let y = frame.y;
    let right = frame.x + frame.w;
    let bottom = frame.y + frame.h;
    for (const card of mine) {
      x = Math.min(x, card.x - 18);
      y = Math.min(y, card.y - HEADER);
      right = Math.max(right, card.x + card.w + 18);
      bottom = Math.max(bottom, card.y + card.h + 22);
    }
    return { ...frame, x, y, w: right - x, h: bottom - y };
  });

  return {
    frames,
    cards,
    sections,
    arrows: layout.arrows,
    bounds: union(frames),
    overviewBounds: union(frames.filter((frame) => frame.overview)),
  };
}

export function focusAt(layout: BoardLayout, worldX: number, worldY: number): { ideaId?: string; section?: SectionId } {
  const frame = layout.frames.find(
    (item) =>
      item.mode === "full" &&
      item.ideaId &&
      worldX >= item.x &&
      worldX <= item.x + item.w &&
      worldY >= item.y &&
      worldY <= item.y + item.h,
  );
  if (!frame?.ideaId) return {};
  const section = layout.sections.find((item) => item.ideaId === frame.ideaId && worldX >= item.x && worldX <= item.x + item.w);
  return { ideaId: frame.ideaId, section: section?.section };
}

export function lodForZoom(zoom: number): "far" | "mid" | "near" {
  if (zoom < 0.32) return "far";
  if (zoom < 0.72) return "mid";
  return "near";
}
