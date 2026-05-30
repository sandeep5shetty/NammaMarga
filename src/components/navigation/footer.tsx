import Link from "next/link";
import Image from "next/image";
import { AnimationContainer } from "@/components";

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
    { label: "Help center", href: "/resources/help" },
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1.5 bg-foreground rounded-full" />

      <div className="flex flex-col items-center justify-center max-w-6xl mx-auto px-6 lg:px-8 pt-16 pb-10 lg:pt-24">
        <div className="grid gap-8 xl:grid-cols-3 xl:gap-8 w-full">
          <AnimationContainer delay={0.1}>
            <div className="flex flex-col items-start justify-start md:max-w-xs">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/assets/logo-new.png"
                  alt="NammaMarg"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <span className="font-bold font-heading text-lg">NammaMarg</span>
              </Link>
              <p className="text-muted-foreground mt-4 text-sm text-start leading-relaxed">
                AI-powered civic road intelligence for Bengaluru. Report potholes, track BBMP
                resolution, and find emergency green corridors — built for citizens and city
                officials.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                A smarter way to fix Bengaluru&apos;s roads, together.
              </p>
            </div>
          </AnimationContainer>

          <div className="grid-cols-2 gap-8 grid mt-16 xl:col-span-2 xl:mt-0 md:grid-cols-4">
            <AnimationContainer delay={0.2}>
              <div>
                <h3 className="text-base font-medium text-foreground">Platform</h3>
                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
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
                <h3 className="text-base font-medium text-foreground">For BBMP</h3>
                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
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
                <h3 className="text-base font-medium text-foreground">Resources</h3>
                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
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
                <h3 className="text-base font-medium text-foreground">Legal</h3>
                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
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

        <div className="mt-8 border-t border-border/40 pt-4 md:pt-8 w-full">
          <AnimationContainer delay={0.6}>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} NammaMarg. Civic infrastructure for Bengaluru.
            </p>
          </AnimationContainer>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
