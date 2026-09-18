import { toast } from "sonner";

import { ACTIVITIES, formatActivityDuration } from "@/lib/activities-data";
import { useAppStore, uid } from "@/lib/app-store";
import { AgeTag, DurationTag, SkillTag } from "./ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ActivityDetailDialog({
  activityId,
  onClose,
}: {
  activityId: string | null;
  onClose: () => void;
}) {
  const { update } = useAppStore();
  const detail = activityId ? ACTIVITIES.find((a) => a.id === activityId) ?? null : null;

  const addToSchedule = () => {
    if (!detail) return;
    update((prev) => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        {
          id: uid(),
          activityId: detail.id,
          title: detail.title,
          description: detail.description,
          time: "09:00",
          minutes: detail.minMinutes,
          done: false,
        },
      ],
    }));
    toast.success(`${detail.title} added to today's schedule`);
    onClose();
  };

  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && onClose()}>
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
              <SkillTag skill={detail.skill} />
              <DurationTag minMinutes={detail.minMinutes} maxMinutes={detail.maxMinutes} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Duration
              </p>
              <p className="text-muted-foreground">
                {formatActivityDuration(detail.minMinutes, detail.maxMinutes)}
              </p>
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
            <Button className="w-full" onClick={addToSchedule}>
              Add to schedule
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
