import type { BoardError, BoardPayload } from "./types";
import { dataSourceIds, type EnvReader, netlifyEnv } from "./config";
import { exampleBoard } from "./example-data";
import { normalizeNotion, queryAllPages } from "./notion";

let cache: { key: string; at: number; body: BoardPayload } | null = null;

export function resetBoardCacheForTests(): void {
  cache = null;
}

export async function getBoard(options?: {
  refresh?: boolean;
  now?: number;
  ttlMs?: number;
  fetchImpl?: typeof fetch;
  env?: EnvReader;
}): Promise<{ status: number; cacheControl: string; body: BoardPayload | BoardError }> {
  const env = options?.env ?? netlifyEnv;
  const token = env("NOTION_TOKEN")?.trim();
  const now = options?.now ?? Date.now();
  const ttl = options?.ttlMs ?? 45_000;
  if (!token) {
    return { status: 200, cacheControl: "no-store", body: exampleBoard(now) };
  }
  if (!options?.refresh && cache && cache.key === token && now - cache.at < ttl) {
    return { status: 200, cacheControl: "private, max-age=30", body: cache.body };
  }
  try {
    const fetchImpl = options?.fetchImpl ?? fetch;
    const ids = dataSourceIds(env);
    const [ideas, canvases, assumptions, experiments, learnings] = await Promise.all([
      queryAllPages(ids.ideas, token, fetchImpl),
      queryAllPages(ids.canvas, token, fetchImpl),
      queryAllPages(ids.assumptions, token, fetchImpl),
      queryAllPages(ids.experiments, token, fetchImpl),
      queryAllPages(ids.learnings, token, fetchImpl),
    ]);
    const body: BoardPayload = {
      source: "notion",
      syncedAt: new Date(now).toISOString(),
      ...normalizeNotion({ ideas, canvases, assumptions, experiments, learnings }),
    };
    cache = { key: token, at: now, body };
    return { status: 200, cacheControl: "private, max-age=30", body };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notion request failed";
    return {
      status: 502,
      cacheControl: "no-store",
      body: { source: "notion", error: message, syncedAt: new Date(now).toISOString() },
    };
  }
}
