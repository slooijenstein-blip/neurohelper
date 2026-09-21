import { runFamilyFunction } from "../../src/lib/family/node-adapter.server";

export const config = { runtime: "nodejs" };

async function handle(
  req: Request | { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; body?: unknown },
  res?: { statusCode: number; setHeader: (key: string, value: string) => void; end: (body?: Buffer | string) => void },
) {
  return runFamilyFunction(req as never, res as never);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export default handle;
