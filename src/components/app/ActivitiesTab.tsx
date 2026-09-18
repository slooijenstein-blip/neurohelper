import { useMemo, useState } from "react";
import { Clock, Filter, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  ACTIVITIES,
  activityHasSkill,
  SKILLS,
  type Activity,
  type Skill,
} from "@/lib/activities-data";
import { useAppStore, uid } from "@/lib/app-store";
import { AgeTag, ScreenHeader, SkillTags } from "./ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ActivitiesTab() {
  const { update } = useAppStore();
  const [range, setRange] = useState<number[]>([1, 10]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<Activity | null>(null);

  const results = useMemo(
    () =>
      ACTIVITIES.filter((a) => a.maxAge >= (range[0] ?? 1) && a.minAge <= (range[1] ?? 10))
        .filter((a) => (skills.length ? skills.some((s) => activityHasSkill(a, s)) : true))
        .filter((a) =>
          query.trim()
            ? (a.title + a.description).toLowerCase().includes(query.trim().toLowerCase())
            : true,
        ),
    [range, skills, query],
  );

  const toggleSkill = (s: Skill) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addToSchedule = (a: Activity) => {
    update((prev) => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        {
          id: uid(),
          activityId: a.id,
          title: a.title,
          description: a.description,
          time: "09:00",
          minutes: a.minMinutes,
          done: false,
        },
      ],
    }));
    toast.success(`${a.title} added to today's schedule`);
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Activity Library" subtitle={`${results.length} activities`} />

      <div className="space-y-3 border-b border-border bg-surface px-5 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities"
            className="h-9 rounded-full bg-card pl-9 text-sm"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <span>Age range</span>
            <span className="text-foreground">
              {range[0]} – {range[1]} years
            </span>
          </div>
          <Slider min={1} max={10} step={1} value={range} onValueChange={setRange} />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            {skills.length ? `${skills.length} selected` : "All skills"}
          </span>
          <span className="text-muted-foreground">{filtersOpen ? "▲" : "▼"}</span>
        </button>

        {filtersOpen ? (
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={cn(
                  "tag-base border border-border",
                  skills.includes(s)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {skills.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {skills.map((s) => (
              <span key={s} className="tag-base bg-accent text-accent-foreground gap-1">
                {s}
                <X className="size-3 cursor-pointer" onClick={() => toggleSkill(s)} />
              </span>
            ))}
            <button
              type="button"
              className="text-[11px] font-semibold text-primary underline"
              onClick={() => setSkills([])}
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto bg-surface px-5 py-4">
        {results.map((a) => (
          <div key={a.id} className="soft-card p-4">
            <div className="mb-2 flex items-start justify-between">
              <span className="tag-base bg-accent text-accent-foreground">{a.skill}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {a.minMinutes === a.maxMinutes
                  ? `${a.minMinutes} mins`
                  : `${a.minMinutes}-${a.maxMinutes} mins`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDetail(a)}
              className="block text-left text-base font-semibold hover:text-primary"
            >
              {a.title}
            </button>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                <AgeTag>
                  Age: {a.minAge}-{a.maxAge}
                </AgeTag>
                <SkillTags activity={a} />
              </div>
              <Button size="sm" className="h-7 rounded-full px-3" onClick={() => addToSchedule(a)}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
          </div>
        ))}
        {!results.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No activities match those filters.
          </p>
        ) : null}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            <DialogDescription>{detail?.description}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-1.5">
                <AgeTag>
                  Age: {detail.minAge}-{detail.maxAge}
                </AgeTag>
                <SkillTags activity={detail} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  What you need
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {detail.materials.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  How to play
                </p>
                <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                  {detail.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  addToSchedule(detail);
                  setDetail(null);
                }}
              >
                Add to schedule
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
