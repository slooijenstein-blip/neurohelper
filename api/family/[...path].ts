import { runFamilyFunction } from "../../src/lib/family/node-adapter.server";

function jsonError() {
  return Response.json(
    { error: "Something went wrong. Try again.", code: "server_error" },
    { status: 500 },
  );
}

async function handle(req: unknown, res?: unknown) {
  try {
    const result = await runFamilyFunction(req as never, res as never);
    if (result) return result;
  } catch (err) {
    console.error("family api", err);
    if (res && typeof (res as { end?: unknown }).end === "function") {
      const nodeRes = res as {
        statusCode: number;
        setHeader: (key: string, value: string) => void;
        end: (body?: string) => void;
      };
      nodeRes.statusCode = 500;
      nodeRes.setHeader("content-type", "application/json; charset=utf-8");
      nodeRes.end(JSON.stringify({ error: "Something went wrong. Try again.", code: "server_error" }));
      return;
    }
    return jsonError();
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export default handle;
