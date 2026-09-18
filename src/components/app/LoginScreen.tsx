import { useState } from "react";
import { Sparkles, UserPlus, LogIn } from "lucide-react";

import { useAppStore, ROLES, type Role, type Profile } from "@/lib/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-indigo-500",
];

export function LoginScreen() {
  const { login } = useAppStore();
  const [mode, setMode] = useState<"welcome" | "create">("welcome");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Parent");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [color, setColor] = useState(PALETTE[0]!);

  const continueAsDefault = () => {
    login({
      id: "me",
      name: "Sam",
      role: "Parent",
      location: "Amsterdam",
      bio: "Parent of a curious 4-year-old. Always looking for motor skill ideas that fit into our day.",
      socials: { instagram: "https://instagram.com/sam.parent", website: "https://example.com" },
      color: "bg-primary",
    });
  };

  const create = () => {
    if (!name.trim()) return;
    const profile: Profile = {
      id: "me",
      name: name.trim(),
      role,
      location: location.trim() || "Unknown",
      bio: bio.trim() || "New member of the NeuroHelper community.",
      socials: {},
      color,
    };
    login(profile);
  };

  if (mode === "create") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface px-5 py-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-7" />
          </div>
          <h2 className="text-xl font-bold">Create your profile</h2>
          <p className="text-xs text-muted-foreground">Tell the community a little about you.</p>
        </div>

        <div className="hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Role / identity
            </label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Location
            </label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or country" />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short introduction..."
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Profile colour
            </label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("size-8 rounded-full", c, color === c && "ring-2 ring-offset-2 ring-primary")}
                  aria-label="Pick colour"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button className="w-full" onClick={create}>
            <UserPlus className="mr-1 size-4" /> Create profile
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode("welcome")}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-surface px-6 py-8 text-center md:h-auto md:py-10">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">NeuroHelper</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Activities, schedules, and community for neurodiverse families.
      </p>
      <div className="w-full space-y-2">
        <Button className="w-full" onClick={continueAsDefault}>
          <LogIn className="mr-1 size-4" /> Continue as Sam
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setMode("create")}>
          <UserPlus className="mr-1 size-4" /> Create a profile
        </Button>
      </div>
    </div>
  );
}
