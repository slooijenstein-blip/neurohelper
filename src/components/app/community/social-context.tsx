import { useAuth } from "@clerk/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useI18n } from "@/i18n/I18nProvider";
import {
  commentCommunityPost,
  communityMemberAction,
  CommunityClientError,
  createCommunityGroup,
  createCommunityPost,
  deleteCommunityGroup,
  fetchCommunityFeed,
  fetchCommunityGroup,
  fetchCommunityGroups,
  fetchCommunityHealth,
  fetchCommunitySession,
  fetchGroupQueue,
  fetchCommunityShorts,
  fetchModerationQueue,
  joinCommunityGroup,
  leaveCommunityGroup,
  likeCommunityPost,
  removeCommunityComment,
  reportCommunity,
  reviewCommunityPost,
  suspendCommunityUser,
  transferCommunityGroup,
  updateCommunityGroup,
  uploadPreparedMedia,
  type CommunitySession,
} from "@/lib/community-social/api-client";
import type { PreparedMedia } from "@/lib/community-social/prepare-media";
import type {
  ClientGroup,
  ClientMember,
  ClientPost,
  ClientReport,
  GroupVisibility,
} from "@/lib/community-social/types";
import { isClerkConfigured } from "@/lib/clerk";
import { demoRolesAllowed } from "@/lib/demo-roles";
import { useAppStore } from "@/lib/app-store";
import { useDevShareUser } from "@/lib/share/dev-session";
import type { CommunityAuth } from "@/lib/community-social/api-client";

type GroupDetail = { group: ClientGroup; members: ClientMember[]; posts: ClientPost[] } | null;

export type CommunitySocialValue = {
  ready: boolean;
  configured: boolean;
  media: "blob" | "local" | "none";
  signedIn: boolean;
  moderator: boolean;
  founder: boolean;
  suspended: boolean;
  actorName: string | null;
  userId: string | null;
  posts: ClientPost[];
  shorts: ClientPost[];
  groups: ClientGroup[];
  group: GroupDetail;
  queue: ClientPost[];
  reports: ClientReport[];
  groupQueue: ClientPost[];
  groupReports: ClientReport[];
  moderators: string[];
  refresh: () => Promise<void>;
  openGroup: (id: string | null) => Promise<void>;
  publishText: (body: string, groupId?: string | null) => Promise<void>;
  publishMedia: (input: {
    prepared: PreparedMedia;
    caption: string;
    groupId?: string | null;
  }) => Promise<void>;
  uploadImage: (prepared: PreparedMedia) => Promise<string>;
  toggleLike: (id: string) => Promise<void>;
  comment: (id: string, text: string) => Promise<void>;
  report: (input: { postId: string; commentId?: string; reason: string }) => Promise<void>;
  review: (id: string, action: "approve" | "reject" | "remove", reason?: string) => Promise<void>;
  removeComment: (postId: string, commentId: string) => Promise<void>;
  suspend: (userId: string, active: boolean, reason: string) => Promise<void>;
  createGroup: (input: {
    name: string;
    description: string;
    rules: string;
    visibility: GroupVisibility;
    joinQuestion?: string;
    uploadId?: string;
  }) => Promise<string>;
  saveGroup: (
    id: string,
    input: {
      name: string;
      description: string;
      rules: string;
      visibility: GroupVisibility;
      joinQuestion?: string;
      uploadId?: string;
    },
  ) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  transferGroup: (id: string, userId: string) => Promise<void>;
  join: (id: string, answer?: string) => Promise<"joined" | "requested">;
  leave: (id: string) => Promise<void>;
  memberAction: (groupId: string, userId: string, action: string, role?: string) => Promise<void>;
};

const CommunitySocialContext = createContext<CommunitySocialValue | null>(null);

export function useCommunitySocial(): CommunitySocialValue {
  const value = useContext(CommunitySocialContext);
  if (!value) throw new Error("Community social is missing.");
  return value;
}

function SocialProvider({
  getToken,
  children,
}: {
  getToken: () => Promise<string | null>;
  children: ReactNode;
}) {
  const devUser = useDevShareUser();
  const { state, prototypeDemo, demoPersona } = useAppStore();
  const role = state.profile?.role ?? "Parent";
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [media, setMedia] = useState<"blob" | "local" | "none">("none");
  const [session, setSession] = useState<CommunitySession | null>(null);
  const [posts, setPosts] = useState<ClientPost[]>([]);
  const [shorts, setShorts] = useState<ClientPost[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupDetail>(null);
  const [queue, setQueue] = useState<ClientPost[]>([]);
  const [reports, setReports] = useState<ClientReport[]>([]);
  const [groupQueue, setGroupQueue] = useState<ClientPost[]>([]);
  const [groupReports, setGroupReports] = useState<ClientReport[]>([]);
  const [moderators, setModerators] = useState<string[]>([]);
  const refreshGen = useRef(0);

  const demoHeader =
    prototypeDemo &&
    demoPersona &&
    typeof window !== "undefined" &&
    demoRolesAllowed(window.location.hostname)
      ? demoPersona
      : null;

  const authFor = useCallback(async (): Promise<CommunityAuth> => {
    if (demoHeader) return { token: null, devUser: null, demoPersona: demoHeader };
    return { token: await getToken(), devUser, demoPersona: null };
  }, [demoHeader, devUser, getToken]);

  const loadGroup = useCallback(async (id: string | null, auth: CommunityAuth) => {
    if (!id) {
      setGroup(null);
      setGroupQueue([]);
      setGroupReports([]);
      return;
    }
    const detail = await fetchCommunityGroup(auth, id);
    setGroup(detail);
    const role = detail.group.myRole;
    if (role === "owner" || role === "admin" || role === "moderator") {
      const waiting = await fetchGroupQueue(auth, id);
      setGroupQueue(waiting.posts);
      setGroupReports(waiting.reports);
    } else {
      setGroupQueue([]);
      setGroupReports([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    const gen = ++refreshGen.current;
    const current = () => gen === refreshGen.current;
    const health = await fetchCommunityHealth();
    if (!current()) return;
    setConfigured(health.ok);
    setMedia(health.media);
    if (!health.ok) {
      setSession(null);
      setPosts([]);
      setShorts([]);
      setGroups([]);
      setQueue([]);
      setReports([]);
      setGroupQueue([]);
      setGroupReports([]);
      return;
    }
    const auth = await authFor();
    const nextSession = await fetchCommunitySession(auth);
    if (!current()) return;
    setSession(nextSession);
    const [nextPosts, nextShorts, nextGroups] = await Promise.all([
      fetchCommunityFeed(auth),
      fetchCommunityShorts(auth),
      fetchCommunityGroups(auth),
    ]);
    if (!current()) return;
    setPosts(nextPosts);
    setShorts(nextShorts);
    setGroups(nextGroups);
    if (nextSession.moderator) {
      const moderation = await fetchModerationQueue(auth);
      if (!current()) return;
      setQueue(moderation.posts);
      setReports(moderation.reports);
      setModerators(moderation.moderators);
    } else {
      setQueue([]);
      setReports([]);
      setModerators([]);
    }
    if (groupId) await loadGroup(groupId, auth);
  }, [authFor, groupId, loadGroup]);

  useEffect(() => {
    let cancelled = false;
    void refresh()
      .catch(() => {
        if (!cancelled) setConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const openGroup = useCallback(
    async (id: string | null) => {
      setGroupId(id);
      if (!configured) return;
      await loadGroup(id, await authFor());
    },
    [authFor, configured, loadGroup],
  );

  const publishText = useCallback(
    async (body: string, groupIdForPost?: string | null) => {
      const auth = await authFor();
      await createCommunityPost(auth, {
        body,
        privacyAck: true,
        authorRole: role,
        ...(groupIdForPost ? { groupId: groupIdForPost } : {}),
      });
      await refresh();
    },
    [authFor, refresh, role],
  );

  const publishMedia = useCallback(
    async (input: { prepared: PreparedMedia; caption: string; groupId?: string | null }) => {
      if (!session?.userId || media === "none") {
        throw new CommunityClientError(
          "media_not_configured",
          "Photo and video storage is not connected yet.",
        );
      }
      const auth = await authFor();
      const uploadId = await uploadPreparedMedia(auth, session.userId, media, input.prepared);
      await createCommunityPost(auth, {
        body: input.caption,
        privacyAck: true,
        consent: true,
        uploadId,
        authorRole: role,
        ...(input.groupId ? { groupId: input.groupId } : {}),
      });
      await refresh();
    },
    [authFor, media, refresh, role, session?.userId],
  );

  const uploadImage = useCallback(
    async (prepared: PreparedMedia) => {
      if (!session?.userId || media === "none") {
        throw new CommunityClientError(
          "media_not_configured",
          "Photo and video storage is not connected yet.",
        );
      }
      return uploadPreparedMedia(await authFor(), session.userId, media, prepared);
    },
    [authFor, media, session?.userId],
  );

  const value = useMemo<CommunitySocialValue>(
    () => ({
      ready,
      configured,
      media,
      signedIn: Boolean(session?.signedIn),
      moderator: Boolean(session?.moderator),
      founder: Boolean(session?.founder),
      suspended: Boolean(session?.suspended),
      actorName: session?.name ?? null,
      userId: session?.userId ?? null,
      posts,
      shorts,
      groups,
      group,
      queue,
      reports,
      groupQueue,
      groupReports,
      moderators,
      refresh,
      openGroup,
      publishText,
      publishMedia,
      uploadImage,
      toggleLike: async (id) => {
        await likeCommunityPost(await authFor(), id);
        await refresh();
      },
      comment: async (id, text) => {
        await commentCommunityPost(await authFor(), id, text, role);
        await refresh();
      },
      report: async (input) => {
        await reportCommunity(await authFor(), {
          targetType: input.commentId ? "comment" : "post",
          postId: input.postId,
          ...(input.commentId ? { commentId: input.commentId } : {}),
          reason: input.reason,
        });
      },
      review: async (id, action, reason) => {
        await reviewCommunityPost(await authFor(), id, action, reason);
        await refresh();
      },
      removeComment: async (postId, commentId) => {
        await removeCommunityComment(await authFor(), postId, commentId);
        await refresh();
      },
      suspend: async (userId, active, reason) => {
        await suspendCommunityUser(await authFor(), userId, active, reason);
        await refresh();
      },
      createGroup: async (input) => {
        const id = await createCommunityGroup(await authFor(), input);
        await refresh();
        return id;
      },
      saveGroup: async (id, input) => {
        await updateCommunityGroup(await authFor(), id, input);
        await refresh();
      },
      removeGroup: async (id) => {
        await deleteCommunityGroup(await authFor(), id);
        setGroupId(null);
        setGroup(null);
        await refresh();
      },
      transferGroup: async (id, userId) => {
        await transferCommunityGroup(await authFor(), id, userId);
        await refresh();
      },
      join: async (id, answer) => {
        const status = await joinCommunityGroup(await authFor(), id, answer);
        await refresh();
        return status;
      },
      leave: async (id) => {
        await leaveCommunityGroup(await authFor(), id);
        await refresh();
      },
      memberAction: async (groupIdForAction, userId, action, nextRole) => {
        await communityMemberAction(await authFor(), groupIdForAction, {
          userId,
          action,
          ...(nextRole ? { role: nextRole } : {}),
        });
        await refresh();
      },
    }),
    [
      authFor,
      configured,
      group,
      groups,
      media,
      moderators,
      openGroup,
      posts,
      publishMedia,
      publishText,
      groupQueue,
      groupReports,
      queue,
      ready,
      refresh,
      reports,
      role,
      session,
      shorts,
      uploadImage,
    ],
  );

  return (
    <CommunitySocialContext.Provider value={value}>{children}</CommunitySocialContext.Provider>
  );
}

function ClerkSocialProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  return <SocialProvider getToken={getToken}>{children}</SocialProvider>;
}

export function CommunitySocialProvider({ children }: { children: ReactNode }) {
  if (!isClerkConfigured()) {
    return <SocialProvider getToken={async () => null}>{children}</SocialProvider>;
  }
  return <ClerkSocialProvider>{children}</ClerkSocialProvider>;
}

export function communityErrorText(t: (key: string) => string, err: unknown): string {
  const code =
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";
  const local: Record<string, string> = {
    videoLong: "community.social.videoLong",
    videoBig: "community.social.videoBig",
    videoMeta: "community.social.videoMeta",
    imageFail: "community.social.imageFail",
  };
  const key = local[code] || `community.social.errors.${code}`;
  const translated = t(key);
  return translated === key ? t("community.social.errors.server_error") : translated;
}

export function useCommunityErrorText() {
  const { t } = useI18n();
  return (err: unknown) => communityErrorText(t, err);
}
