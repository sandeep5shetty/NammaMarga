import { AnimationContainer, MaxWidthWrapper } from "@/components";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const EnterprisePage = () => {
  return (
    <MaxWidthWrapper className="py-20">
      <AnimationContainer delay={0.1} className="w-full max-w-2xl mx-auto text-center">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold font-heading mt-6 !leading-tight">
          Municipal &amp; enterprise
        </h1>
        <p className="text-base md:text-lg mt-6 text-muted-foreground">
          NammaMarg is built for BBMP ward operations, contractor workflows, and city-wide road
          health analytics. Contact your team lead for console access or pilot deployments across
          zones.
        </p>
        <Button asChild className="mt-8">
          <Link href="/auth/bbmp/sign-in">BBMP sign in</Link>
        </Button>
      </AnimationContainer>
    </MaxWidthWrapper>
  );
};

export default EnterprisePage;
