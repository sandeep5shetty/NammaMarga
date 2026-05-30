import { BrandLogo } from "@/components/brand/brand-logo";
import { AnimationContainer } from "@/components";
import Link from "next/link";

const FOOTER_LINKS = {
  platform: [
    { label: "Report an issue", href: "/report" },
    { label: "Civic map", href: "/map" },
    { label: "Emergency route", href: "/emergency-route" },
    { label: "Leaderboard", href: "/dashboard/leaderboard" },
  ],
  bbmp: [
    { label: "BBMP dashboard", href: "/auth/bbmp/sign-in" },
    { label: "Ward analytics", href: "/bbmp/analytics" },
    { label: "Issue queue", href: "/bbmp/issues" },
  ],
  resources: [
    { label: "Contact BBMP", href: "/resources/help" },
    { label: "Changelog", href: "/changelog" },
    { label: "Blog", href: "/resources/blog" },
  ],
  legal: [
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms of service", href: "/terms" },
  ],
};

const Footer = () => {
  return (
    <footer className="relative w-full border-t border-white/40 bg-white/60 backdrop-blur-lg dark:border-border/60 dark:bg-background/25">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-1 bg-foreground/80 rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-[minmax(0,240px)_1fr] lg:grid-cols-[minmax(0,260px)_1fr] items-start">
          <AnimationContainer delay={0.1}>
            <div className="flex flex-col items-start">
              <BrandLogo href="/" size="sm" />
              <p className="text-muted-foreground mt-2 text-xs sm:text-sm leading-snug max-w-xs">
                Civic road intelligence for Bengaluru — report issues, track BBMP work, and plan
                emergency green corridors.
              </p>
            </div>
          </AnimationContainer>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:gap-x-4">
            <AnimationContainer delay={0.2}>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Platform
                </h3>
                <ul className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                  {FOOTER_LINKS.platform.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimationContainer>
            <AnimationContainer delay={0.3}>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  For BBMP
                </h3>
                <ul className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                  {FOOTER_LINKS.bbmp.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimationContainer>
            <AnimationContainer delay={0.4}>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Resources
                </h3>
                <ul className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                  {FOOTER_LINKS.resources.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimationContainer>
            <AnimationContainer delay={0.5}>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Legal
                </h3>
                <ul className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                  {FOOTER_LINKS.legal.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimationContainer>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/40">
          <AnimationContainer delay={0.6}>
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              &copy; {new Date().getFullYear()} NammaMarga · Civic infrastructure for Bengaluru
            </p>
          </AnimationContainer>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
