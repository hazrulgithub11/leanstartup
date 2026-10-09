import { beforeEach, describe, expect, it } from "vitest";
import { exampleBoard } from "../shared/example-data";
import { getBoard, resetBoardCacheForTests } from "../shared/load-board";
import { normalizeNotion, queryAllPages, type NotionPage, type NotionProperty } from "../shared/notion";
import { passLine, scoreBar } from "../shared/text";
import { latestCanvas, primaryExperiment, validationNote } from "../shared/select";

function title(text: string): NotionProperty {
  return { type: "title", title: [{ plain_text: text }] };
}
function rich(text: string): NotionProperty {
  return { type: "rich_text", rich_text: text ? [{ plain_text: text }] : [] };
}
function select(name: string): NotionProperty {
  return { type: "select", select: { name } };
}
function status(name: string): NotionProperty {
  return { type: "status", status: { name } };
}
function relation(...ids: string[]): NotionProperty {
  return { type: "relation", relation: ids.map((id) => ({ id })) };
}
function date(start: string): NotionProperty {
  return { type: "date", date: { start } };
}
function number(value: number): NotionProperty {
  return { type: "number", number: value };
}
function page(id: string, properties: Record<string, NotionProperty>, edited = "2026-10-02T08:00:00.000Z"): NotionPage {
  return { id, url: `https://www.notion.so/${id}`, last_edited_time: edited, properties };
}

describe("normalizeNotion", () => {
  it("maps titles, rich text, status, numbers, dates and relations", () => {
    const board = normalizeNotion({
      ideas: [
        page("idea-1", {
          Name: title("TuitionMatch KL"),
          Status: status("Testing"),
          Problem: rich("Hard to find a tutor"),
          "Customer segment": rich("Parents in Subang"),
        }),
      ],
      canvases: [
        page("canvas-1", {
          Canvas: title("Lean Canvas v1"),
          Version: number(1),
          Date: date("2026-09-12"),
          Idea: relation("idea-1"),
          Problem: rich("Old problem"),
        }),
        page("canvas-2", {
          Canvas: title("Lean Canvas"),
          Version: number(2),
          Date: date("2026-10-02"),
          Idea: relation("idea-1"),
          Problem: rich("Vetted shortlist"),
          "Unique Value Proposition": rich("A tutor in 48 hours"),
        }),
      ],
      assumptions: [
        page("asm-1", {
          Statement: title("Parents will pay"),
          Type: select("Value"),
          Risk: select("High"),
          Status: select("Testing"),
          Idea: relation("idea-1"),
        }),
      ],
      experiments: [
        page("exp-1", {
          Name: title("Concierge"),
          Method: rich("Match 10 families by hand"),
          Outcome: select("Running"),
          "Success metric": rich("Parents who pay"),
          Target: rich(">= 4 of 10"),
          Result: rich("3 of 8"),
          Idea: relation("idea-1"),
          Assumption: relation("asm-1"),
        }),
      ],
      learnings: [
        page("learn-1", {
          Insight: title("Supply is not the bottleneck"),
          Date: date("2026-09-30"),
          Decision: select("Persevere"),
          Idea: relation("idea-1"),
          Experiment: relation("exp-1"),
        }),
      ],
    });

    expect(board.ideas[0]).toMatchObject({
      name: "TuitionMatch KL",
      status: "Testing",
      problem: "Hard to find a tutor",
      customerSegment: "Parents in Subang",
    });
    expect(board.canvases.map((canvas) => canvas.version)).toEqual([1, 2]);
    expect(latestCanvas({ source: "notion", syncedAt: "", ...board }, "idea-1")?.id).toBe("canvas-2");
    expect(board.assumptions[0]).toMatchObject({ code: "A1", risk: "High", status: "Testing", type: "Value" });
    expect(board.experiments[0]).toMatchObject({
      code: "E1",
      assumptionId: "asm-1",
      outcome: "Running",
      target: ">= 4 of 10",
      evidence: undefined,
      lockedAt: undefined,
    });
    expect(board.learnings[0]).toMatchObject({
      decision: "Persevere",
      experimentId: "exp-1",
      observed: undefined,
      learned: undefined,
      therefore: undefined,
    });
    expect(passLine(board.experiments[0])).toBe("We are right if >= 4 of 10");
  });

  it("keeps evidence, lock date and Pause only when those fields are present", () => {
    const board = normalizeNotion({
      ideas: [page("idea-1", { Name: title("Kek") })],
      canvases: [],
      assumptions: [],
      experiments: [
        page("exp-1", {
          Name: title("Poll"),
          Outcome: select("Passed"),
          Evidence: select("Said"),
          Locked: date("2026-09-01"),
          Idea: relation("idea-1"),
        }),
      ],
      learnings: [
        page("learn-1", {
          Insight: title("Hold"),
          Decision: select("Pause"),
          "Pivot type": select("Channel"),
          Observed: rich("Nothing moved"),
          Idea: relation("idea-1"),
        }),
      ],
    });
    expect(board.experiments[0].evidence).toBe("Said");
    expect(board.experiments[0].lockedAt).toBe("2026-09-01");
    expect(board.learnings[0].decision).toBe("Pause");
    expect(board.learnings[0].pivotType).toBe("Channel");
    expect(board.learnings[0].observed).toBe("Nothing moved");
  });

  it("drops rows that are not linked to an idea", () => {
    const board = normalizeNotion({
      ideas: [],
      canvases: [page("canvas-1", { Canvas: title("Orphan"), Version: number(1) })],
      assumptions: [page("asm-1", { Statement: title("Floating") })],
      experiments: [],
      learnings: [],
    });
    expect(board.canvases).toHaveLength(0);
    expect(board.assumptions).toHaveLength(0);
  });
});

describe("queryAllPages", () => {
  it("follows pagination and sends the 2025-09-03 data source query", async () => {
    const calls: { url: string; version: string; body: { start_cursor?: string } }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body)) as { start_cursor?: string };
      calls.push({
        url: String(input),
        version: new Headers(init?.headers).get("Notion-Version") ?? "",
        body,
      });
      if (!body.start_cursor) {
        return new Response(JSON.stringify({ results: [{ id: "a", properties: {} }], has_more: true, next_cursor: "cursor-2" }), { status: 200 });
      }
      return new Response(JSON.stringify({ results: [{ id: "b", properties: {} }], has_more: false, next_cursor: null }), { status: 200 });
    };
    const pages = await queryAllPages("cb7a1003-54b9-41fa-9450-247a7a8ee734", "secret", fetchImpl);
    expect(pages.map((item) => item.id)).toEqual(["a", "b"]);
    expect(calls[0].url).toBe("https://api.notion.com/v1/data_sources/cb7a1003-54b9-41fa-9450-247a7a8ee734/query");
    expect(calls[0].version).toBe("2025-09-03");
    expect(calls[1].body.start_cursor).toBe("cursor-2");
    expect(calls[0].url).not.toContain("secret");
  });
});

describe("getBoard", () => {
  beforeEach(() => resetBoardCacheForTests());

  it("serves example data when the token is missing and does not call Notion", async () => {
    let called = false;
    const result = await getBoard({
      now: Date.parse("2026-10-09T00:00:00Z"),
      env: () => undefined,
      fetchImpl: async () => {
        called = true;
        return new Response("nope", { status: 500 });
      },
    });
    expect(called).toBe(false);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ source: "example" });
    if ("ideas" in result.body) expect(result.body.ideas.length).toBeGreaterThan(1);
  });

  it("caches a Notion payload and bypasses the cache on refresh", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ results: [], has_more: false }), { status: 200 });
    };
    const env = (name: string) => (name === "NOTION_TOKEN" ? "token-1" : undefined);
    const first = await getBoard({ now: 1_000, ttlMs: 500, env, fetchImpl });
    expect(first.status).toBe(200);
    expect(calls).toBe(5);
    const second = await getBoard({ now: 1_200, ttlMs: 500, env, fetchImpl });
    expect(second.status).toBe(200);
    expect(calls).toBe(5);
    const third = await getBoard({ now: 1_200, ttlMs: 500, env, fetchImpl, refresh: true });
    expect(third.status).toBe(200);
    expect(calls).toBe(10);
  });

  it("returns a Notion error instead of example data when the token is set and the API fails", async () => {
    const result = await getBoard({
      now: 5_000,
      env: (name) => (name === "NOTION_TOKEN" ? "token-1" : undefined),
      fetchImpl: async () => new Response("no access", { status: 404 }),
    });
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ source: "notion" });
    if ("error" in result.body) expect(result.body.error).toContain("404");
  });
});

describe("evidence rule on the example board", () => {
  const board = exampleBoard(0);
  const a2 = board.assumptions.find((item) => item.id === "asm-a2");
  const a4 = board.assumptions.find((item) => item.id === "asm-a4");

  it("keeps a passed interview on Said from validating", () => {
    expect(a2 && validationNote(a2, board.experiments)).toMatch(/Said/);
    expect(primaryExperiment(board.experiments, "asm-a2")?.evidence).toBe("Said");
  });

  it("treats tutor sign-ups as Did, which can validate", () => {
    expect(a4 && validationNote(a4, board.experiments)).toMatch(/did/i);
    expect(scoreBar("22 vs 15", ">= 15")?.target).toBe(15);
    expect(scoreBar("8 of 10", ">= 6 of 10")).toMatchObject({ value: 8, total: 10, target: 6 });
  });
});
