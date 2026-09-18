export type JourneyInput = {
  childName: string;
  childAge: number;
  completedCount: number;
  scheduled: Array<{ title: string; minutes: number; done: boolean }>;
  observations: Array<{ activityTitle: string; note: string; rating: number; date: string }>;
  activityCatalog: string[];
};

/** Local progress summary — no external AI or server. */
export function summarizeJourney(data: JourneyInput): { summary: string } {
  const upcoming = data.scheduled.filter((item) => !item.done);
  const doneThisWeek = data.scheduled.filter((item) => item.done);
  const avgRating =
    data.observations.length > 0
      ? data.observations.reduce((sum, o) => sum + o.rating, 0) / data.observations.length
      : 0;
  const favourite = [...data.observations].sort((a, b) => b.rating - a.rating)[0];
  const seen = new Set(data.observations.map((o) => o.activityTitle.toLowerCase()));
  const suggestions = data.activityCatalog
    .filter((entry) => {
      const title = entry.split(" (")[0]?.toLowerCase() ?? entry.toLowerCase();
      return !seen.has(title);
    })
    .slice(0, 3);

  const paragraph = [
    `${data.childName} (${data.childAge}) has ${data.completedCount} completed activities logged.`,
    favourite
      ? `${favourite.activityTitle} is standing out (rated ${favourite.rating}/5).`
      : "No parent observations yet — logging a session will sharpen this picture.",
    upcoming.length
      ? `${upcoming.length} items are still upcoming this week${
          doneThisWeek.length ? `; ${doneThisWeek.length} already done` : ""
        }.`
      : "Nothing is scheduled yet — add a routine from Activities or Schedule.",
    avgRating ? `Average observation rating is ${avgRating.toFixed(1)}/5.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const suggestionLines =
    suggestions.length > 0
      ? suggestions.map((s) => `- ${s} — a fresh skill mix not recently logged.`)
      : ["- Color Matching Hunt (Motor Skills) — always a hit when energy is high."];

  return { summary: [paragraph, ...suggestionLines].join("\n") };
}
