import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen, SignedInRedirect } from "@/components/app/AuthScreen";

export const Route = createFileRoute("/sign-in/")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <SignedInRedirect>
      <AuthScreen mode="sign-in" />
    </SignedInRedirect>
  );
}
