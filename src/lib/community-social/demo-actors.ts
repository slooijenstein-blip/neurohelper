import type { Actor } from "../share/actions.ts";

const DEMOS: Record<string, Actor> = {
  therapist: {
    userId: "demo_therapist",
    email: "demo.therapist@preview.synlumae.invalid",
    name: "Demo Therapist",
    isPro: true,
  },
  parent: {
    userId: "demo_parent",
    email: "demo.parent@preview.synlumae.invalid",
    name: "Demo Parent",
    isPro: false,
  },
  grandparent: {
    userId: "demo_grandparent",
    email: "demo.grandparent@preview.synlumae.invalid",
    name: "Demo Grandparent",
    isPro: false,
  },
};

/** Preview and local only. Production ignores the header and keeps Clerk. */
export function demoCommunityActor(req: Request, env: NodeJS.ProcessEnv): Actor | null {
  if (env.VERCEL_ENV === "production") return null;
  const persona = req.headers.get("x-synlumae-demo-persona");
  if (!persona) return null;
  return DEMOS[persona] ?? null;
}
