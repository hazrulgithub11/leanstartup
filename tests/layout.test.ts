import { describe, expect, it } from "vitest";
import { exampleBoard } from "../shared/example-data";
import { applyOffsets, focusAt, frameIdFor, layoutBoard, type Rect } from "../shared/layout";

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - 1 && a.x + a.w - 1 > b.x && a.y < b.y + b.h - 1 && a.y + a.h - 1 > b.y;
}

function pairsOverlap(rects: Rect[]): boolean {
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (overlaps(rects[i], rects[j])) return true;
    }
  }
  return false;
}

describe("layoutBoard", () => {
  const board = exampleBoard(0);
  const layout = layoutBoard(board);

  it("flows stages left to right and keeps cards from overlapping", () => {
    const tuition = "idea-tuition";
    const sections = layout.sections.filter((section) => section.ideaId === tuition);
    const order = ["idea", "assumptions", "experiment", "measure", "learn", "decision"];
    for (let index = 1; index < order.length; index += 1) {
      const previous = sections.find((section) => section.section === order[index - 1]);
      const current = sections.find((section) => section.section === order[index]);
      expect(previous && current && current.x).toBeGreaterThan(previous?.x ?? 0);
    }
    expect(pairsOverlap(layout.cards)).toBe(false);
    expect(pairsOverlap(layout.frames)).toBe(false);
    const tuitionCards = layout.cards.filter((card) => card.ideaId === tuition && card.kind !== "summary");
    const tuitionSections = layout.sections.filter((section) => section.ideaId === tuition);
    for (const section of tuitionSections) {
      for (const card of tuitionCards) expect(overlaps(section, card)).toBe(false);
    }
  });

  it("shows only the latest canvas and links a test to its assumption", () => {
    const canvases = layout.cards.filter((card) => card.kind === "canvas" && card.ideaId === "idea-tuition");
    expect(canvases.map((card) => card.entityId)).toEqual(["canvas-tuition-v2"]);
    expect(layout.arrows.some((arrow) => arrow.fromId === "assumption:asm-a2" && arrow.toId === "experiment:exp-e1")).toBe(true);
    expect(layout.arrows.some((arrow) => arrow.kind === "loop" && arrow.id === "loop:idea-tuition")).toBe(true);
  });

  it("grows with more assumptions without stacking them on top of each other", () => {
    const many = {
      ...board,
      ideas: [board.ideas[0]],
      canvases: [],
      assumptions: Array.from({ length: 12 }, (_, index) => ({
        id: `a-${index}`,
        ideaId: "idea-tuition",
        statement: `Belief ${index} is long enough to wrap`,
        type: "Value",
        risk: "High" as const,
        status: "Untested" as const,
      })),
      experiments: [],
      learnings: [],
    };
    const packed = layoutBoard(many);
    const stickies = packed.cards.filter((card) => card.kind === "assumption");
    expect(stickies).toHaveLength(12);
    expect(pairsOverlap(stickies)).toBe(false);
    const frame = packed.frames.find((item) => item.ideaId === "idea-tuition");
    expect(frame && frame.h).toBeGreaterThan(12 * 100);
  });

  it("keeps a brainstorm frame narrower than a full loop", () => {
    const tuition = layout.frames.find((frame) => frame.ideaId === "idea-tuition" && frame.mode === "full");
    const surau = layout.frames.find((frame) => frame.ideaId === "idea-surau" && frame.mode === "full");
    expect(tuition).toBeTruthy();
    expect(surau).toBeTruthy();
    expect(surau!.w).toBeLessThan(tuition!.w);
    expect(layout.frames.some((frame) => frame.id === "cluster" && frame.overview)).toBe(true);
    expect(surau?.overview).toBe(false);
  });

  it("names the section under the centre of a frame", () => {
    const frame = layout.frames.find((item) => item.ideaId === "idea-tuition" && item.mode === "full");
    expect(frame).toBeTruthy();
    const section = layout.sections.find((item) => item.ideaId === "idea-tuition" && item.section === "assumptions");
    expect(section).toBeTruthy();
    const hit = focusAt(layout, section!.x + 8, frame!.y + frame!.h / 2);
    expect(hit).toEqual({ ideaId: "idea-tuition", section: "assumptions" });
  });
});

describe("applyOffsets", () => {
  it("moves a dragged card and keeps it inside the frame", () => {
    const layout = layoutBoard(exampleBoard(0));
    const card = layout.cards.find((item) => item.id === "assumption:asm-a2");
    expect(card).toBeTruthy();
    const moved = applyOffsets(layout, { "assumption:asm-a2": { dx: 30, dy: -12 } });
    const next = moved.cards.find((item) => item.id === "assumption:asm-a2");
    expect(next).toMatchObject({ x: (card?.x ?? 0) + 30, y: (card?.y ?? 0) - 12 });
    const frame = moved.frames.find((item) => item.id === frameIdFor("idea-tuition"));
    expect(frame).toBeTruthy();
    expect(next!.x).toBeGreaterThanOrEqual(frame!.x);
    expect(next!.y).toBeGreaterThanOrEqual(frame!.y);
    expect(next!.x + next!.w).toBeLessThanOrEqual(frame!.x + frame!.w + 1);
    expect(next!.y + next!.h).toBeLessThanOrEqual(frame!.y + frame!.h + 1);
  });

  it("returns the same layout when nothing has been dragged", () => {
    const layout = layoutBoard(exampleBoard(0));
    expect(applyOffsets(layout, {})).toBe(layout);
  });
});
