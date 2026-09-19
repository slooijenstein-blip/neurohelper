import { shadcn } from "@clerk/ui/themes";

import { withBasePath } from "./paths";

export function getClerkPublishableKey(): string | undefined {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function isClerkConfigured(): boolean {
  return Boolean(getClerkPublishableKey());
}

export function clerkAppUrls() {
  return {
    afterSignOutUrl: withBasePath("/sign-in"),
    signInUrl: withBasePath("/sign-in"),
    signUpUrl: withBasePath("/sign-up"),
    afterAuthUrl: withBasePath("/"),
  };
}

export const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorPrimary: "#c23a4a",
    borderRadius: "0.875rem",
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "Nunito, ui-sans-serif, system-ui, sans-serif",
  },
};
