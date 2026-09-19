import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up")({
  component: () => <Outlet />,
});
