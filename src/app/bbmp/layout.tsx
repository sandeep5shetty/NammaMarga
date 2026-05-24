import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAuthority } from "@/lib/auth/get-user";

export default async function BbmpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthority();

  return <DashboardShell variant="bbmp">{children}</DashboardShell>;
}
