import { UserButton, useAuth, useClerk } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { Baby, BookmarkCheck, Sparkles, LogOut, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import { withBasePath } from "@/lib/paths";
import { ScreenHeader, ProfileAvatar, RoleTag, SocialBar } from "./ui-bits";

const STORAGE_KEY = "motor-skill-buddy-v1";

export function ProfileTab() {
  const { state, update } = useAppStore();
  const profile = state.profile;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Profile" subtitle="Your identity — child details stay on this device" />

      <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto bg-surface px-5 py-4">
        {profile ? (
          <div className="soft-card flex items-center gap-3 p-4">
            <ProfileAvatar name={profile.name} color={profile.color} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">{profile.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <RoleTag role={profile.role} />
                <MapPin className="ml-1 size-3" /> {profile.location}
              </p>
            </div>
          </div>
        ) : null}

        {profile ? (
          <div className="soft-card space-y-3 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">{profile.bio}</p>
            <SocialBar socials={profile.socials} />
          </div>
        ) : null}

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
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Child's first name
            </label>
            <Input
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
          className="w-full text-destructive"
          onClick={() => {
            window.localStorage.removeItem(STORAGE_KEY);
            toast.success("Local data reset — refresh to see defaults");
          }}
        >
          Reset local data
        </Button>

        {isClerkConfigured() ? <ClerkAwareSessionControls /> : <LocalLogoutButton />}
      </div>
    </div>
  );
}

function LocalLogoutButton() {
  const { logout } = useAppStore();
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      className="w-full"
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
  const { signOut } = useClerk();
  const { logout } = useAppStore();

  return (
    <div className="space-y-2">
      <div className="soft-card flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold">Account</p>
          <p className="text-[11px] text-muted-foreground">Email, password, and session</p>
        </div>
        <UserButton />
      </div>
      <Button
        variant="outline"
        className="w-full"
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
