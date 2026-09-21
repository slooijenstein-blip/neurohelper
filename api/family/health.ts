/** Tiny health probe with no Clerk SDK import. Node (req, res) helper only. */

export default function handler(
  _req: unknown,
  res: { statusCode: number; setHeader: (key: string, value: string) => void; end: (body?: string) => void },
) {
  const configured = Boolean(process.env["CLERK_SECRET_KEY"]);
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true, configured, store: configured ? "clerk" : "none" }));
}
