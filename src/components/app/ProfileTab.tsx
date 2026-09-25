import { UserButton, useAuth, useClerk, useUser } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { Baby, BookmarkCheck, LogOut, MapPin, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n/I18nProvider";
import { ROLE_MESSAGE_KEY } from "@/i18n/roles";
import { isAppLocale, type AppLocale } from "@/i18n/locales";
import { countryName, getCountry, sortedCountries } from "@/lib/help/countries";
import { listedCountryCode, writeStoredResidence } from "@/lib/help/detect-country";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ROLES, useAppStore, type Profile, type Role } from "@/lib/app-store";
import { useCalendarStore } from "@/lib/calendar/store";
import { setDevShareUser } from "@/lib/share/dev-session";
import { isProAccount } from "@/lib/pro-access";
import { isClerkConfigured } from "@/lib/clerk";
import {
  applyCaregiverProfileEdits,
  clerkNameUpdateFromDisplayName,
  type CaregiverProfileEdits,
} from "@/lib/clerk-profile";
import { withBasePath } from "@/lib/paths";
import { ProAccessCard } from "./ProAccessCard";
import { ScreenHeader, ProfileAvatar, RoleTag, SocialBar } from "./ui-bits";

const STORAGE_KEY = "motor-skill-buddy-v1";

const fieldLabelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ProfileTab() {
  const { state, update } = useAppStore();
  const { t } = useI18n();
  const profile = state.profile;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

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
            <p className="text-base font-semibold">
              {state.childName || t("profile.addFirstName")}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.childName
                ? t("profile.yearsOld", { age: state.childAge })
                : t("profile.storedOnDevice")}
            </p>
          </div>
        </div>

        <div className="soft-card space-y-4 p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("profile.childNote")}
          </p>
          <div>
            <label className={fieldLabelClass} htmlFor="child-first-name">
              {t("profile.childFirstName")}
            </label>
            <Input
              id="child-first-name"
              className="h-11"
              value={state.childName}
              placeholder={t("profile.childPlaceholder")}
              onChange={(e) => update((prev) => ({ ...prev, childName: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>{t("profile.age")}</span>
              <span className="text-foreground">{t("profile.years", { age: state.childAge })}</span>
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
            <p className="text-[11px] text-muted-foreground">{t("profile.savedTemplates")}</p>
          </div>
          <div className="soft-card p-4">
            <Sparkles className="mb-1 size-5 text-warm" />
            <p className="text-2xl font-bold">{state.observations.length}</p>
            <p className="text-[11px] text-muted-foreground">{t("profile.observationsLogged")}</p>
          </div>
        </div>

        {state.templates.some((t) => t.ownerId === profile?.id && !t.isPublic) ? (
          <div className="soft-card p-4">
            <h3 className="mb-2 text-sm font-semibold">{t("profile.privateTemplates")}</h3>
            <div className="space-y-2">
              {state.templates
                .filter((t) => t.ownerId === profile?.id && !t.isPublic)
                .map((template) => (
                  <div key={template.id} className="rounded-lg border border-border bg-card p-2">
                    <p className="text-xs font-semibold">{template.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("profile.activityCount", { count: template.items.length })}
                    </p>
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
            toast.success(t("profile.resetToast"));
          }}
        >
          {t("profile.resetLocal")}
        </Button>

        <ProAccessCard />

        <DemoPersonaNote />
        <LiveShareNote />

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
  const { t, locale, setLocale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localeWhenOpened, setLocaleWhenOpened] = useState<AppLocale>(locale);
  const [countryWhenOpened, setCountryWhenOpened] = useState<string | null>(null);
  const [draftCountry, setDraftCountry] = useState("");
  const [draft, setDraft] = useState<CaregiverProfileEdits>({
    name: "",
    role: "Parent",
    location: "",
    bio: "",
  });

  const persistResidence = (code: string | null) => {
    writeStoredResidence(code);
    update((prev) => {
      if (!prev.profile) return prev;
      if (!code) {
        const rest = { ...prev.profile };
        delete rest.helpCountry;
        return { ...prev, profile: rest };
      }
      return { ...prev, profile: { ...prev.profile, helpCountry: code } };
    });
  };

  if (!profile) return null;

  const residence = listedCountryCode(profile.helpCountry);
  const residenceCountry = residence ? getCountry(residence) : undefined;

  const startEdit = () => {
    setLocaleWhenOpened(locale);
    setCountryWhenOpened(residence);
    setDraftCountry(residence ?? "");
    setDraft({
      name: profile.name,
      role: profile.role,
      location: profile.location,
      bio: profile.bio,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setLocale(localeWhenOpened);
    persistResidence(countryWhenOpened);
    setEditing(false);
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error(t("errors.nameRequired"));
      return;
    }

    writeStoredResidence(draftCountry || null);
    let savedName = name;
    update((prev) => {
      if (!prev.profile) return prev;
      const next = {
        ...applyCaregiverProfileEdits(prev.profile, { ...draft, name }),
        locale,
        ...(draftCountry ? { helpCountry: draftCountry } : {}),
      };
      savedName = next.name;
      return { ...prev, profile: next };
    });
    setSaving(true);
    try {
      if (persistNameToClerk) {
        await persistNameToClerk(savedName);
      }
      toast.success(t("profile.saved"));
      setEditing(false);
    } catch {
      toast.success(t("profile.savedLocalOnly"));
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
            {residenceCountry ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("profile.livesIn", { country: countryName(residenceCountry, locale) })}
              </p>
            ) : null}
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
          <Pencil className="size-4" /> {t("profile.editProfile")}
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
        <label className={fieldLabelClass} htmlFor="app-language">
          {t("language.label")}
        </label>
        <select
          id="app-language"
          className={selectClass}
          value={locale}
          onChange={(event) => {
            const next = event.target.value;
            if (isAppLocale(next)) setLocale(next);
          }}
        >
          <option value="en">{t("language.en")}</option>
          <option value="es">{t("language.es")}</option>
        </select>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("language.help")}
        </p>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-country">
          {t("profile.countryLabel")}
        </label>
        <select
          id="caregiver-country"
          className={selectClass}
          value={draftCountry}
          onChange={(event) => {
            const code = listedCountryCode(event.target.value);
            setDraftCountry(code ?? "");
            persistResidence(code);
          }}
        >
          {draftCountry ? null : <option value="">{t("profile.countryPlaceholder")}</option>}
          {sortedCountries(locale).map((country) => (
            <option key={country.code} value={country.code}>
              {countryName(country, locale)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("profile.countryHelp")}
        </p>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-name">
          {t("profile.displayName")}
        </label>
        <Input
          id="caregiver-name"
          className="h-11"
          value={draft.name}
          maxLength={80}
          autoComplete="name"
          placeholder={t("profile.namePlaceholder")}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-role">
          {t("profile.role")}
        </label>
        <select
          id="caregiver-role"
          className={selectClass}
          value={draft.role}
          onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value as Role }))}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(ROLE_MESSAGE_KEY[role])}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-location">
          {t("profile.location")}
        </label>
        <Input
          id="caregiver-location"
          className="h-11"
          value={draft.location}
          maxLength={80}
          autoComplete="address-level2"
          placeholder={t("profile.locationPlaceholder")}
          onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="caregiver-bio">
          {t("profile.bio")}
        </label>
        <Textarea
          id="caregiver-bio"
          className="min-h-24 text-base"
          value={draft.bio}
          maxLength={280}
          placeholder={t("profile.bioPlaceholder")}
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
          {t("common.cancel")}
        </Button>
        <Button type="submit" className="h-11" disabled={saving || !draft.name.trim()}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function LiveShareNote() {
  const { prototypeDemo } = useAppStore();
  const cal = useCalendarStore();
  const { t } = useI18n();
  if (prototypeDemo || cal.shareMode !== "live") return null;
  return (
    <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border">
      <p className="text-xs text-muted-foreground">
        {cal.shareStatus === "ready" ? t("share.liveOn") : t("share.notConfigured")}
      </p>
    </div>
  );
}

function DemoPersonaNote() {
  const { prototypeDemo } = useAppStore();
  const { state } = useAppStore();
  const cal = useCalendarStore();
  const { t } = useI18n();
  if (!prototypeDemo) return null;

  return (
    <div className="rounded-2xl bg-warm/30 p-4 ring-1 ring-border">
      <p className="text-xs text-muted-foreground">
        {isProAccount(state.profile) ? t("pro.demoBanner") : t("shared.demoBanner")}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-10 w-full"
        onClick={() => {
          cal.resetDemo();
          toast.success(t("calendar.prototype.reset"));
        }}
      >
        {t("calendar.prototype.reset")}
      </Button>
    </div>
  );
}

function LocalLogoutButton() {
  const { logout } = useAppStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      className="h-11 w-full"
      onClick={() => {
        setDevShareUser(null);
        logout();
        void navigate({ to: "/sign-in" });
      }}
    >
      <LogOut className="mr-1 size-4" /> {t("profile.logOut")}
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
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="clerk-account-host soft-card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("profile.account")}</p>
          <p className="text-[11px] text-muted-foreground">{t("profile.accountHint")}</p>
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
        {t("profile.manageAccount")}
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full"
        onClick={() => {
          setDevShareUser(null);
          logout();
          void signOut({ redirectUrl: withBasePath("/sign-in") });
        }}
      >
        <LogOut className="mr-1 size-4" /> {t("profile.logOut")}
      </Button>
    </div>
  );
}
