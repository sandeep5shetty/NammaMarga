import { EmergencyRouteExperience } from "@/components/routing/emergency-route-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency Green Corridor | NammaMarg",
  description:
    "Find the safest ambulance route in Bengaluru — no login required. Avoid potholes with AI-scored green corridors.",
};

export default function PublicEmergencyRoutePage() {
  return <EmergencyRouteExperience variant="public" />;
}
