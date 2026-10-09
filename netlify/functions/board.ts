import type { Config } from "@netlify/functions";
import { getBoard } from "../../shared/load-board";

export default async (req: Request) => {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const result = await getBoard({ refresh });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": result.cacheControl,
    },
  });
};

export const config: Config = {
  path: "/api/board",
  method: "GET",
};
