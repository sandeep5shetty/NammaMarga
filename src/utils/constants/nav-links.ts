import {
  BarChart3Icon,
  CameraIcon,
  MapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

export const NAV_LINKS = [
  {
    title: "Platform",
    href: "/features",
    menu: [
      {
        title: "Report Issues",
        tagline: "Snap a photo and let AI classify civic problems instantly.",
        href: "/report",
        icon: CameraIcon,
      },
      {
        title: "Live Civic Map",
        tagline: "Explore geo-tagged issues across Bangalore wards.",
        href: "/map",
        icon: MapIcon,
      },
      {
        title: "AI Analytics",
        tagline: "Ward-wise heatmaps, trends, and resolution insights.",
        href: "/bbmp/analytics",
        icon: BarChart3Icon,
      },
      {
        title: "Verification",
        tagline: "Citizens verify fixes with AI-powered before/after checks.",
        href: "/dashboard",
        icon: ShieldCheckIcon,
      },
    ],
  },
  {
    title: "Map",
    href: "/map",
  },
  {
    title: "Report",
    href: "/report",
  },
  {
    title: "For BBMP",
    href: "/auth/bbmp/sign-in",
  },
  {
    title: "Resources",
    href: "/resources",
    menu: [
      {
        title: "Help Center",
        tagline: "Learn how to report and track civic issues.",
        href: "/resources/help",
        icon: UsersIcon,
      },
      {
        title: "Changelog",
        tagline: "Latest updates to the NammaMarg platform.",
        href: "/changelog",
        icon: SparklesIcon,
      },
    ],
  },
];
