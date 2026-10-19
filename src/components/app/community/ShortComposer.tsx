import { useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { prepareCommunityFile, type PreparedMedia } from "@/lib/community-social/prepare-media";
import { communityErrorText, useCommunitySocial } from "./social-context";

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|m4v)$/i.test(file.name);
}

/** A video-only composer. Approved videos of up to 60 seconds become Shorts. */
export function ShortComposer({ prominent = false }: { prominent?: boolean }) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const recordRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState<PreparedMedia | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPrepared(null);
    setPreview(null);
    setCaption("");
    setConsent(false);
    setPreparing(false);
    setSending(false);
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isVideoFile(file)) {
      toast.error(t("community.social.shortVideoOnly"));
      return;
    }
    if (social.media === "none") {
      toast.message(t("community.social.mediaOff"));
      return;
    }
    setPreparing(true);
    try {
      const next = await prepareCommunityFile(file);
      if (next.kind !== "video") {
        toast.error(t("community.social.shortVideoOnly"));
        return;
      }
      if (preview) URL.revokeObjectURL(preview);
      setPrepared(next);
      setPreview(URL.createObjectURL(next.file));
      setConsent(false);
    } catch (err) {
      toast.error(communityErrorText(t, err));
    } finally {
      setPreparing(false);
      if (recordRef.current) recordRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const post = async () => {
    if (!prepared || !consent || prepared.kind !== "video") return;
    setSending(true);
    try {
      await social.publishMedia({ prepared, caption: caption.trim() });
      toast.success(t("community.social.shortPosted"));
      close();
    } catch (err) {
      toast.error(communityErrorText(t, err));
      setSending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={prominent ? "default" : "secondary"}
        data-testid="post-short"
        disabled={social.suspended}
        onClick={() => {
          if (!social.signedIn) {
            toast.error(t("community.social.signInMedia"));
            return;
          }
          setOpen(true);
        }}
      >
        <Clapperboard />
        {t("community.social.postShort")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
          else setOpen(true);
        }}
      >
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-sm"
          data-testid="short-composer"
        >
          <DialogHeader>
            <DialogTitle>{t("community.social.shortTitle")}</DialogTitle>
            <DialogDescription data-testid="short-hint">
              {t("community.social.shortHint")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-semibold" data-testid="short-limit">
            {t("community.social.shortLimit")}
          </p>
          {social.media === "none" ? (
            <p className="text-sm text-muted-foreground">{t("community.social.mediaOff")}</p>
          ) : null}
          <input
            ref={recordRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            data-testid="short-record-input"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="sr-only"
            data-testid="short-file-input"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="short-record"
              disabled={preparing || social.media === "none"}
              onClick={() => recordRef.current?.click()}
            >
              {t("community.social.shortRecord")}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="short-pick"
              disabled={preparing || social.media === "none"}
              onClick={() => fileRef.current?.click()}
            >
              {preparing ? t("community.social.preparing") : t("community.social.shortPick")}
            </Button>
          </div>
          {preview ? (
            <video
              src={preview}
              controls
              playsInline
              className="aspect-[9/16] max-h-80 w-full rounded-xl bg-black object-contain"
              data-testid="short-preview"
            />
          ) : null}
          {prepared?.durationSec ? (
            <p className="text-xs text-muted-foreground">
              {prepared.durationSec}s · {t("community.social.shortLimit")}
            </p>
          ) : null}
          <Textarea
            data-testid="short-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t("community.social.caption")}
            rows={2}
          />
          <button
            type="button"
            role="checkbox"
            aria-checked={consent}
            data-testid="short-consent"
            onClick={() => setConsent((value) => !value)}
            className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm"
          >
            <span
              aria-hidden
              className={`mt-0.5 grid size-4 shrink-0 place-content-center rounded-sm border ${consent ? "border-primary bg-primary text-primary-foreground" : "border-primary"}`}
            >
              {consent ? "✓" : ""}
            </span>
            <span>{t("community.social.consentLabel")}</span>
          </button>
          <Button
            type="button"
            data-testid="short-submit"
            disabled={!prepared || !consent || sending}
            onClick={() => void post()}
          >
            {t("community.social.postShort")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
