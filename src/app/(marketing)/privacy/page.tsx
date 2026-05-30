import { AnimationContainer, MaxWidthWrapper } from "@/components";
import Link from "next/link";

const PrivacyPage = () => {
  return (
    <MaxWidthWrapper className="py-20">
      <AnimationContainer delay={0.1}>
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="text-3xl md:text-4xl font-bold font-heading">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

          <p className="text-muted-foreground leading-relaxed mt-6">
            At <strong>NammaMarg</strong>, we respect your privacy. This policy describes how we collect,
            use, and protect information when you use our civic road intelligence platform for
            Bengaluru.
          </p>

          <h2 className="text-xl font-semibold mt-8">Information we collect</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Account details (name, email) when you sign up as a citizen or BBMP user</li>
            <li>Issue reports including photos, descriptions, and GPS location</li>
            <li>Emergency route requests (pickup location, vehicle type, destination hospital)</li>
            <li>Usage data such as pages visited and features used</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">How we use your data</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Classify and display civic issues on public maps</li>
            <li>Route complaints to the correct ward and priority queue</li>
            <li>Score emergency routes against pothole and hazard data</li>
            <li>Send notifications about issue status and verifications</li>
            <li>Improve AI models for issue detection and fix verification</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">Location data</h2>
          <p className="text-muted-foreground">
            Location is essential for mapping issues and emergency routing. We only use coordinates
            you provide through reports, search, or device GPS when you explicitly allow it.
          </p>

          <h2 className="text-xl font-semibold mt-8">Sharing</h2>
          <p className="text-muted-foreground">
            Issue reports may be visible to other citizens and BBMP officials. We do not sell personal
            data. Service providers (hosting, maps, AI) process data only to operate the platform.
          </p>

          <h2 className="text-xl font-semibold mt-8">Your rights</h2>
          <p className="text-muted-foreground">
            You may request access, correction, or deletion of your account data by contacting us.
            Emergency route planning without an account stores minimal data in session only.
          </p>

          <h2 className="text-xl font-semibold mt-8">Contact</h2>
          <p className="text-muted-foreground">
            Questions about this policy? Reach out via our{" "}
            <Link href="/resources/help" className="underline">
              help center
            </Link>
            .
          </p>
        </div>
      </AnimationContainer>
    </MaxWidthWrapper>
  );
};

export default PrivacyPage;
