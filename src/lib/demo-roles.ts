/** Preview walkthrough personas. Production sign-in stays on Clerk. */
export type DemoPersona = "therapist" | "parent" | "grandparent";

export const DEMO_PERSONAS: DemoPersona[] = ["therapist", "parent", "grandparent"];

/**
 * The role switcher is for local preview and Vercel preview deploys.
 * synlumae.com and the production Vercel alias keep real Clerk auth.
 */
export function demoRolesAllowed(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  if (host.endsWith(".vercel.app") && host.includes("-git-")) return true;
  return false;
}

export function parseDemoPersona(value: string | null): DemoPersona | null {
  if (value === "therapist" || value === "pro") return "therapist";
  if (value === "parent") return "parent";
  if (value === "grandparent" || value === "helper") return "grandparent";
  return null;
}

export function demoPersonaGrantsPro(persona: DemoPersona): boolean {
  return persona === "therapist";
}
