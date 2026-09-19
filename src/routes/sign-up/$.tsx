import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen, SignedInRedirect } from "@/components/app/AuthScreen";

export const Route = createFileRoute("/sign-up/$")({
  component: SignUpSplatPage,
});

function SignUpSplatPage() {
  return (
    <SignedInRedirect>
      <AuthScreen mode="sign-up" />
    </SignedInRedirect>
  );
}
