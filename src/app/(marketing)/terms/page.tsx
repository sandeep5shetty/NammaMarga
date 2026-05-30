import { AnimationContainer, MaxWidthWrapper } from "@/components";
import Link from "next/link";

const TermsPage = () => {
  return (
    <MaxWidthWrapper className="py-20">
      <AnimationContainer delay={0.1}>
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="text-3xl md:text-4xl font-bold font-heading">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

          <p className="text-muted-foreground leading-relaxed mt-6">
            Welcome to <strong>NammaMarga</strong>. These terms govern your use of our website and civic
            infrastructure services for Bengaluru. By using NammaMarga, you agree to these terms.
          </p>

          <h2 className="text-xl font-semibold mt-8">Use of the platform</h2>
          <p className="text-muted-foreground">
            NammaMarga enables citizens to report road and civic issues, view maps and analytics, verify
            fixes, and plan emergency routes. BBMP and authorized officials may manage issue workflows
            through a separate console.
          </p>

          <h2 className="text-xl font-semibold mt-8">Acceptable use</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Submit truthful reports with accurate locations</li>
            <li>Do not upload offensive, misleading, or unrelated content</li>
            <li>Do not attempt to disrupt or access systems without authorization</li>
            <li>Do not misuse emergency routing for non-emergency purposes</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">Issue reports & content</h2>
          <p className="text-muted-foreground">
            You retain ownership of photos and descriptions you submit. You grant NammaMarga a license
            to display, analyze, and share reports with the public and municipal partners for civic
            resolution purposes.
          </p>

          <h2 className="text-xl font-semibold mt-8">Emergency routing</h2>
          <p className="text-muted-foreground">
            Green corridor routes are recommendations based on available civic data and Mapbox
            directions. They do not replace professional emergency dispatch. Always call official
            emergency services (e.g. 108) in life-threatening situations.
          </p>

          <h2 className="text-xl font-semibold mt-8">Privacy</h2>
          <p className="text-muted-foreground">
            Your use is also governed by our{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold mt-8">Disclaimer</h2>
          <p className="text-muted-foreground">
            NammaMarga is provided &quot;as is&quot;. We do not guarantee uninterrupted service, perfect AI
            accuracy, or that all reported issues will be resolved by authorities.
          </p>

          <h2 className="text-xl font-semibold mt-8">Changes</h2>
          <p className="text-muted-foreground">
            We may update these terms. Continued use after changes constitutes acceptance of the
            revised terms.
          </p>
        </div>
      </AnimationContainer>
    </MaxWidthWrapper>
  );
};

export default TermsPage;
