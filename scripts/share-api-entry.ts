import { handleShareNode } from "../src/lib/share/node-adapter.ts";

function header(req: { headers: Record<string, string | string[] | undefined> }, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function originalUrl(req: { url?: string; headers: Record<string, string | string[] | undefined> }) {
  const url = req.url || "/";
  if (url.startsWith("/api/share") && !url.includes("share-handler")) return url;
  for (const name of ["x-forwarded-uri", "x-invoke-path", "x-vercel-original-url", "x-url"]) {
    const value = header(req, name);
    if (value && value.includes("/api/share")) return value;
  }
  return url;
}

export default async function handler(
  req: {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined> | Headers;
    body?: unknown;
  },
  res?: {
    statusCode: number;
    setHeader: (key: string, value: string) => void;
    end: (body?: Buffer | string) => void;
  },
) {
  const headers = req.headers instanceof Headers ? Object.fromEntries(req.headers.entries()) : req.headers;
  const nodeReq = { ...req, headers, url: originalUrl({ url: req.url, headers }) };
  try {
    const result = await handleShareNode(nodeReq as never, res as never);
    if (result) return result;
  } catch (err) {
    console.error("share api", err);
    const body = JSON.stringify({ error: "Something went wrong. Try again.", code: "server_error" });
    if (res && typeof res.end === "function") {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(body);
      return;
    }
    return new Response(body, { status: 500, headers: { "content-type": "application/json; charset=utf-8" } });
  }
}
