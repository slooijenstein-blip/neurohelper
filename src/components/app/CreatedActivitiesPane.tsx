import { useAuth, useUser } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { SKILLS, type Skill } from "@/lib/activities-data";
import { skillMessageKey } from "@/lib/activity-locale";
import { isClerkConfigured } from "@/lib/clerk";
import {
  CreatorApiError,
  createCreatorActivity,
  deleteCreatorActivity,
  fetchCreatorReviewQueue,
  fetchOwnCreatorActivities,
  refreshPublishedCreatorActivities,
  reviewCreatorActivity,
  updateCreatorActivity,
} from "@/lib/creator/client";
import type {
  CreatorActivityInput,
  CreatorStatus,
  OwnedCreatorActivity,
} from "@/lib/creator/types";
import { canUseFounderRole, founderEmailsFromClerk } from "@/lib/founder-role";
import type { ShareAuth } from "@/lib/share/client";
import { useDevShareUser } from "@/lib/share/dev-session";

const fieldLabelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Draft = {
  id: string | null;
  title: string;
  description: string;
  minAge: string;
  maxAge: string;
  skill: Skill;
  minutes: string;
  materials: string;
  steps: string;
  language: "" | "en" | "es";
};

function emptyDraft(): Draft {
  return {
    id: null,
    title: "",
    description: "",
    minAge: "1",
    maxAge: "3",
    skill: "Sensory Play",
    minutes: "10",
    materials: "",
    steps: "",
    language: "",
  };
}

function draftFrom(activity: OwnedCreatorActivity): Draft {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    minAge: String(activity.minAge),
    maxAge: String(activity.maxAge),
    skill: activity.skill,
    minutes: String(activity.minutes),
    materials: activity.materials.join("\n"),
    steps: activity.steps.join("\n"),
    language: activity.language,
  };
}

function lines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function inputFrom(draft: Draft): CreatorActivityInput {
  return {
    title: draft.title,
    description: draft.description,
    minAge: Number(draft.minAge),
    maxAge: Number(draft.maxAge),
    skill: draft.skill,
    minutes: Number(draft.minutes),
    materials: lines(draft.materials),
    steps: lines(draft.steps),
    language: draft.language,
  };
}

function errorText(t: (key: string) => string, err: unknown): string {
  const code = err instanceof CreatorApiError ? err.code : "";
  if (code === "not_owner") return t("creator.notOwner");
  if (code === "forbidden") return t("creator.forbidden");
  if (code === "not_creator") return t("creator.needCreator");
  if (code === "no_contact") return t("creator.noContact");
  if (code === "not_configured") return t("creator.unavailable");
  return t("creator.invalid");
}

function statusKey(status: CreatorStatus): string {
  if (status === "published") return "creator.statusPublished";
  if (status === "rejected") return "creator.statusRejected";
  return "creator.statusPending";
}

export function CreatedActivitiesPane() {
  if (!isClerkConfigured()) return <LocalCreated />;
  return <ClerkCreated />;
}

function LocalCreated() {
  const devUser = useDevShareUser();
  if (!devUser) return <SignedOut />;
  const email = devUser.split("|")[1] ?? "";
  return (
    <CreatedPanel
      founder={canUseFounderRole([email])}
      authFor={async () => ({ token: null, devUser })}
    />
  );
}

function ClerkCreated() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const devUser = useDevShareUser();
  if (!isLoaded) return null;
  if (isSignedIn && user) {
    return (
      <CreatedPanel
        founder={canUseFounderRole(founderEmailsFromClerk(user))}
        authFor={async () => ({ token: await getToken(), devUser: null })}
      />
    );
  }
  if (import.meta.env.DEV && devUser) return <LocalCreated />;
  return <SignedOut />;
}

function SignedOut() {
  const { t } = useI18n();
  return <p className="px-5 py-6 text-sm text-muted-foreground">{t("creator.signIn")}</p>;
}

function CreatedPanel({
  founder,
  authFor,
}: {
  founder: boolean;
  authFor: () => Promise<ShareAuth>;
}) {
  const { t } = useI18n();
  const authRef = useRef(authFor);
  authRef.current = authFor;
  const [own, setOwn] = useState<OwnedCreatorActivity[] | null>(null);
  const [queue, setQueue] = useState<OwnedCreatorActivity[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reload = async () => {
    const auth = await authRef.current();
    const [mine, review] = await Promise.all([
      fetchOwnCreatorActivities(auth),
      founder ? fetchCreatorReviewQueue(auth) : Promise.resolve(null),
    ]);
    setOwn(mine);
    setQueue(review);
    setUnavailable(false);
  };

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const auth = await authRef.current();
        const [mine, review] = await Promise.all([
          fetchOwnCreatorActivities(auth),
          founder ? fetchCreatorReviewQueue(auth) : Promise.resolve(null),
        ]);
        if (cancel) return;
        setOwn(mine);
        setQueue(review);
      } catch (err) {
        if (cancel) return;
        if (err instanceof CreatorApiError && err.code === "not_configured") setUnavailable(true);
        else setOwn([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [founder]);

  const save = async () => {
    setSaving(true);
    try {
      const auth = await authRef.current();
      const input = inputFrom(draft);
      if (draft.id) await updateCreatorActivity(auth, draft.id, input);
      else await createCreatorActivity(auth, input);
      setDraft(emptyDraft());
      setFormOpen(false);
      await reload();
      toast.success(t("creator.saved"));
    } catch (err) {
      toast.error(errorText(t, err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("creator.confirmDelete"))) return;
    try {
      await deleteCreatorActivity(await authRef.current(), id);
      if (draft.id === id) setDraft(emptyDraft());
      await reload();
      await refreshPublishedCreatorActivities(true);
      toast.success(t("creator.deleted"));
    } catch (err) {
      toast.error(errorText(t, err));
    }
  };

  const review = async (id: string, decision: "approve" | "reject") => {
    try {
      await reviewCreatorActivity(await authRef.current(), id, decision, notes[id] ?? "");
      await reload();
      await refreshPublishedCreatorActivities(true);
      toast.success(decision === "approve" ? t("creator.approved") : t("creator.rejectedToast"));
    } catch (err) {
      toast.error(errorText(t, err));
    }
  };

  return (
    <div className="hide-scrollbar h-full overflow-y-auto bg-surface px-5 py-4 md:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("creator.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("creator.intro")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("creator.privacy")}</p>
        </div>

        {unavailable ? (
          <p className="text-sm text-muted-foreground">{t("creator.unavailable")}</p>
        ) : null}

        {formOpen ? (
          <form
            className="soft-card space-y-3 p-4"
            data-testid="creator-form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <h3 className="text-sm font-semibold">
              {draft.id ? t("creator.edit") : t("creator.new")}
            </h3>
            {draft.id ? (
              <p className="text-xs text-muted-foreground">{t("creator.editHint")}</p>
            ) : null}
            <label className={fieldLabelClass} htmlFor="creator-name">
              {t("creator.name")}
            </label>
            <Input
              id="creator-name"
              data-testid="creator-name"
              value={draft.title}
              maxLength={80}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
            <label className={fieldLabelClass} htmlFor="creator-about">
              {t("creator.about")}
            </label>
            <Textarea
              id="creator-about"
              data-testid="creator-about"
              value={draft.description}
              maxLength={800}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabelClass} htmlFor="creator-age-min">
                  {t("creator.ageMin")}
                </label>
                <Input
                  id="creator-age-min"
                  data-testid="creator-age-min"
                  type="number"
                  min={0}
                  max={6}
                  value={draft.minAge}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, minAge: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="creator-age-max">
                  {t("creator.ageMax")}
                </label>
                <Input
                  id="creator-age-max"
                  data-testid="creator-age-max"
                  type="number"
                  min={0}
                  max={6}
                  value={draft.maxAge}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, maxAge: event.target.value }))
                  }
                />
              </div>
            </div>
            <label className={fieldLabelClass} htmlFor="creator-skill">
              {t("creator.type")}
            </label>
            <select
              id="creator-skill"
              data-testid="creator-skill"
              className={selectClass}
              value={draft.skill}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, skill: event.target.value as Skill }))
              }
            >
              {SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {t(skillMessageKey(skill))}
                </option>
              ))}
            </select>
            <label className={fieldLabelClass} htmlFor="creator-minutes">
              {t("creator.length")}
            </label>
            <Input
              id="creator-minutes"
              data-testid="creator-minutes"
              type="number"
              min={1}
              max={180}
              value={draft.minutes}
              onChange={(event) => setDraft((prev) => ({ ...prev, minutes: event.target.value }))}
            />
            <label className={fieldLabelClass} htmlFor="creator-materials">
              {t("creator.materials")}
            </label>
            <Textarea
              id="creator-materials"
              data-testid="creator-materials"
              value={draft.materials}
              placeholder={t("creator.materialsHint")}
              onChange={(event) => setDraft((prev) => ({ ...prev, materials: event.target.value }))}
            />
            <label className={fieldLabelClass} htmlFor="creator-steps">
              {t("creator.steps")}
            </label>
            <Textarea
              id="creator-steps"
              data-testid="creator-steps"
              value={draft.steps}
              placeholder={t("creator.stepsHint")}
              onChange={(event) => setDraft((prev) => ({ ...prev, steps: event.target.value }))}
            />
            <label className={fieldLabelClass} htmlFor="creator-language">
              {t("creator.language")}
            </label>
            <select
              id="creator-language"
              data-testid="creator-language"
              className={selectClass}
              value={draft.language}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  language: event.target.value as Draft["language"],
                }))
              }
            >
              <option value="">{t("creator.languageAsWritten")}</option>
              <option value="en">{t("creator.languageEn")}</option>
              <option value="es">{t("creator.languageEs")}</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} data-testid="creator-submit">
                {saving ? t("creator.saving") : t("creator.save")}
              </Button>
              {draft.id ? (
                <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft())}>
                  {t("common.cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <Button type="button" data-testid="creator-new" onClick={() => setFormOpen(true)}>
            {t("creator.new")}
          </Button>
        )}

        <section data-testid="creator-own-list">
          <h3 className="text-sm font-semibold">{t("creator.yours")}</h3>
          {own && own.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("creator.empty")}</p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {(own ?? []).map((activity) => (
              <li
                key={activity.id}
                className="soft-card space-y-2 p-3"
                data-testid={`creator-own-${activity.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{activity.title}</p>
                  <span
                    className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                    data-testid={`creator-status-${activity.id}`}
                  >
                    {t(statusKey(activity.status))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
                {activity.reviewNote ? (
                  <p className="text-xs text-foreground">{activity.reviewNote}</p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`creator-edit-${activity.id}`}
                    onClick={() => {
                      setDraft(draftFrom(activity));
                      setFormOpen(true);
                    }}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`creator-delete-${activity.id}`}
                    onClick={() => void remove(activity.id)}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {founder ? (
          <section className="space-y-2 border-t border-border pt-3" data-testid="creator-review">
            <h3 className="text-sm font-semibold">{t("creator.reviewTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("creator.reviewHelp")}</p>
            {queue && queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("creator.reviewEmpty")}</p>
            ) : null}
            {(queue ?? []).map((activity) => (
              <article
                key={activity.id}
                className="soft-card space-y-2 p-3"
                data-testid={`creator-review-${activity.id}`}
              >
                <p className="text-sm font-semibold">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.ownerName || t("activities.createdByPro")} ·{" "}
                  {t(statusKey(activity.status))}
                </p>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
                <ol className="list-inside list-decimal text-xs text-muted-foreground">
                  {activity.steps.map((step, index) => (
                    <li key={`${activity.id}-${index}`}>{step}</li>
                  ))}
                </ol>
                <Input
                  value={notes[activity.id] ?? ""}
                  data-testid={`creator-note-${activity.id}`}
                  placeholder={t("creator.note")}
                  aria-label={t("creator.note")}
                  onChange={(event) =>
                    setNotes((prev) => ({ ...prev, [activity.id]: event.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    data-testid={`creator-approve-${activity.id}`}
                    onClick={() => void review(activity.id, "approve")}
                  >
                    {t("creator.approve")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid={`creator-reject-${activity.id}`}
                    onClick={() => void review(activity.id, "reject")}
                  >
                    {t("creator.reject")}
                  </Button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
