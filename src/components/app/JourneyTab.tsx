import { useState } from "react";
import { CalendarDays, CircleCheck, Heart, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAppStore, uid } from "@/lib/app-store";
import { ACTIVITIES } from "@/lib/activities-data";
import { summarizeJourney } from "@/lib/journey.functions";
import { ScreenHeader, Stars } from "./ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function JourneyTab() {
  const { state, update } = useAppStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(4);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const scheduled = state.schedule.filter((i) => !i.done).length;
  const mostLoved = [...state.observations].sort((a, b) => b.rating - a.rating)[0];

  const generateSummary = async () => {
    setLoading(true);
    try {
      const res = summarizeJourney({
        childName: state.childName,
        childAge: state.childAge,
        completedCount: state.completedCount,
        scheduled: state.schedule.map((s) => ({
          title: s.title,
          minutes: s.minutes,
          done: s.done,
        })),
        observations: state.observations.map((o) => ({
          activityTitle: o.activityTitle,
          note: o.note,
          rating: o.rating,
          date: o.date,
        })),
        activityCatalog: ACTIVITIES.map((a) => `${a.title} (${a.skill})`),
      });
      setSummary(res.summary || "No summary returned. Try again.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate summary");
    } finally {
      setLoading(false);
    }
  };


  const save = () => {
    if (!title.trim()) return;
    update((prev) => ({
      ...prev,
      observations: [
        {
          id: uid(),
          activityTitle: title,
          note,
          rating,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev.observations,
      ],
    }));
    setOpen(false);
    setTitle("");
    setNote("");
    toast.success("Progress saved!");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title="My Journey" subtitle={`${state.childName}'s progress`} />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4 md:px-8">
        <div className="grid grid-cols-2 gap-3 md:max-w-xl">
          <div className="soft-card p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Completed
            </p>
            <p className="text-3xl font-bold text-primary">{state.completedCount}</p>
          </div>
          <div className="soft-card p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Scheduled
            </p>
            <p className="text-3xl font-bold text-success">{scheduled}</p>
          </div>
        </div>

        <div className="soft-card space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Progress summary
            </p>
            <Button
              size="sm"
              className="h-7 rounded-full px-3"
              onClick={generateSummary}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {loading ? "Thinking" : summary ? "Refresh" : "Generate"}
            </Button>
          </div>
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {summary ||
              `A local summary of ${state.childName}'s completed activities, observations, and suggested next steps. (Not an AI model.)`}
          </p>
        </div>



        {mostLoved ? (
          <div className="rounded-xl border border-warm/50 bg-warm/20 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-warm-foreground">
              <Heart className="size-3.5" /> Most loved activity
            </p>
            <p className="text-base font-semibold">{mostLoved.activityTitle}</p>
            <Stars value={mostLoved.rating} />
          </div>
        ) : null}

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="size-4 text-primary" /> This week's schedule
          </p>
          <div className="space-y-2">
            {state.schedule.map((i) => (
              <div key={i.id} className="soft-card flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold">{i.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.time} · {i.minutes}m
                  </p>
                </div>
                <span
                  className={
                    i.done
                      ? "tag-base bg-success/15 text-success"
                      : "tag-base bg-accent text-accent-foreground"
                  }
                >
                  {i.done ? "Done" : "Upcoming"}
                </span>
              </div>
            ))}
            {!state.schedule.length ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled this week yet.</p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <CircleCheck className="size-4 text-primary" /> Parent observations
            </p>
            <Button size="sm" className="h-7 rounded-full px-3" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> Log
            </Button>
          </div>
          <div className="space-y-3 border-l-2 border-border pl-4">
            {state.observations.map((o) => (
              <div key={o.id} className="relative soft-card p-3">
                <span className="absolute -left-[21px] top-4 size-2 rounded-full bg-primary" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {o.date}
                  </p>
                  <Stars value={o.rating} />
                </div>
                <p className="mt-1 text-sm font-semibold">{o.activityTitle}</p>
                {o.note ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{o.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log an observation</DialogTitle>
            <DialogDescription>Capture how the activity went today.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity name"
            />
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you notice?"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rating</span>
              <Stars value={rating} onChange={setRating} />
            </div>
            <Button className="w-full" onClick={save}>
              Save progress
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
