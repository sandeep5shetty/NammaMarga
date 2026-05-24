import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell variant="citizen">{children}</DashboardShell>;
}
