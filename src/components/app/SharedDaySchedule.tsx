import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";

import { ACTIVITIES } from "@/lib/activities-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { familyCopy } from "@/lib/family/copy";
import { createAfternoonPlanBlocks } from "@/lib/family/afternoon-plan";
import { useFamilyStore } from "@/lib/family/family-context";
import { FamilyError, emptyPlan, type DayPlan, type TimeBlock } from "@/lib/family/types";
import { canDeletePlan, canEditPlan, familyRoleLabel } from "@/lib/family/permissions";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function prettyDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function SharedDaySchedule({ onInvite }: { onInvite?: () => void }) {
  const family = useFamilyStore();
  const child = family.children.find((item) => item.id === family.selectedChildId) ?? null;
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState("15:00");
  const [minutes, setMinutes] = useState("15");
  const [activityId, setActivityId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!family.client || !child) {
      setPlan(null);
      return;
    }
    let cancelled = false;
    family.client
      .getPlan(child.id, family.selectedDate)
      .then((next) => {
        if (!cancelled) setPlan(next);
      })
      .catch((err) => {
        if (!cancelled)
          toast.error(err instanceof FamilyError ? err.message : "Could not load the plan.");
      });
    return () => {
      cancelled = true;
    };
  }, [child, family.client, family.selectedDate]);

  const filtered = useMemo(
    () =>
      ACTIVITIES.filter((activity) =>
        query.trim() ? activity.title.toLowerCase().includes(query.trim().toLowerCase()) : true,
      ).slice(0, 12),
    [query],
  );

  if (!family.ready) {
    return <p className="text-sm text-muted-foreground">Loading schedule…</p>;
  }

  if (!child) {
    return (
      <div className="soft-card py-8 text-center">
        <p className="text-sm text-muted-foreground">{familyCopy.pickChild}</p>
        <Button className="mt-3" onClick={onInvite}>
          {familyCopy.addChildCta}
        </Button>
      </div>
    );
  }

  const role = child.myRole;
  const livePlan = plan ?? emptyPlan(family.selectedDate, family.actor?.userId || "me");

  const persist = async (blocks: TimeBlock[]) => {
    if (!family.client) return;
    const next = await family.client.savePlan(child.id, family.selectedDate, blocks);
    setPlan(next);
  };

  const addAfternoon = async () => {
    try {
      await persist([...(livePlan.blocks ?? []), ...createAfternoonPlanBlocks()]);
      toast.success("Afternoon plan added. Edit any block to fit the child.");
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not add the plan.");
    }
  };

  const addBlock = async () => {
    const mins = Number(minutes);
    const block: TimeBlock = {
      id: "",
      start,
      minutes: mins,
      title,
      notes,
      done: false,
    };
    if (activityId) block.activityId = activityId;
    try {
      await persist([...livePlan.blocks, block]);
      setAdding(false);
      setTitle("");
      setNotes("");
      setActivityId("");
      toast.success("Added to the day.");
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not add that block.");
    }
  };

  const toggleDone = async (block: TimeBlock) => {
    if (!family.client) return;
    try {
      const next = await family.client.setBlockDone(
        child.id,
        family.selectedDate,
        block.id,
        !block.done,
      );
      setPlan(next);
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not update.");
    }
  };

  const removeBlock = async (blockId: string) => {
    try {
      await persist(livePlan.blocks.filter((block) => block.id !== blockId));
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not remove that block.");
    }
  };

  const removePlan = async () => {
    if (!family.client) return;
    if (!window.confirm("Delete this day’s plan for everyone who can see it?")) return;
    try {
      await family.client.deletePlan(child.id, family.selectedDate);
      setPlan(emptyPlan(family.selectedDate, family.actor?.userId || "me"));
      toast.success("Plan deleted.");
    } catch (err) {
      toast.error(err instanceof FamilyError ? err.message : "Could not delete the plan.");
    }
  };

  return (
    <div className="space-y-3">
      {family.mode === "local" ? (
        <p className="rounded-xl bg-warm/40 px-3 py-2 text-[11px] font-semibold leading-snug text-warm-foreground">
          {familyCopy.localModeBanner}
        </p>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {family.children.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => family.setSelectedChildId(item.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
              item.id === child.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card",
            )}
          >
            {item.displayName}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => family.setSelectedDate(shiftDate(family.selectedDate, -1))}
        >
          Previous
        </Button>
        <p className="text-sm font-semibold">{prettyDate(family.selectedDate)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => family.setSelectedDate(shiftDate(family.selectedDate, 1))}
        >
          Next
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {child.displayName} · {familyRoleLabel(role)}
        {canInviteButton(role) && onInvite ? " · " : ""}
        {canInviteButton(role) && onInvite ? (
          <button type="button" className="font-semibold text-primary" onClick={onInvite}>
            Invite
          </button>
        ) : null}
      </p>

      {livePlan.blocks.length === 0 ? (
        <div className="soft-card py-8 text-center">
          <p className="text-sm text-muted-foreground">{familyCopy.noPlan}</p>
          {canEditPlan(role) ? (
            <div className="mt-3 flex flex-col gap-2">
              <Button onClick={() => void addAfternoon()}>{familyCopy.startAfternoon}</Button>
              <Button variant="outline" onClick={() => setAdding(true)}>
                <Plus className="mr-1 size-4" /> {familyCopy.addBlock}
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">{familyCopy.caregiverReadOnly}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {livePlan.blocks.map((block) => (
            <div key={block.id} className="soft-card flex items-center gap-3 p-3">
              <button
                type="button"
                onClick={() => void toggleDone(block)}
                className="shrink-0"
                aria-label={block.done ? "Mark not done" : "Mark done"}
              >
                {block.done ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-semibold",
                    block.done && "text-muted-foreground line-through",
                  )}
                >
                  {block.start} · {block.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {block.notes || familyCopy.checkOffHint} · {formatDuration(block.minutes)}
                  {block.activityId
                    ? ` · ${ACTIVITIES.find((a) => a.id === block.activityId)?.title ?? "Activity"}`
                    : ""}
                </p>
              </div>
              {canEditPlan(role) ? (
                <button
                  type="button"
                  onClick={() => void removeBlock(block.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
          {canEditPlan(role) ? (
            <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="mr-1 size-4" /> {familyCopy.addBlock}
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">{familyCopy.caregiverReadOnly}</p>
          )}
          {canDeletePlan(role) && livePlan.blocks.length ? (
            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={() => void removePlan()}
            >
              {familyCopy.deletePlan}
            </Button>
          ) : null}
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{familyCopy.addBlock}</DialogTitle>
          </DialogHeader>
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {familyCopy.blockTime}
          </label>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {familyCopy.blockMinutes}
          </label>
          <Input
            type="number"
            min={1}
            max={180}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {familyCopy.blockTitle}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Snack, outdoor play…"
          />
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {familyCopy.blockNotes}
          </label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={familyCopy.blockActivity}
          />
          <div className="hide-scrollbar max-h-32 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setActivityId("")}
              className={cn(
                "w-full rounded-lg border p-2 text-left text-xs",
                !activityId && "border-primary",
              )}
            >
              {familyCopy.noActivity}
            </button>
            {filtered.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => {
                  setActivityId(activity.id);
                  if (!title) setTitle(activity.title);
                }}
                className={cn(
                  "w-full rounded-lg border p-2 text-left text-xs",
                  activityId === activity.id && "border-primary",
                )}
              >
                {activity.title}
              </button>
            ))}
          </div>
          <Button onClick={() => void addBlock()} disabled={!title.trim()}>
            {familyCopy.saveBlock}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function canInviteButton(role: "parent" | "therapist" | "caregiver") {
  return role === "parent";
}
