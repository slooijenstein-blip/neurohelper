import { useEffect, useRef } from "react";

import { useAppStore, type DemoPersona } from "@/lib/app-store";
import { DEMO_PERSON_IDS, useCalendarStore } from "@/lib/calendar/store";

const PERSON_FOR: Record<DemoPersona, string> = {
  therapist: DEMO_PERSON_IDS.therapist,
  parent: DEMO_PERSON_IDS.caregiver,
  grandparent: DEMO_PERSON_IDS.helper,
};

/** Keeps the calendar family aligned with the preview role switcher. */
export function DemoPersonaSync() {
  const { prototypeDemo, demoPersona, hydrated } = useAppStore();
  const cal = useCalendarStore();
  const applied = useRef<DemoPersona | null>(null);

  useEffect(() => {
    if (!hydrated || !cal.hydrated || !prototypeDemo || !demoPersona) {
      applied.current = null;
      return;
    }
    if (cal.shareMode === "live") return;
    if (applied.current === demoPersona && cal.activePerson.id === PERSON_FOR[demoPersona]) return;
    applied.current = demoPersona;
    cal.loadDemoPersona(PERSON_FOR[demoPersona]);
  }, [cal, demoPersona, hydrated, prototypeDemo]);

  return null;
}
