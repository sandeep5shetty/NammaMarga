import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import {
  Ambulance,
  ArrowRightIcon,
  Camera,
  MapPin,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export const CARDS = [
  {
    Icon: Camera,
    name: "AI issue reporting",
    description: "Snap a photo — AI classifies potholes, garbage, and road damage instantly.",
    href: "/report",
    cta: "Report now",
    className: "col-span-3 lg:col-span-1",
    accent: "emerald" as const,
    background: (
      <Card className="absolute top-10 left-10 origin-top rounded-none rounded-tl-md transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_0%,#000_100%)] group-hover:scale-105 border border-border border-r-0 bg-card/95 shadow-md dark:bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm">Pothole detected</CardTitle>
          <CardDescription>High severity · Koramangala Ward 9</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge className="bg-red-500 text-white border-0 hover:bg-red-500">CRITICAL</Badge>
          <p className="text-xs text-muted-foreground">AI confidence 94%</p>
        </CardContent>
      </Card>
    ),
  },
  {
    Icon: MapPin,
    name: "Live civic map",
    description: "Heatmaps, ward filters, and road health layers across Bengaluru.",
    href: "/map",
    cta: "Explore map",
    className: "col-span-3 lg:col-span-2",
    accent: "sky" as const,
    background: (
      <div className="absolute right-6 top-8 w-[75%] space-y-2 transition-all duration-300 group-hover:-translate-x-2 [mask-image:linear-gradient(to_top,transparent_30%,#000_100%)]">
        {["Hebbal — 14 potholes", "Indiranagar — 9 potholes", "BTM — 12 potholes", "Whitefield — 7 potholes"].map(
          (ward) => (
            <div
              key={ward}
              className="flex items-center justify-between rounded-md border border-border bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur-sm dark:bg-background/80"
            >
              <span className="text-foreground font-medium">{ward}</span>
              <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            </div>
          ),
        )}
      </div>
    ),
  },
  {
    Icon: Ambulance,
    name: "Emergency routing",
    description: "Green corridor routes ambulances around potholes using live civic data.",
    href: "/emergency-route",
    cta: "Plan route",
    className: "col-span-3 lg:col-span-2 max-w-full overflow-hidden",
    accent: "green" as const,
    background: (
      <div className="absolute right-4 top-6 w-[85%] space-y-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/90 shadow-sm transition-all group-hover:scale-105 dark:border-green-500/30 dark:bg-green-500/10 [mask-image:linear-gradient(to_top,transparent_20%,#000_100%)]">
        <p className="text-xs font-medium text-emerald-700 dark:text-green-400">Green corridor</p>
        <p className="text-[10px] text-muted-foreground">3 potholes vs 11 on fastest route</p>
        <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden dark:bg-muted">
          <div className="h-full w-2/3 bg-emerald-500 rounded-full dark:bg-green-500" />
        </div>
      </div>
    ),
  },
  {
    Icon: Shield,
    name: "BBMP dashboard",
    description: "Ward queues, contractor assignment, and resolution analytics for officials.",
    href: "/auth/bbmp/sign-in",
    cta: "BBMP login",
    className: "col-span-3 lg:col-span-1",
    accent: "amber" as const,
    background: (
      <Card className="absolute right-2 top-10 origin-top rounded-md border border-border bg-card/95 shadow-md transition-all group-hover:scale-105 dark:bg-card/80 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ward queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <p>12 critical · 28 high</p>
          <p>Avg resolution 4.2 days</p>
        </CardContent>
      </Card>
    ),
  },
];

const accentIconClass: Record<string, string> = {
  emerald: "text-emerald-600 dark:text-emerald-500/80",
  sky: "text-sky-600 dark:text-sky-500/80",
  green: "text-emerald-600 dark:text-green-500/80",
  amber: "text-amber-600 dark:text-amber-500/80",
};

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  accent = "emerald",
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  href: string;
  cta: string;
  accent?: keyof typeof accentIconClass;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl border border-border",
      "bg-gradient-to-br from-card via-card to-muted/30",
      "shadow-sm hover:shadow-md hover:border-primary/20",
      "dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900/80",
      "dark:shadow-none dark:hover:border-border/80",
      "dark:[box-shadow:0_-20px_80px_-20px_#ffffff0f_inset]",
      "transition-all duration-300",
      className,
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <Icon
        className={cn(
          "h-11 w-11 origin-left transition-all duration-300 ease-in-out group-hover:scale-75",
          accentIconClass[accent] ?? accentIconClass.emerald,
        )}
      />
      <h3 className="text-xl font-semibold text-foreground">{name}</h3>
      <p className="max-w-lg text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>

    <div className="absolute bottom-0 flex w-full translate-y-10 flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 z-20">
      <Link
        href={href}
        className={buttonVariants({
          size: "sm",
          variant: "secondary",
          className: "cursor-pointer bg-background/90 backdrop-blur-sm shadow-sm",
        })}
      >
        {cta}
        <ArrowRightIcon className="ml-2 h-4 w-4" />
      </Link>
    </div>
    <div className="pointer-events-none absolute inset-0 transition-all duration-300 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 dark:from-black/20" />
  </div>
);

export { BentoCard, BentoGrid };
