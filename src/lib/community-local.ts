import { useCallback, useEffect, useState } from "react";

const REPORTED_KEY = "synlumae-community-reported";
const STORY_KEY = "synlumae-community-my-story";
const SEEN_KEY = "synlumae-community-stories-seen";

export type MyStory = {
  text: string;
  createdAt: string;
};

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function readIds(key: string): string[] {
  const value = readJson(key);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function readStory(): MyStory | null {
  const value = readJson(STORY_KEY);
  if (!value || typeof value !== "object") return null;
  const text = (value as { text?: unknown }).text;
  const createdAt = (value as { createdAt?: unknown }).createdAt;
  if (typeof text !== "string" || !text.trim() || typeof createdAt !== "string") return null;
  return { text, createdAt };
}

/** Report and your story stay on this device. Preview only. */
export function useCommunityPrefs() {
  const [reported, setReported] = useState<string[]>([]);
  const [myStory, setMyStory] = useState<MyStory | null>(null);
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    setReported(readIds(REPORTED_KEY));
    setMyStory(readStory());
    setSeen(readIds(SEEN_KEY));
  }, []);

  const reportPost = useCallback((postId: string) => {
    setReported((prev) => {
      if (prev.includes(postId)) return prev;
      const next = [...prev, postId];
      writeJson(REPORTED_KEY, next);
      return next;
    });
  }, []);

  const saveStory = useCallback((text: string) => {
    const next = { text: text.trim(), createdAt: new Date().toISOString() };
    if (!next.text) return;
    writeJson(STORY_KEY, next);
    setMyStory(next);
  }, []);

  const markSeen = useCallback((storyId: string) => {
    setSeen((prev) => {
      if (prev.includes(storyId)) return prev;
      const next = [...prev, storyId];
      writeJson(SEEN_KEY, next);
      return next;
    });
  }, []);

  return { reported, myStory, seen, reportPost, saveStory, markSeen };
}
