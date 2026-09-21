import { withBasePath } from "@/lib/paths";
import { cn } from "@/lib/utils";

const ASSETS = {
  full: { src: "/logo.png", width: 540, height: 467 },
  lockup: { src: "/logo-lockup.png", width: 1198, height: 320 },
  icon: { src: "/logo-icon.png", width: 512, height: 512 },
} as const;

type BrandLogoProps = {
  variant?: keyof typeof ASSETS;
  className?: string;
  alt?: string;
};

export function BrandLogo({ variant = "lockup", className, alt = "Synlumae" }: BrandLogoProps) {
  const asset = ASSETS[variant];
  return (
    <img
      src={withBasePath(asset.src)}
      alt={alt}
      width={asset.width}
      height={asset.height}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
