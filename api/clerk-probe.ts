import { createClerkClient } from "@clerk/backend";

export default function handler(
  _req: unknown,
  res: { statusCode: number; setHeader: (key: string, value: string) => void; end: (body?: string) => void },
) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true, clerk: typeof createClerkClient }));
}
