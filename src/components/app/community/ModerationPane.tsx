import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { communityErrorText, useCommunitySocial } from "./social-context";

export function ModerationPane() {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");

  const act = async (id: string, action: "approve" | "reject" | "remove") => {
    const reason = (reasons[id] || "").trim();
    if (action !== "approve" && !reason) {
      toast.message(t("community.social.reasonPlaceholder"));
      return;
    }
    try {
      await social.review(id, action, reason);
      toast.success(
        action === "approve" ? t("community.social.approve") : t("community.social.reject"),
      );
    } catch (err) {
      toast.error(communityErrorText(t, err));
    }
  };

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-4"
      data-testid="moderation-queue"
    >
      <div>
        <h2 className="text-base font-semibold">{t("community.tabs.review")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("community.social.queueHelp")}</p>
        {social.founder ? (
          <p className="mt-1 text-xs text-muted-foreground">{t("community.social.youFounder")}</p>
        ) : null}
      </div>
      {social.queue.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="moderation-empty">
          {t("community.social.queueEmpty")}
        </p>
      ) : null}
      {social.queue.map((post) => (
        <article
          key={post.id}
          className="soft-card space-y-2 p-3"
          data-testid={`review-${post.id}`}
        >
          <p className="text-sm font-semibold">{post.authorName}</p>
          {post.body ? <p className="whitespace-pre-wrap text-sm">{post.body}</p> : null}
          {post.media?.kind === "image" ? (
            <img
              src={post.media.url}
              alt={post.body || t("community.social.photoAlt")}
              className="max-h-48 w-full rounded-lg object-cover"
            />
          ) : null}
          {post.media?.kind === "video" ? (
            <video
              src={post.media.url}
              controls
              playsInline
              className="max-h-48 w-full rounded-lg bg-black"
            />
          ) : null}
          {post.groupName ? (
            <p className="text-xs text-muted-foreground">{post.groupName}</p>
          ) : null}
          <Input
            value={reasons[post.id] ?? ""}
            onChange={(event) => setReasons((prev) => ({ ...prev, [post.id]: event.target.value }))}
            placeholder={t("community.social.reasonPlaceholder")}
            aria-label={t("community.social.reasonPlaceholder")}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              data-testid={`approve-${post.id}`}
              onClick={() => void act(post.id, "approve")}
            >
              {t("community.social.approve")}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid={`reject-${post.id}`}
              onClick={() => void act(post.id, "reject")}
            >
              {t("community.social.reject")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void act(post.id, "remove")}>
              {t("community.social.remove")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void social
                  .suspend(
                    post.authorId,
                    true,
                    (reasons[post.id] || t("community.social.suspend")).trim(),
                  )
                  .then(() => toast.success(t("community.social.suspend")))
                  .catch((err) => toast.error(communityErrorText(t, err)))
              }
            >
              {t("community.social.suspend")}
            </Button>
          </div>
        </article>
      ))}
      <section>
        <h3 className="text-sm font-semibold">{t("community.social.reportsTitle")}</h3>
        {social.reports.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t("community.social.noReports")}</p>
        ) : null}
        <ul className="mt-2 space-y-2">
          {social.reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-border px-3 py-2 text-sm">
              <p className="font-semibold">{report.reporterName}</p>
              <p>{report.excerpt}</p>
              <p className="text-xs text-muted-foreground">
                {t(`community.reasons.${report.reason}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {social.founder ? (
        <section data-testid="moderator-admin">
          <h3 className="text-sm font-semibold">{t("community.social.moderatorsTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("community.social.moderatorHelp")}
          </p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!email.trim()) return;
              void social
                .addModerator(email.trim())
                .then(() => {
                  setEmail("");
                  toast.success(t("community.social.moderatorAdded"));
                })
                .catch((err) => toast.error(communityErrorText(t, err)));
            }}
          >
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("community.social.moderatorEmail")}
              aria-label={t("community.social.moderatorEmail")}
              data-testid="moderator-email"
            />
            <Button type="submit" data-testid="moderator-add">
              {t("community.social.addModerator")}
            </Button>
          </form>
          <ul className="mt-2 space-y-1 text-sm">
            {social.moderators.map((item) => (
              <li key={item} className="flex items-center justify-between gap-2">
                <span>{item}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void social.removeModerator(item)}
                >
                  {t("community.social.removeModerator")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
