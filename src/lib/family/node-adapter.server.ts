import type { IncomingMessage, ServerResponse } from "node:http";

import { handleFamilyApi } from "./http.server";

function readStream(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function headersFromNode(req: IncomingMessage | { headers: IncomingMessage["headers"] }): Headers {
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
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    } else {
      const buf = await readStream(req);
      if (buf.length) init.body = new Uint8Array(buf);
    }
  }
  return new Request(url, init);
}

export async function sendWebResponse(res: ServerResponse, webRes: Response) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

export async function handleNodeFamilyRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  const webReq = await nodeToWebRequest(req);
  const webRes = await handleFamilyApi(webReq);
  await sendWebResponse(res, webRes);
}

function isNodeResponse(res: unknown): res is ServerResponse {
  return Boolean(res && typeof (res as ServerResponse).end === "function");
}

/**
 * Vercel preview/production invokes `/api` files as Web handlers (`Request` in,
 * `Response` out). The Node `(req, res)` helper is still used by `vite` middleware.
 */
export async function runFamilyFunction(
  req: (IncomingMessage & { body?: unknown }) | Request,
  res?: ServerResponse,
): Promise<Response | void> {
  if (isNodeResponse(res)) {
    const webReq = req instanceof Request ? req : await nodeToWebRequest(req);
    await sendWebResponse(res, await handleFamilyApi(webReq));
    return;
  }
  if (req instanceof Request) return handleFamilyApi(req);
  return handleFamilyApi(await nodeToWebRequest(req));
}
