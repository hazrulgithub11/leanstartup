/** Data source IDs from the Lean Startup Lab handoff. Not secret. */
export const DEFAULT_DATA_SOURCES = {
  ideas: "cb7a1003-54b9-41fa-9450-247a7a8ee734",
  canvas: "afb98d87-94f4-47a0-9df7-6b1b81f99f1e",
  assumptions: "4b355e57-9065-490a-a281-9badbe6a7f3d",
  experiments: "9717f191-bab1-421e-bd2c-7d907c20a4bd",
  learnings: "5c151b6d-48a2-4a6f-8c8d-7d7fc0945e41",
} as const;

export const NOTION_VERSION = "2025-09-03";

export const STATUS_ORDER = ["Brainstorm", "Canvas", "Testing", "Persevere", "Pivot", "Parked"] as const;

export type EnvReader = (name: string) => string | undefined;

export function netlifyEnv(name: string): string | undefined {
  const host = globalThis as {
    Netlify?: { env?: { get?: (key: string) => string | undefined } };
  };
  const fromNetlify = host.Netlify?.env?.get?.(name);
  if (fromNetlify) return fromNetlify;
  return process.env[name];
}

export function dataSourceIds(env: EnvReader = netlifyEnv) {
  return {
    ideas: env("NOTION_DS_IDEAS") || DEFAULT_DATA_SOURCES.ideas,
    canvas: env("NOTION_DS_CANVAS") || DEFAULT_DATA_SOURCES.canvas,
    assumptions: env("NOTION_DS_ASSUMPTIONS") || DEFAULT_DATA_SOURCES.assumptions,
    experiments: env("NOTION_DS_EXPERIMENTS") || DEFAULT_DATA_SOURCES.experiments,
    learnings: env("NOTION_DS_LEARNINGS") || DEFAULT_DATA_SOURCES.learnings,
  };
}
