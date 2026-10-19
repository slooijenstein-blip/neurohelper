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
import type { ClientPerson, ClientPost, GroupVisibility } from "@/lib/community-social/types";
import { AuthedMedia } from "./AuthedMedia";
import { LivePostCard } from "./LivePostCard";
import { MediaShareButtons } from "./MediaShareButtons";
import { PersonPicker } from "./PersonPicker";
import { communityErrorText, useCommunitySocial } from "./social-context";

function roleLabel(t: (key: string) => string, role: string) {
  if (role === "owner") return t("community.social.roleOwner");
  if (role === "admin") return t("community.social.roleAdmin");
  if (role === "moderator") return t("community.social.roleModerator");
  return t("community.social.roleMember");
}

function visibilityLabel(t: (key: string) => string, visibility: string) {
  if (visibility === "hidden") return t("community.social.hidden");
  if (visibility === "private") return t("community.social.private");
  return t("community.social.public");
}

export function GroupsPane({
  onReport,
  onReportComment,
  onOpenProfile,
}: {
  onReport: (postId: string) => void;
  onReportComment: (postId: string, commentId: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [coverId, setCoverId] = useState<string | undefined>();
  const [joinQuestion, setJoinQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState("");
  const [tags, setTags] = useState<ClientPerson[]>([]);
  const [shares, setShares] = useState<ClientPerson[]>([]);
  const [reason, setReason] = useState("");
  const [groupReasons, setGroupReasons] = useState<Record<string, string>>({});
  const detail = social.group;
  const openGroupId = detail?.group.id ?? null;

  useEffect(() => {
    if (!detail) return;
    setName(detail.group.name);
    setDescription(detail.group.description);
    setRules(detail.group.rules);
    setVisibility(detail.group.visibility);
    setJoinQuestion(detail.group.joinQuestion);
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
    const canAdmin = group.myRole === "owner" || group.myRole === "admin";
    const canReview =
      group.myRole === "owner" || group.myRole === "admin" || group.myRole === "moderator";
    const isOwner = group.myRole === "owner";
    const save = async () => {
      try {
        await social.saveGroup(group.id, {
          name,
          description,
          rules,
          visibility,
          joinQuestion,
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
          <AuthedMedia
            url={group.coverUrl}
            kind="image"
            alt=""
            className="h-36 w-full rounded-xl object-cover"
          />
        ) : null}
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {visibilityLabel(t, group.visibility)}
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
        {canReview ? (
          <section className="soft-card space-y-3 p-3" data-testid="group-review-queue">
            <div>
              <h3 className="text-sm font-semibold">{t("community.social.groupQueueTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("community.social.groupQueueHelp")}
              </p>
            </div>
            {social.groupQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="group-review-empty">
                {t("community.social.groupQueueEmpty")}
              </p>
            ) : null}
            {social.groupQueue.map((post) => (
              <article key={post.id} className="space-y-2" data-testid={`group-review-${post.id}`}>
                <p className="text-sm font-semibold">{post.authorName}</p>
                {post.body ? <p className="whitespace-pre-wrap text-sm">{post.body}</p> : null}
                {post.media ? (
                  <AuthedMedia
                    url={post.media.url}
                    kind={post.media.kind}
                    alt={post.body || t("community.social.photoAlt")}
                    controls={post.media.kind === "video"}
                    playsInline
                    className="max-h-48 w-full rounded-lg bg-black object-cover"
                  />
                ) : null}
                <Input
                  value={groupReasons[post.id] ?? ""}
                  onChange={(event) =>
                    setGroupReasons((prev) => ({ ...prev, [post.id]: event.target.value }))
                  }
                  placeholder={t("community.social.reasonPlaceholder")}
                  aria-label={t("community.social.reasonPlaceholder")}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    data-testid={`group-approve-${post.id}`}
                    onClick={() =>
                      void social
                        .review(post.id, "approve")
                        .then(() => toast.success(t("community.social.approve")))
                        .catch((err) => toast.error(communityErrorText(t, err)))
                    }
                  >
                    {t("community.social.approve")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid={`group-reject-${post.id}`}
                    onClick={() => {
                      const note = (groupReasons[post.id] ?? "").trim();
                      if (!note) {
                        toast.message(t("community.social.reasonPlaceholder"));
                        return;
                      }
                      void social
                        .review(post.id, "reject", note)
                        .then(() => toast.success(t("community.social.reject")))
                        .catch((err) => toast.error(communityErrorText(t, err)));
                    }}
                  >
                    {t("community.social.reject")}
                  </Button>
                </div>
              </article>
            ))}
            <div>
              <h4 className="text-sm font-semibold">{t("community.social.reportsTitle")}</h4>
              {social.groupReports.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("community.social.noReports")}
                </p>
              ) : null}
              <ul className="mt-2 space-y-2">
                {social.groupReports.map((report) => (
                  <li key={report.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                    <p className="font-semibold">{report.reporterName}</p>
                    <p>{report.excerpt}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`community.reasons.${report.reason}`)}
                    </p>
                    {report.commentId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() =>
                          void social
                            .removeComment(report.postId, report.commentId || "")
                            .then(() => toast.success(t("community.social.removeComment")))
                            .catch((err) => toast.error(communityErrorText(t, err)))
                        }
                      >
                        {t("community.social.removeComment")}
                      </Button>
                    ) : social.groupQueue.some((post) => post.id === report.postId) ? null : (
                      <div className="mt-2 space-y-2">
                        <Input
                          value={groupReasons[report.id] ?? ""}
                          onChange={(event) =>
                            setGroupReasons((prev) => ({
                              ...prev,
                              [report.id]: event.target.value,
                            }))
                          }
                          placeholder={t("community.social.reasonPlaceholder")}
                          aria-label={t("community.social.reasonPlaceholder")}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const note = (groupReasons[report.id] ?? "").trim();
                            if (!note) {
                              toast.message(t("community.social.reasonPlaceholder"));
                              return;
                            }
                            void social
                              .review(report.postId, "remove", note)
                              .then(() => toast.success(t("community.social.remove")))
                              .catch((err) => toast.error(communityErrorText(t, err)));
                          }}
                        >
                          {t("community.social.remove")}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
        {group.banned ? (
          <p className="text-sm text-muted-foreground">{t("community.social.bannedNotice")}</p>
        ) : null}
        {!group.myRole && !group.requested && !group.banned ? (
          <div className="space-y-2">
            {group.joinQuestion ? (
              <Textarea
                data-testid="group-join-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={group.joinQuestion}
                aria-label={group.joinQuestion}
                rows={2}
              />
            ) : null}
            <Button
              data-testid="group-join"
              onClick={() =>
                void social
                  .join(group.id, answer.trim())
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
              {group.visibility === "public"
                ? t("community.social.join")
                : t("community.social.requestJoin")}
            </Button>
          </div>
        ) : null}
        {group.requested ? (
          <p className="text-sm text-muted-foreground">{t("community.social.requested")}</p>
        ) : null}
        {group.myRole && group.myRole !== "owner" ? (
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
            <div className="flex flex-wrap gap-2">
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
              <Button
                type="button"
                size="sm"
                variant={visibility === "hidden" ? "default" : "outline"}
                onClick={() => setVisibility("hidden")}
              >
                {t("community.social.hidden")}
              </Button>
            </div>
            <Textarea
              aria-label={t("community.social.joinQuestion")}
              value={joinQuestion}
              onChange={(event) => setJoinQuestion(event.target.value)}
              placeholder={t("community.social.joinQuestion")}
              rows={2}
            />
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
            {isOwner ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="group-delete"
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    void social
                      .removeGroup(group.id)
                      .then(() => toast.success(t("community.social.deleted")))
                      .catch((err) => toast.error(communityErrorText(t, err)));
                  }}
                >
                  {confirmDelete
                    ? t("community.social.deleteConfirm")
                    : t("community.social.deleteGroup")}
                </Button>
              </div>
            ) : null}
            {(isOwner || group.visibility !== "public") && group.myRole ? (
              <p className="text-xs text-muted-foreground" data-testid="group-invite">
                {t("community.social.inviteCode")}: {group.id}
              </p>
            ) : null}
          </div>
        ) : null}
        {isOwner ? (
          <p className="text-xs text-muted-foreground">{t("community.social.ownerLeave")}</p>
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
                  {member.status === "banned" ? ` · ${t("community.social.banned")}` : ""}
                  {member.answer ? ` — ${member.answer}` : ""}
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
                {member.status === "banned" && canAdmin ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void social.memberAction(group.id, member.userId, "unban")}
                  >
                    {t("community.social.unbanMember")}
                  </Button>
                ) : null}
                {member.status === "active" &&
                member.role !== "owner" &&
                member.userId !== social.userId ? (
                  <span className="flex flex-wrap gap-1">
                    {isOwner ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`transfer-${member.userId}`}
                        onClick={() =>
                          void social
                            .transferGroup(group.id, member.userId)
                            .then(() => toast.success(t("community.social.transferred")))
                            .catch((err) => toast.error(communityErrorText(t, err)))
                        }
                      >
                        {t("community.social.transferOwner")}
                      </Button>
                    ) : null}
                    {isOwner ? (
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
                    ) : null}
                    {isOwner || (canAdmin && member.role === "member") ? (
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
                    ) : null}
                    {(isOwner && member.role !== "member") ||
                    (group.myRole === "admin" && member.role === "moderator") ? (
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
                    ) : null}
                    {canAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`ban-${member.userId}`}
                        onClick={() => void social.memberAction(group.id, member.userId, "ban")}
                      >
                        {t("community.social.banMember")}
                      </Button>
                    ) : null}
                    {isOwner ||
                    (group.myRole === "admin" && member.role !== "admin") ||
                    (group.myRole === "moderator" && member.role === "member") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void social.memberAction(group.id, member.userId, "remove")}
                      >
                        {t("community.social.removeMember")}
                      </Button>
                    ) : null}
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
                  .publishText(draft.trim(), group.id, {
                    ...(tags.length ? { tagUserIds: tags.map((person) => person.userId) } : {}),
                    ...(shares.length ? { shareUserIds: shares.map((person) => person.userId) } : {}),
                  })
                  .then(() => {
                    setDraft("");
                    setTags([]);
                    setShares([]);
                    toast.success(t("community.social.postedPendingGroup"));
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
            <div className="mt-2 space-y-2">
              <PersonPicker
                groupId={group.id}
                tags={tags}
                shares={shares}
                onTags={setTags}
                onShares={setShares}
              />
              <div className="flex flex-wrap gap-1">
                <MediaShareButtons
                  groupId={group.id}
                  tagUserIds={tags.map((person) => person.userId)}
                  shareUserIds={shares.map((person) => person.userId)}
                />
              </div>
            </div>
          </div>
        ) : null}
        <div className="space-y-3">
          {detail.posts.map((post: ClientPost) => (
            <LivePostCard
              key={post.id}
              post={post}
              moderator={social.moderator}
              {...(onOpenProfile ? { onOpenProfile } : {})}
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
      {social.actorName ? (
        <p className="text-sm font-semibold" data-testid="community-actor-name">
          {t("community.social.actorLine", { name: social.actorName })}
        </p>
      ) : null}
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
                <AuthedMedia
                  url={group.coverUrl}
                  kind="image"
                  alt=""
                  className="size-14 rounded-lg object-cover"
                />
              ) : (
                <span className="grid size-14 place-content-center rounded-lg bg-accent text-xs font-semibold">
                  {group.name.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{group.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {visibilityLabel(t, group.visibility)}
                  {" · "}
                  {group.memberCount}
                  {group.myRole ? ` · ${roleLabel(t, group.myRole)}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const code = inviteCode.trim();
          if (!code) return;
          void social.openGroup(code).catch((err) => toast.error(communityErrorText(t, err)));
        }}
      >
        <Input
          data-testid="group-invite-code"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
          placeholder={t("community.social.inviteCode")}
          aria-label={t("community.social.inviteCode")}
        />
        <Button type="submit" variant="outline" data-testid="group-invite-open">
          {t("community.social.openInvite")}
        </Button>
      </form>
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
            <button
              type="button"
              aria-pressed={visibility === "hidden"}
              data-testid="group-hidden"
              onClick={() => setVisibility("hidden")}
              className="rounded-xl border px-3 py-2 text-left text-sm"
            >
              <span className="font-semibold">{t("community.social.hidden")}. </span>
              {t("community.social.hiddenHelp")}
            </button>
          </div>
          <Textarea
            data-testid="group-question"
            value={joinQuestion}
            onChange={(event) => setJoinQuestion(event.target.value)}
            placeholder={t("community.social.joinQuestion")}
            aria-label={t("community.social.joinQuestion")}
            rows={2}
          />
          <Button
            data-testid="group-create-submit"
            onClick={() =>
              void social
                .createGroup({ name, description, rules, visibility, joinQuestion })
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
