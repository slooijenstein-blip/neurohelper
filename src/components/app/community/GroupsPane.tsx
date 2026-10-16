import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { prepareCommunityFile } from "@/lib/community-social/prepare-media";
import type { ClientPost, GroupVisibility } from "@/lib/community-social/types";
import { LivePostCard } from "./LivePostCard";
import { MediaShareButtons } from "./MediaShareButtons";
import { communityErrorText, useCommunitySocial } from "./social-context";

function roleLabel(t: (key: string) => string, role: string) {
  if (role === "admin") return t("community.social.roleAdmin");
  if (role === "moderator") return t("community.social.roleModerator");
  return t("community.social.roleMember");
}

export function GroupsPane({
  onReport,
  onReportComment,
}: {
  onReport: (postId: string) => void;
  onReportComment: (postId: string, commentId: string) => void;
}) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [coverId, setCoverId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const detail = social.group;
  const openGroupId = detail?.group.id ?? null;

  useEffect(() => {
    if (!detail) return;
    setName(detail.group.name);
    setDescription(detail.group.description);
    setRules(detail.group.rules);
    setVisibility(detail.group.visibility);
    // Fill the edit form when a different group opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGroupId]);

  if (!social.configured) {
    return (
      <div className="px-4 py-8">
        <h2 className="text-base font-semibold">{t("community.social.setupTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("community.social.setupBody")}</p>
      </div>
    );
  }

  if (detail) {
    const group = detail.group;
    const canAdmin = group.myRole === "admin" || social.moderator;
    const canReview = group.myRole === "admin" || group.myRole === "moderator" || social.moderator;
    const save = async () => {
      try {
        await social.saveGroup(group.id, {
          name,
          description,
          rules,
          visibility,
          ...(coverId ? { uploadId: coverId } : {}),
        });
        toast.success(t("community.social.savedChanges"));
        setCoverId(undefined);
      } catch (err) {
        toast.error(communityErrorText(t, err));
      }
    };
    return (
      <div
        className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-4"
        data-testid="group-page"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => void social.openGroup(null)}
        >
          {t("community.social.back")}
        </Button>
        {group.coverUrl ? (
          <img src={group.coverUrl} alt="" className="h-36 w-full rounded-xl object-cover" />
        ) : null}
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {group.visibility === "private"
              ? t("community.social.private")
              : t("community.social.public")}
            {" · "}
            {group.memberCount}
          </p>
        </div>
        {group.description ? (
          <p className="text-sm">
            <span className="font-semibold">{t("community.social.about")}. </span>
            {group.description}
          </p>
        ) : null}
        {group.rules ? (
          <p className="text-sm">
            <span className="font-semibold">{t("community.social.rulesLabel")}. </span>
            {group.rules}
          </p>
        ) : null}
        {!group.myRole && !group.requested ? (
          <Button
            data-testid="group-join"
            onClick={() =>
              void social
                .join(group.id)
                .then((result) =>
                  toast.success(
                    result === "requested"
                      ? t("community.social.requestedToast")
                      : t("community.social.joined"),
                  ),
                )
                .catch((err) => toast.error(communityErrorText(t, err)))
            }
          >
            {group.visibility === "private"
              ? t("community.social.requestJoin")
              : t("community.social.join")}
          </Button>
        ) : null}
        {group.requested ? (
          <p className="text-sm text-muted-foreground">{t("community.social.requested")}</p>
        ) : null}
        {group.myRole ? (
          <Button
            type="button"
            variant="outline"
            data-testid="group-leave"
            onClick={() =>
              void social
                .leave(group.id)
                .then(() => {
                  toast.success(t("community.social.left"));
                  void social.openGroup(null);
                })
                .catch((err) => toast.error(communityErrorText(t, err)))
            }
          >
            {t("community.social.leave")}
          </Button>
        ) : null}
        {canAdmin ? (
          <div className="soft-card space-y-2 p-3" data-testid="group-admin">
            <h3 className="text-sm font-semibold">{t("community.social.saveGroup")}</h3>
            <Input
              aria-label={t("community.social.groupName")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Textarea
              aria-label={t("community.social.groupDescription")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
            <Textarea
              aria-label={t("community.social.groupRules")}
              value={rules}
              onChange={(event) => setRules(event.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={visibility === "public" ? "default" : "outline"}
                onClick={() => setVisibility("public")}
              >
                {t("community.social.public")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={visibility === "private" ? "default" : "outline"}
                onClick={() => setVisibility("private")}
              >
                {t("community.social.private")}
              </Button>
            </div>
            <label className="block text-xs font-semibold">
              {t("community.social.cover")}
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void prepareCommunityFile(file)
                    .then((prepared) => social.uploadImage(prepared))
                    .then(setCoverId)
                    .catch((err) => toast.error(communityErrorText(t, err)));
                }}
              />
            </label>
            <Button type="button" size="sm" data-testid="group-save" onClick={() => void save()}>
              {t("community.social.saveGroup")}
            </Button>
          </div>
        ) : null}
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("community.social.members")}</h3>
          <ul className="space-y-2">
            {detail.members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {member.name} · {roleLabel(t, member.role)}
                  {member.status === "requested" ? ` · ${t("community.social.requested")}` : ""}
                </span>
                {member.status === "requested" && canReview ? (
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      data-testid={`approve-request-${member.userId}`}
                      onClick={() => void social.memberAction(group.id, member.userId, "approve")}
                    >
                      {t("community.social.approveRequest")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void social.memberAction(group.id, member.userId, "decline")}
                    >
                      {t("community.social.declineRequest")}
                    </Button>
                  </span>
                ) : null}
                {member.status === "active" && canAdmin ? (
                  <span className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void social.memberAction(group.id, member.userId, "setRole", "admin")
                      }
                    >
                      {t("community.social.promoteAdmin")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void social.memberAction(group.id, member.userId, "setRole", "moderator")
                      }
                    >
                      {t("community.social.promoteMod")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void social.memberAction(group.id, member.userId, "setRole", "member")
                      }
                    >
                      {t("community.social.makeMember")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void social.memberAction(group.id, member.userId, "remove")}
                    >
                      {t("community.social.removeMember")}
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        {group.myRole ? (
          <div className="soft-card p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              {t("community.social.privacyLine")}
            </p>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim() || social.suspended) return;
                void social
                  .publishText(draft.trim(), group.id)
                  .then(() => {
                    setDraft("");
                    toast.success(t("community.social.postedPending"));
                  })
                  .catch((err) => toast.error(communityErrorText(t, err)));
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("community.social.groupPost")}
                aria-label={t("community.social.groupPost")}
                disabled={social.suspended}
              />
              <Button type="submit" disabled={social.suspended}>
                {t("community.post")}
              </Button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              <MediaShareButtons groupId={group.id} />
            </div>
          </div>
        ) : null}
        <div className="space-y-3">
          {detail.posts.map((post: ClientPost) => (
            <LivePostCard
              key={post.id}
              post={post}
              moderator={social.moderator}
              onLike={(id) => void social.toggleLike(id)}
              onComment={(id, text) => void social.comment(id, text)}
              onReport={onReport}
              onReportComment={onReportComment}
              onRemove={(id) => {
                if (!reason.trim()) {
                  toast.message(t("community.social.reasonPlaceholder"));
                  return;
                }
                void social.review(id, "remove", reason);
              }}
              onSuspend={(userId) =>
                void social.suspend(userId, true, reason || t("community.social.suspend"))
              }
            />
          ))}
          {social.moderator ? (
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("community.social.reasonPlaceholder")}
              aria-label={t("community.social.reasonPlaceholder")}
            />
          ) : null}
          {!detail.posts.length ? (
            <p className="text-sm text-muted-foreground">{t("community.social.groupEmpty")}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-4"
      data-testid="groups-list"
    >
      <p className="text-sm text-muted-foreground">{t("community.social.groupsHelp")}</p>
      <Button data-testid="group-create-open" onClick={() => setCreating(true)}>
        {t("community.social.createGroup")}
      </Button>
      {social.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("community.social.noGroups")}</p>
      ) : null}
      <ul className="space-y-2">
        {social.groups.map((group) => (
          <li key={group.id}>
            <button
              type="button"
              data-testid={`open-group-${group.id}`}
              onClick={() => {
                setName(group.name);
                setDescription(group.description);
                setRules(group.rules);
                setVisibility(group.visibility);
                void social.openGroup(group.id);
              }}
              className="soft-card flex w-full items-center gap-3 p-3 text-left"
            >
              {group.coverUrl ? (
                <img src={group.coverUrl} alt="" className="size-14 rounded-lg object-cover" />
              ) : (
                <span className="grid size-14 place-content-center rounded-lg bg-accent text-xs font-semibold">
                  {group.name.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{group.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {group.visibility === "private"
                    ? t("community.social.private")
                    : t("community.social.public")}
                  {" · "}
                  {group.memberCount}
                  {group.myRole ? ` · ${roleLabel(t, group.myRole)}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.social.createGroup")}</DialogTitle>
            <DialogDescription>{t("community.social.groupsHelp")}</DialogDescription>
          </DialogHeader>
          <Input
            data-testid="group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("community.social.groupName")}
            aria-label={t("community.social.groupName")}
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("community.social.groupDescription")}
            aria-label={t("community.social.groupDescription")}
            rows={3}
          />
          <Textarea
            value={rules}
            onChange={(event) => setRules(event.target.value)}
            placeholder={t("community.social.groupRules")}
            aria-label={t("community.social.groupRules")}
            rows={3}
          />
          <div className="grid gap-2">
            <button
              type="button"
              aria-pressed={visibility === "public"}
              onClick={() => setVisibility("public")}
              className="rounded-xl border px-3 py-2 text-left text-sm"
            >
              <span className="font-semibold">{t("community.social.public")}. </span>
              {t("community.social.publicHelp")}
            </button>
            <button
              type="button"
              aria-pressed={visibility === "private"}
              data-testid="group-private"
              onClick={() => setVisibility("private")}
              className="rounded-xl border px-3 py-2 text-left text-sm"
            >
              <span className="font-semibold">{t("community.social.private")}. </span>
              {t("community.social.privateHelp")}
            </button>
          </div>
          <Button
            data-testid="group-create-submit"
            onClick={() =>
              void social
                .createGroup({ name, description, rules, visibility })
                .then((id) => {
                  toast.success(t("community.social.groupCreated"));
                  setCreating(false);
                  void social.openGroup(id);
                })
                .catch((err) => toast.error(communityErrorText(t, err)))
            }
          >
            {t("community.social.createGroup")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
