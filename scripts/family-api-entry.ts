import { handleNodeFamilyRequest } from "../src/lib/family/node-adapter";

function header(req: { headers: Record<string, string | string[] | undefined> }, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function originalUrl(req: { url?: string; headers: Record<string, string | string[] | undefined> }) {
  const url = req.url || "/";
  if (url.startsWith("/api/family/") && !url.includes("family-handler")) return url;
  for (const name of ["x-forwarded-uri", "x-invoke-path", "x-vercel-original-url"]) {
    const value = header(req, name);
    if (value && value.includes("/api/family")) return value;
  }
  return url;
}

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
  req.url = originalUrl(req);
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
