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
  await handleNodeFamilyRequest(req as never, res as never);
}
