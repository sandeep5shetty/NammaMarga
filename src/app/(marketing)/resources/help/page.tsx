import { AnimationContainer, MaxWidthWrapper } from "@/components";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

const HelpPage = () => {
  return (
    <MaxWidthWrapper className="py-20">
      <AnimationContainer delay={0.1} className="w-full max-w-2xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold font-heading">Help center</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Everything you need to report issues, verify fixes, and use emergency routing in
          Bengaluru.
        </p>
        <div className="mt-10 grid gap-4 text-left">
          {[
            {
              title: "Report a civic issue",
              body: "Upload a photo, let AI classify the problem, and submit with your location.",
              href: "/report",
            },
            {
              title: "Use the civic map",
              body: "Explore potholes and complaints by ward with heatmaps and filters.",
              href: "/map",
            },
            {
              title: "Emergency green corridor",
              body: "Plan the safest ambulance route to a hospital — no account required.",
              href: "/emergency-route",
            },
            {
              title: "BBMP officials",
              body: "Sign in to the BBMP console for ward queues and analytics.",
              href: "/auth/bbmp/sign-in",
            },
          ].map((item) => (
            <div
              key={item.href}
              className="rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={item.href}>
                  Open
                  <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </AnimationContainer>
    </MaxWidthWrapper>
  );
};

export default HelpPage;
