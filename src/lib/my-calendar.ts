import type { DayPlan, ScheduleItem, Template } from "./app-store";

export type RoutineDraft = {
  templateId: string;
  name: string;
  items: Array<{
    activityId: string;
    title: string;
    description: string;
    minutes: number;
    time?: string;
  }>;
};

type CalendarSlice = {
  schedule: ScheduleItem[];
  templates: Template[];
  dayPlans: DayPlan[];
  profile: { id: string } | null;
};

export function sharedTemplateId(sourceId: string) {
  return sourceId.startsWith("shared-") ? sourceId : `shared-${sourceId}`;
}

export function isOnMyCalendar(
  dayPlans: Array<Pick<DayPlan, "date" | "templateId"> & { viewerKey?: string }>,
  templateId: string,
  date: string,
  viewerKey: string,
) {
  return dayPlans.some(
    (plan) => plan.date === date && plan.templateId === templateId && plan.viewerKey === viewerKey,
  );
}

function clockFrom(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function itemsWithTimes(routine: RoutineDraft, newId: () => string): ScheduleItem[] {
  let cursor = 15 * 60;
  return routine.items.map((item) => {
    const time = item.time || clockFrom(cursor);
    cursor += Math.max(item.minutes, 5);
    return {
      id: newId(),
      activityId: item.activityId,
      title: item.title,
      description: item.description,
      time,
      minutes: item.minutes,
      done: false,
      fromTemplateId: routine.templateId,
    };
  });
}

export function addRoutineToMyCalendar<T extends CalendarSlice>(
  state: T,
  routine: RoutineDraft,
  date: string,
  today: string,
  viewerKey: string,
  newId: () => string,
): T {
  if (isOnMyCalendar(state.dayPlans, routine.templateId, date, viewerKey)) return state;

  let templates = state.templates;
  if (!templates.some((template) => template.id === routine.templateId)) {
    const created: Template = {
      id: routine.templateId,
      ownerId: state.profile?.id ?? viewerKey,
      name: routine.name,
      isPublic: false,
      items: itemsWithTimes(routine, newId),
      createdAt: date,
    };
    templates = [created, ...templates];
  }

  const template = templates.find((item) => item.id === routine.templateId);
  const sourceItems = template?.items.length ? template.items : itemsWithTimes(routine, newId);
  const dayPlans: DayPlan[] = [
    ...state.dayPlans,
    {
      id: newId(),
      date,
      templateId: routine.templateId,
      name: routine.name || template?.name || routine.templateId,
      viewerKey,
    },
  ];

  let schedule = state.schedule;
  if (date === today) {
    const present = new Set(
      schedule
        .filter(
          (item) => item.fromTemplateId === routine.templateId && item.viewerKey === viewerKey,
        )
        .map((item) => `${item.activityId}:${item.title}`),
    );
    const additions = sourceItems
      .filter((item) => !present.has(`${item.activityId}:${item.title}`))
      .map((item) => ({
        ...item,
        id: newId(),
        done: false,
        fromTemplateId: routine.templateId,
        viewerKey,
      }));
    schedule = [...schedule, ...additions];
  }

  return { ...state, templates, dayPlans, schedule };
}

export function removeRoutineFromMyCalendar<T extends CalendarSlice>(
  state: T,
  templateId: string,
  date: string,
  today: string,
  viewerKey: string,
): T {
  return {
    ...state,
    dayPlans: state.dayPlans.filter(
      (plan) =>
        !(plan.templateId === templateId && plan.date === date && plan.viewerKey === viewerKey),
    ),
    schedule:
      date === today
        ? state.schedule.filter(
            (item) => !(item.fromTemplateId === templateId && item.viewerKey === viewerKey),
          )
        : state.schedule,
  };
}
