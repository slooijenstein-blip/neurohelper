import { useEffect, useState } from "react";

import { useCommunitySocial } from "./social-context";

type AuthedMediaProps = {
  url: string;
  kind: "image" | "video";
  className?: string;
  alt?: string;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  onClick?: () => void;
};

/** Loads a community photo or video with the signed-in session. The address stays on this app. */
export function AuthedMedia({
  url,
  kind,
  className,
  alt,
  controls,
  muted,
  loop,
  playsInline,
  preload,
  onClick,
}: AuthedMediaProps) {
  const { openMedia } = useCommunitySocial();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancel = false;
    void openMedia(url).then((next) => {
      if (cancel) {
        if (next?.startsWith("blob:")) URL.revokeObjectURL(next);
        return;
      }
      objectUrl = next;
      setSrc(next);
    });
    return () => {
      cancel = true;
      if (objectUrl?.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    };
  }, [openMedia, url]);

  if (kind === "image") {
    if (!src) return <div className={className} data-testid="media-pending" aria-hidden="true" />;
    return <img src={src} alt={alt ?? ""} className={className} />;
  }

  return (
    <video
      src={src ?? undefined}
      className={className}
      controls={controls}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload={preload}
      onClick={onClick}
    />
  );
}
