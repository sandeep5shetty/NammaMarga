import { cn } from "@/utils";
import Image from "next/image";
import Link from "next/link";

/** Canonical app logo (same asset as `src/app/icon.png`). */
export const BRAND_LOGO_SRC = "/assets/logo-new.png";

const SIZE_MAP = {
  sm: { px: 28, className: "h-7 w-7 rounded-lg" },
  md: { px: 36, className: "h-9 w-9 rounded-xl" },
  lg: { px: 44, className: "h-11 w-11 rounded-xl" },
} as const;

type BrandLogoProps = {
  /** Link target; omit for a non-clickable logo */
  href?: string;
  showWordmark?: boolean;
  wordmark?: string;
  subtitle?: string;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  href = "/",
  showWordmark = true,
  wordmark = "NammaMarga",
  subtitle,
  size = "md",
  className,
  wordmarkClassName,
}: BrandLogoProps) {
  const { px, className: imgClass } = SIZE_MAP[size];

  const inner = (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <Image
        src={BRAND_LOGO_SRC}
        alt={wordmark}
        width={px}
        height={px}
        className={cn("shrink-0 object-cover shadow-sm ring-1 ring-border/50", imgClass)}
        priority={size !== "sm"}
      />
      {showWordmark && (
        <div className="min-w-0">
          <span
            className={cn(
              "block font-bold font-heading leading-tight truncate",
              size === "sm" ? "text-base" : "text-lg",
              wordmarkClassName,
            )}
          >
            {wordmark}
          </span>
          {subtitle && (
            <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }

  return inner;
}
