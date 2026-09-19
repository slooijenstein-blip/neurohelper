import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen, SignedInRedirect } from "@/components/app/AuthScreen";

export const Route = createFileRoute("/sign-up/")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <SignedInRedirect>
      <AuthScreen mode="sign-up" />
    </SignedInRedirect>
  );
}
