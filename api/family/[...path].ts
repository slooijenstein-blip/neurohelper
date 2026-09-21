import { handleNodeFamilyRequest } from "../../src/lib/family/node-adapter.server";

export default async function handler(
  req: {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
  },
  res: {
    statusCode: number;
    setHeader: (key: string, value: string) => void;
    end: (body?: Buffer | string) => void;
  },
) {
  try {
    await handleNodeFamilyRequest(req as never, res as never);
  } catch (err) {
    console.error("family api", err);
    const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: message, code: "server_error" }));
  }
}
