/** Tiny health probe with no Clerk SDK import, so preview can report config even if the catch-all fails. */

export function GET() {
  const configured = Boolean(process.env["CLERK_SECRET_KEY"]);
  return Response.json({
    ok: true,
    configured,
    store: configured ? "clerk" : "none",
  });
}

export default GET;
