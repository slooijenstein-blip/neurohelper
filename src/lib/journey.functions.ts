import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const JourneyInput = z.object({
  childName: z.string(),
  childAge: z.number(),
  completedCount: z.number(),
  scheduled: z.array(z.object({ title: z.string(), minutes: z.number(), done: z.boolean() })),
  observations: z.array(
    z.object({ activityTitle: z.string(), note: z.string(), rating: z.number(), date: z.string() }),
  ),
  activityCatalog: z.array(z.string()),
});

export const summarizeJourney = createServerFn({ method: "POST" })
  .validator((input: unknown) => JourneyInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = [
      `Child: ${data.childName}, age ${data.childAge}.`,
      `Activities completed so far: ${data.completedCount}.`,
      `This week's schedule: ${
        data.scheduled.map((s) => `${s.title} (${s.minutes}m, ${s.done ? "done" : "upcoming"})`).join("; ") ||
        "nothing scheduled"
      }.`,
      `Parent observations: ${
        data.observations
          .map((o) => `${o.date} – ${o.activityTitle} rated ${o.rating}/5: ${o.note || "no note"}`)
          .join(" | ") || "none yet"
      }.`,
      `Available activities to suggest from: ${data.activityCatalog.join(", ")}.`,
      "",
      "Write a warm, concise progress summary for the parent (2-3 sentences), then suggest 3 next activities.",
      "Pick suggestions only from the available activities list and give one short reason each.",
      "Format as plain text: a paragraph, then three lines starting with '- '.",
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (!res.ok || !res.body) {
      const message = await res.text().catch(() => "");
      if (res.status === 429)
        throw new Error("NeuroHelper is busy right now — please try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits are exhausted. Add credits in Lovable to keep using this.");
      throw new Error(message || `AI request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
          if (evt.type === "response.completed" && !text && evt.response?.output_text)
            text = evt.response.output_text;
        } catch {
          /* ignore malformed chunk */
        }
      }
    }

    return { summary: text.trim() };
  });
