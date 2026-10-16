import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
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

export function MediaShareButtons({ groupId }: { groupId?: string | null }) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!social.signedIn) {
      toast.error(t("community.social.signInMedia"));
      return;
    }
    if (social.media === "none") {
      toast.message(t("community.social.mediaOff"));
      return;
    }
    setPreparing(true);
    try {
      const next = await prepareCommunityFile(file);
      if (preview) URL.revokeObjectURL(preview);
      setPrepared(next);
      setPreview(URL.createObjectURL(next.file));
      setConsent(false);
      setOpen(true);
    } catch (err) {
      toast.error(communityErrorText(t, err));
    } finally {
      setPreparing(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const share = async () => {
    if (!prepared || !consent) return;
    setSending(true);
    try {
      await social.publishMedia({
        prepared,
        caption: caption.trim(),
        ...(groupId ? { groupId } : {}),
      });
      toast.success(t("community.social.postedPending"));
      reset();
    } catch (err) {
      toast.error(communityErrorText(t, err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="sr-only"
        data-testid="media-camera-input"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        data-testid="media-gallery-input"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="media-camera"
        disabled={preparing || social.suspended}
        onClick={() => cameraRef.current?.click()}
      >
        <Camera />
        {preparing ? t("community.social.preparing") : t("community.social.camera")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="media-gallery"
        disabled={preparing || social.suspended}
        onClick={() => galleryRef.current?.click()}
      >
        <ImagePlus />
        {t("community.social.gallery")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("community.social.privacyTitle")}</DialogTitle>
            <DialogDescription>{t("community.social.privacyBody")}</DialogDescription>
          </DialogHeader>
          {preview && prepared?.kind === "image" ? (
            <img
              src={preview}
              alt={t("community.social.photoAlt")}
              className="max-h-56 w-full rounded-xl object-cover"
            />
          ) : null}
          {preview && prepared?.kind === "video" ? (
            <video
              src={preview}
              controls
              playsInline
              className="max-h-56 w-full rounded-xl bg-black"
            />
          ) : null}
          <Textarea
            data-testid="media-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t("community.social.caption")}
            rows={3}
          />
          <button
            type="button"
            role="checkbox"
            aria-checked={consent}
            data-testid="privacy-consent"
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
            data-testid="privacy-submit"
            disabled={!consent || sending}
            onClick={() => void share()}
          >
            {t("community.social.postMedia")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
