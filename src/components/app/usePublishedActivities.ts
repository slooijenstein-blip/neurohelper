import { useEffect, useState } from "react";

import { ACTIVITIES } from "@/lib/activities-data";
import {
  publishedCreatorActivities,
  subscribePublishedCreatorActivities,
  type CatalogActivity,
} from "@/lib/creator/catalog";
import { refreshPublishedCreatorActivities } from "@/lib/creator/client";

export function useMergedActivities(): CatalogActivity[] {
  const [creator, setCreator] = useState(publishedCreatorActivities);

  useEffect(() => {
    setCreator(publishedCreatorActivities());
    const unsubscribe = subscribePublishedCreatorActivities(() =>
      setCreator(publishedCreatorActivities()),
    );
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshPublishedCreatorActivities();
  }, []);

  const extras = creator.filter((item) => !ACTIVITIES.some((activity) => activity.id === item.id));
  return [...ACTIVITIES, ...extras];
}
