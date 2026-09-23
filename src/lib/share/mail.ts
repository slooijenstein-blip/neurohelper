import type { EmailResult } from "./actions.ts";

function clip(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 240);
}

function classify(err: unknown): EmailResult {
  const row = err as {
    status?: number;
    message?: string;
    errors?: Array<{ message?: string; longMessage?: string; code?: string }>;
  };
  const detail =
    row?.errors?.[0]?.longMessage ||
    row?.errors?.[0]?.message ||
    (err instanceof Error ? err.message : "") ||
    "Clerk could not send the email.";
  const message = clip(detail);
  const lower = message.toLowerCase();
  if (lower.includes("redirect") || lower.includes("not allowed")) {
    return { sent: false, code: "redirect_blocked", message };
  }
  if (
    lower.includes("exist") ||
    lower.includes("taken") ||
    lower.includes("already") ||
    row?.errors?.[0]?.code === "form_identifier_exists"
  ) {
    return { sent: false, code: "already_user", message };
  }
  return { sent: false, code: "clerk_error", message };
}

/** Sends Clerk's invitation email. Does not include child details in Clerk metadata. */
export async function sendClerkInvitation(input: {
  secretKey: string | undefined;
  email: string;
  redirectUrl: string;
  token: string;
}): Promise<EmailResult> {
  if (!input.secretKey) {
    return {
      sent: false,
      code: "not_configured",
      message: "CLERK_SECRET_KEY is not set on this preview.",
    };
  }
  try {
    const { createClerkClient } = await import("@clerk/backend");
    const clerk = createClerkClient({ secretKey: input.secretKey });
    await clerk.invitations.createInvitation({
      emailAddress: input.email,
      redirectUrl: input.redirectUrl,
      notify: true,
      ignoreExisting: true,
      expiresInDays: 30,
      publicMetadata: { synlumaeInvite: input.token },
    });
    return { sent: true, code: "sent", message: "Invitation email sent." };
  } catch (err) {
    console.error("clerk invitation", err);
    return classify(err);
  }
}
