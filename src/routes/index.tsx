import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PhoneApp, type TabKey } from "@/components/app/PhoneApp";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Synlumae — Activities & routines for neurodiverse kids" },
      {
        name: "description",
        content:
          "Discover activities, build daily schedules, track progress, and share routines with parents, teachers, therapists, and creators.",
      },
      { property: "og:title", content: "Synlumae — Activities & routines for neurodiverse kids" },
      {
        property: "og:description",
        content:
          "Discover activities, build daily schedules, track progress, and share routines with parents, teachers, therapists, and creators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<TabKey>("activities");

  return (
    <>
      <main className="min-h-dvh bg-background">
        <PhoneApp tab={tab} onTab={setTab} />
      </main>
      <Toaster />
    </>
  );
}
