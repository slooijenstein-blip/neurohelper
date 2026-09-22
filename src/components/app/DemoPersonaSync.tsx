import { useEffect } from "react";

import { useAppStore, type DemoPersona } from "@/lib/app-store";
import { DEMO_PERSON_IDS, useCalendarStore } from "@/lib/calendar/store";

const PERSON_FOR: Record<DemoPersona, string> = {
  pro: DEMO_PERSON_IDS.therapist,
  parent: DEMO_PERSON_IDS.caregiver,
};

/** Keeps the calendar persona aligned with Continue as Pro / Parent after load. */
export function DemoPersonaSync() {
  const { prototypeDemo, demoPersona, hydrated } = useAppStore();
  const cal = useCalendarStore();

  useEffect(() => {
    if (!hydrated || !cal.hydrated || !prototypeDemo || !demoPersona) return;
    const personId = PERSON_FOR[demoPersona];
    if (cal.activePerson.id === personId) return;
    cal.switchPersona(personId);
  }, [cal, demoPersona, hydrated, prototypeDemo]);

  return null;
}
