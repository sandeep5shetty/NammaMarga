"use client";

import { cn } from "@/utils";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function SiteBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      {/* Light mode background */}
      <Image
        src="/assets/image-hero-light.png"
        alt=""
        fill
        priority
        quality={90}
        sizes="100vw"
        className={cn(
          "object-cover object-center transition-opacity duration-500",
          isDark ? "opacity-0" : "opacity-35",
        )}
      />

      {/* Dark mode background */}
      <Image
        src="/assets/image-hero.jpg"
        alt=""
        fill
        priority
        quality={90}
        sizes="100vw"
        className={cn(
          "object-cover object-center transition-opacity duration-500",
          isDark ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Light mode — scrim so text stays readable over softer hero */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-white/70 via-white/40 to-white/65 transition-opacity duration-500",
          isDark ? "opacity-0" : "opacity-100",
        )}
      />

      {/* Dark mode — minimal scrim */}
      <div
        className={cn(
          "absolute inset-0 bg-background/20 transition-opacity duration-500",
          isDark ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/40 transition-opacity duration-500",
          isDark ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-tr from-emerald-900/20 via-transparent to-cyan-900/15 transition-opacity duration-500",
          isDark ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
