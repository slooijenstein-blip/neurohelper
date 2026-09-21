import { createFileRoute } from "@tanstack/react-router";

import { InviteAcceptScreen } from "@/components/app/InviteAcceptScreen";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  return <InviteAcceptScreen token={token} />;
}
