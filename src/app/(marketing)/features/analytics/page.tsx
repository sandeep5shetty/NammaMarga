import { AnimationContainer, MaxWidthWrapper } from "@/components";
import { Button } from "@/components/ui/button";
import { LampContainer } from "@/components/ui/lamp";
import MagicBadge from "@/components/ui/magic-badge";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

const BbmpAnalyticsPage = () => {
  return (
    <>
      <MaxWidthWrapper>
        <AnimationContainer delay={0.1} className="w-full">
          <div className="flex flex-col items-center justify-center py-10 max-w-lg mx-auto">
            <MagicBadge title="BBMP" />
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold font-heading text-center mt-6 !leading-tight">
              Ward analytics and priority queues
            </h1>
            <p className="text-base md:text-lg mt-6 text-center text-muted-foreground">
              Heatmaps, ward rankings, contractor workflows, and road health scores — everything
              municipal teams need to allocate crews and track resolution.
            </p>
            <div className="flex items-center justify-center gap-x-4 mt-8">
              <Button size="sm" asChild>
                <Link href="/auth/bbmp/sign-in">BBMP console</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/map">Public map</Link>
              </Button>
            </div>
          </div>
        </AnimationContainer>
      </MaxWidthWrapper>
      <MaxWidthWrapper className="pt-20">
        <AnimationContainer delay={0.4} className="w-full">
          <LampContainer className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center justify-center relative w-full text-center">
              <h2 className="bg-gradient-to-br from-neutral-300 to-neutral-500 py-4 bg-clip-text text-center text-4xl font-semibold font-heading tracking-tight text-transparent md:text-7xl mt-8">
                Data-driven ward operations
              </h2>
              <p className="text-muted-foreground mt-6 max-w-lg mx-auto text-base md:text-lg">
                See which wards need attention, assign issues to contractors, and measure fix rates
                over time.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/auth/bbmp/sign-in" className="flex items-center">
                    Sign in as BBMP
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </LampContainer>
        </AnimationContainer>
      </MaxWidthWrapper>
    </>
  );
};

export default BbmpAnalyticsPage;
