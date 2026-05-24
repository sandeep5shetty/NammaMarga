"use client";

import { cn } from "@/utils";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeAwareDashboardImageProps = {
  className?: string;
};

export function ThemeAwareDashboardImage({ className }: ThemeAwareDashboardImageProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <Image
      src={isDark ? "/assets/dashboard-dark.svg" : "/assets/dashboard.svg"}
      alt="NammaMarg dashboard preview"
      width={1200}
      height={1200}
      quality={100}
      className={cn(
        "rounded-md lg:rounded-xl bg-foreground/10 ring-1 ring-border transition-opacity duration-500",
        className,
      )}
    />
  );
}
