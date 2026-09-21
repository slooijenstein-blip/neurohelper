import { UserButton, useAuth, useClerk, useUser } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { Baby, BookmarkCheck, LogOut, MapPin, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ROLES, useAppStore, type Profile, type Role } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import {
  applyCaregiverProfileEdits,
  clerkNameUpdateFromDisplayName,
  type CaregiverProfileEdits,
} from "@/lib/clerk-profile";
import { withBasePath } from "@/lib/paths";
import { ScreenHeader, ProfileAvatar, RoleTag, SocialBar } from "./ui-bits";

const STORAGE_KEY = "motor-skill-buddy-v1";

const fieldLabelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ProfileTab() {
  const { state, update } = useAppStore();
  const profile = state.profile;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title="Profile" subtitle="Your identity — child details stay on this device" />

      <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4 md:max-w-2xl md:px-8">
        {isClerkConfigured() ? (
          <ClerkBackedIdentity profile={profile} />
        ) : (
          <CaregiverIdentityCard profile={profile} />
        )}

        <div className="soft-card flex items-center gap-3 p-4">
          <div className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
            <Baby className="size-6" />
          </div>
          <div>
            <p className="text-base font-semibold">{state.childName || "Add a first name"}</p>
            <p className="text-xs text-muted-foreground">
              {state.childName ? `${state.childAge} years old` : "Stored only on this device"}
            </p>
          </div>
        </div>

        <div className="soft-card space-y-4 p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Optional. Use a first name only. Synlumae does not store child details in your Clerk
            account.
          </p>
          <div>
            <label className={fieldLabelClass} htmlFor="child-first-name">
              Child's first name
            </label>
            <Input
              id="child-first-name"
              className="h-11"
              value={state.childName}
              placeholder="First name (this device only)"
              onChange={(e) => update((prev) => ({ ...prev, childName: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Age</span>
              <span className="text-foreground">{state.childAge} years</span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[state.childAge]}
              onValueChange={(v) => update((prev) => ({ ...prev, childAge: v[0] ?? 1 }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="soft-card p-4">
            <BookmarkCheck className="mb-1 size-5 text-primary" />
            <p className="text-2xl font-bold">
              {state.templates.filter((t) => t.ownerId === profile?.id).length}
            </p>
            <p className="text-[11px] text-muted-foreground">Saved templates</p>
          </div>
          <div className="soft-card p-4">
            <Sparkles className="mb-1 size-5 text-warm" />
            <p className="text-2xl font-bold">{state.observations.length}</p>
            <p className="text-[11px] text-muted-foreground">Observations logged</p>
          </div>
        </div>

        {state.templates.some((t) => t.ownerId === profile?.id && !t.isPublic) ? (
          <div className="soft-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Your private templates</h3>
            <div className="space-y-2">
              {state.templates
                .filter((t) => t.ownerId === profile?.id && !t.isPublic)
                .map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-card p-2">
                    <p className="text-xs font-semibold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.items.length} activities</p>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        <Button
          variant="outline"
          className="h-11 w-full text-destructive"
          onClick={() => {
            window.localStorage.removeItem(STORAGE_KEY);
            toast.success("Local data reset. Refresh to see defaults");
          }}
        >
          Reset local data
        </Button>

        {isClerkConfigured() ? <ClerkAwareSessionControls /> : <LocalLogoutButton />}
      </div>
    </div>
  );
}

function ClerkBackedIdentity({ profile }: { profile: Profile | null }) {
  const { user } = useUser();

  if (!user) return <CaregiverIdentityCard profile={profile} />;

  const persistNameToClerk = async (name: string) => {
    const { firstName, lastName } = clerkNameUpdateFromDisplayName(name);
    await user.update({ firstName, lastName });
  };

  return <CaregiverIdentityCard profile={profile} persistNameToClerk={persistNameToClerk} />;
}

function CaregiverIdentityCard({
  profile,
  persistNameToClerk,
}: {
  profile: Profile | null;
  persistNameToClerk?: (name: string) => Promise<void>;
}) {
  const { update } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CaregiverProfileEdits>({
    name: "",
    role: "Parent",
    location: "",
    bio: "",
  });

  if (!profile) return null;

  const startEdit = () => {
    setDraft({
      name: profile.name,
      role: profile.role,
      location: profile.location,
      bio: profile.bio,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Please add your name");
      return;
    }

    const next = applyCaregiverProfileEdits(profile, { ...draft, name });
    update((prev) => ({ ...prev, profile: next }));
    setSaving(true);
    try {
      if (persistNameToClerk) {
        await persistNameToClerk(next.name);
      }
      toast.success("Profile saved");
      setEditing(false);
    } catch {
      toast.success("Saved on this device. Account name could not be updated yet.");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="soft-card flex items-center gap-3 p-4">
          <ProfileAvatar name={profile.name} color={profile.color} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">{profile.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <RoleTag role={profile.role} />
              {profile.location ? (
                <>
                  <MapPin className="ml-1 size-3" /> {profile.location}
                </>
              ) : null}
            </p>
          </div>
        </div>

        {profile.bio || Object.keys(profile.socials).length ? (
          <div className="soft-card space-y-3 p-4">
            {profile.bio ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{profile.bio}</p>
            ) : null}
            <SocialBar socials={profile.socials} />
          </div>
        ) : null}

        <Button className="h-11 w-full" onClick={startEdit}>
          <Pencil className="size-4" /> Edit profile
        </Button>
      </div>
    );
  }

  return (
    <form
      className="soft-card space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-name">
          Display name
        </label>
        <Input
          id="caregiver-name"
          className="h-11"
          value={draft.name}
          maxLength={80}
          autoComplete="name"
          placeholder="Your name"
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-role">
          Role
        </label>
        <select
          id="caregiver-role"
          className={selectClass}
          value={draft.role}
          onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value as Role }))}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-location">
          Location (optional)
        </label>
        <Input
          id="caregiver-location"
          className="h-11"
          value={draft.location}
          maxLength={80}
          autoComplete="address-level2"
          placeholder="City or area"
          onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-bio">
          Bio (optional)
        </label>
        <Textarea
          id="caregiver-bio"
          className="min-h-24 text-base"
          value={draft.bio}
          maxLength={280}
          placeholder="A short note about you"
          onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{draft.bio.length}/280</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={cancelEdit}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={saving || !draft.name.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function LocalLogoutButton() {
  const { logout } = useAppStore();
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      className="h-11 w-full"
      onClick={() => {
        logout();
        void navigate({ to: "/sign-in" });
      }}
    >
      <LogOut className="mr-1 size-4" /> Log out
    </Button>
  );
}

function ClerkAwareSessionControls() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return <LocalLogoutButton />;
  return <ClerkAccountControls />;
}

function ClerkAccountControls() {
  const { signOut, openUserProfile } = useClerk();
  const { logout } = useAppStore();

  return (
    <div className="space-y-2">
      <div className="clerk-account-host soft-card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Account</p>
          <p className="text-[11px] text-muted-foreground">Email, password, and session</p>
        </div>
        <UserButton
          userProfileMode="modal"
          appearance={{
            elements: {
              rootBox: "relative z-20 shrink-0",
              avatarBox: "size-11",
              userButtonTrigger:
                "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              userButtonPopoverCard: "z-[80]",
            },
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => openUserProfile()}
      >
        Manage account
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full"
        onClick={() => {
          logout();
          void signOut({ redirectUrl: withBasePath("/sign-in") });
        }}
      >
        <LogOut className="mr-1 size-4" /> Log out
      </Button>
    </div>
  );
}
