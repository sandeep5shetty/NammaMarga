import { AnimationContainer, MaxWidthWrapper } from "@/components";

const CHANGELOG = [
  {
    date: "May 2025",
    title: "Emergency green corridor",
    body: "Pothole-aware routing to hospitals with route comparison and fullscreen map — no login required.",
  },
  {
    date: "May 2025",
    title: "BBMP dashboard",
    body: "Ward priority queue, analytics, contractor assignment, and road health scoring.",
  },
  {
    date: "May 2025",
    title: "Citizen reporting",
    body: "AI classification, duplicate detection, and live civic map with heatmaps.",
  },
  {
    date: "May 2025",
    title: "Community verification",
    body: "Before/after AI checks and leaderboard for active verifiers.",
  },
];

const ChangeLogPage = () => {
  return (
    <MaxWidthWrapper className="py-20">
      <AnimationContainer delay={0.1} className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold font-heading text-center">
          Changelog
        </h1>
        <p className="text-base md:text-lg mt-6 text-center text-muted-foreground">
          What&apos;s new in NammaMarga for Bengaluru civic infrastructure.
        </p>
        <ul className="mt-12 space-y-8">
          {CHANGELOG.map((entry) => (
            <li key={entry.title} className="border-b border-border pb-8 last:border-0">
              <p className="text-sm text-muted-foreground">{entry.date}</p>
              <h2 className="text-lg font-semibold mt-1">{entry.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{entry.body}</p>
            </li>
          ))}
        </ul>
      </AnimationContainer>
    </MaxWidthWrapper>
  );
};

export default ChangeLogPage;
