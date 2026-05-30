import { BarChart3Icon, CameraIcon, MapPinIcon } from "lucide-react";

export const DEFAULT_AVATAR_URL =
  "https://api.dicebear.com/8.x/initials/svg?backgroundType=gradientLinear&backgroundRotation=0,360&seed=";

export const PAGINATION_LIMIT = 10;

export const COMPANIES = [
  { name: "BBMP", logo: "/assets/company-01.svg" },
  { name: "BESCOM", logo: "/assets/company-02.svg" },
  { name: "BWSSB", logo: "/assets/company-03.svg" },
  { name: "BMTC", logo: "/assets/company-04.svg" },
  { name: "Smart City", logo: "/assets/company-05.svg" },
  { name: "Namma Metro", logo: "/assets/company-06.svg" },
] as const;

export const PROCESS = [
  {
    title: "Snap & Report",
    description:
      "Citizens capture civic issues with photos. AI auto-classifies type, severity, and location.",
    icon: CameraIcon,
  },
  {
    title: "Track & Assign",
    description:
      "BBMP authorities monitor wards, assign contractors, and track resolution in real time.",
    icon: MapPinIcon,
  },
  {
    title: "Verify & Improve",
    description:
      "Community verification with AI before/after analysis ensures fixes are genuine.",
    icon: BarChart3Icon,
  },
] as const;

export const FEATURES = [
  {
    title: "AI Issue Classification",
    description: "Instantly identify potholes, garbage, sewage, and more from photos.",
  },
  {
    title: "Geo-tagged Reports",
    description: "Every report is mapped with ward data and GPS coordinates.",
  },
  {
    title: "Duplicate Detection",
    description: "Smart merging prevents duplicate complaints within 50 meters.",
  },
  {
    title: "Citizen Verification",
    description: "Multi-verifier system with AI-powered fix confirmation.",
  },
  {
    title: "BBMP Dashboard",
    description: "Professional admin tools for tenders, contractors, and analytics.",
  },
  {
    title: "Real-time Notifications",
    description: "Stay updated on issue status changes and verification requests.",
  },
] as const;

export const REVIEWS = [
  {
    name: "Priya Sharma",
    username: "@priya_btm",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5,
    review:
      "Reported a massive pothole on 16th Main and BBMP fixed it within a week. The AI classification was spot on!",
  },
  {
    name: "Rajesh Kumar",
    username: "@rajesh_koramangala",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5,
    review:
      "NammaMarga made it so easy to report garbage dumping near my apartment. Love the live map feature.",
  },
  {
    name: "Ananya Reddy",
    username: "@ananya_indiranagar",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    rating: 5,
    review:
      "Verified three streetlight fixes in my ward. The before/after AI check gives me confidence the work is real.",
  },
  {
    name: "Mohammed Ali",
    username: "@ali_shivajinagar",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    rating: 4,
    review:
      "Great civic platform for Bangalore. Duplicate detection saved me from reporting the same pothole twice.",
  },
  {
    name: "Deepa Nair",
    username: "@deepa_jayanagar",
    avatar: "https://randomuser.me/api/portraits/women/28.jpg",
    rating: 5,
    review:
      "As a BBMP volunteer, the analytics dashboard helps us prioritize critical issues by ward. Game changer.",
  },
  {
    name: "Vikram Singh",
    username: "@vikram_whitefield",
    avatar: "https://randomuser.me/api/portraits/men/52.jpg",
    rating: 5,
    review:
      "Finally a civic app that actually works! Reported water leakage and tracked it through to resolution.",
  },
  {
    name: "Lakshmi Devi",
    username: "@lakshmi_hebbal",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
    rating: 5,
    review:
      "Earned reputation badges for verifying fixes in my neighborhood. Makes civic participation rewarding.",
  },
  {
    name: "Arjun Patel",
    username: "@arjun_malleswaram",
    avatar: "https://randomuser.me/api/portraits/men/41.jpg",
    rating: 4,
    review:
      "The ward-wise heatmap showed us exactly where infrastructure problems cluster. Very useful for planning.",
  },
  {
    name: "Sneha Rao",
    username: "@sneha_btm",
    avatar: "https://randomuser.me/api/portraits/women/50.jpg",
    rating: 5,
    review:
      "NammaMarga is what Bangalore needed. Clean UI, fast reporting, and authorities actually respond.",
  },
] as const;

export const CIVIC_STATS = [
  { label: "Issues Reported", value: "12,400+" },
  { label: "Resolution Rate", value: "78%" },
  { label: "Active Citizens", value: "3,200+" },
  { label: "Wards Covered", value: "198" },
] as const;
