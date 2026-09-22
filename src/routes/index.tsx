import { createFileRoute } from "@tanstack/react-router";

import { CalendarApp } from "@/components/app/calendar/CalendarApp";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Synlumae Calendar — Shared schedules for caregivers" },
      {
        name: "description",
        content:
          "Today, Library, and People — shared day plans for parents, helpers, and therapists.",
      },
      { property: "og:title", content: "Synlumae Calendar — Shared schedules" },
      {
        property: "og:description",
        content:
          "Clickable prototype: therapist caseload, caregiver Today/Library/People, helper mark-done.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `${import.meta.env.BASE_URL}og-image.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${import.meta.env.BASE_URL}og-image.png` },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <main className="min-h-dvh bg-background">
        <CalendarApp />
      </main>
      <Toaster />
    </>
  );
}
