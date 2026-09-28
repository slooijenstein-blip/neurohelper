import type { IncomingMessage, ServerResponse } from "node:http";

import { handleShareApi, shareDeps } from "./http.ts";

function readStream(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function headersFromNode(req: { headers: IncomingMessage["headers"] }): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

export async function nodeToWebRequest(
  req: IncomingMessage & { body?: unknown },
): Promise<Request> {
  const host = (req.headers.host as string | undefined) || "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "http";
  const url = `${proto}://${host}${req.url || "/"}`;
  const headers = headersFromNode(req);
  const method = req.method || "GET";
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    if (req.body !== undefined && req.body !== null && !Buffer.isBuffer(req.body)) {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } else {
      const buf = await readStream(req);
      if (buf.length) init.body = new Uint8Array(buf);
    }
  }
  return new Request(url, init);
}

async function sendWebResponse(res: ServerResponse, webRes: Response) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await webRes.arrayBuffer()));
}

function asWebRequest(req: unknown): Request | null {
  if (!req || typeof req !== "object") return null;
  const row = req as Request;
  if (typeof row.url !== "string" || !/^[a-z][a-z0-9+.-]*:\/\//i.test(row.url)) return null;
  if (typeof row.headers?.get !== "function") return null;
  try {
    return new Request(row.url, row);
  } catch {
    return new Request(row.url, { method: row.method || "GET", headers: row.headers });
  }
}

export async function handleShareNode(
  req: (IncomingMessage & { body?: unknown }) | Request,
  res?: ServerResponse,
): Promise<Response | void> {
  const webReq =
    asWebRequest(req) ?? (await nodeToWebRequest(req as IncomingMessage & { body?: unknown }));
  const webRes = await handleShareApi(webReq, shareDeps());
  if (res && typeof res.end === "function") {
    await sendWebResponse(res, webRes);
    return;
  }
  return webRes;
}
