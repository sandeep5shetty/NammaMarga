import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
  footerText?: string;
  footerLink?: { href: string; label: string };
  showTerms?: boolean;
};

export function AuthPageShell({
  children,
  footerText,
  footerLink,
  showTerms = true,
}: AuthPageShellProps) {
  return (
    <div className="flex flex-col items-start max-w-sm mx-auto min-h-dvh overflow-hidden pt-4 md:pt-20 px-4">
      <div className="flex items-center justify-between w-full py-8 border-b border-border/80">
        <BrandLogo href="/#home" size="sm" />
        <ThemeToggle />
      </div>

      <div className="flex-1 w-full">{children}</div>

      {showTerms && (
        <div className="flex flex-col items-start w-full">
          <p className="text-sm text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      )}

      {footerText && footerLink && (
        <div className="flex items-start mt-auto border-t border-border/80 py-6 w-full">
          <p className="text-sm text-muted-foreground">
            {footerText}{" "}
            <Link href={footerLink.href} className="text-primary hover:underline">
              {footerLink.label}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
