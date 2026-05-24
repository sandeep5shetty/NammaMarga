import { db } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CitizensPage() {
  const citizens = await db.user.findMany({
    where: { role: "CITIZEN" },
    orderBy: { reputation: "desc" },
    take: 50,
    include: { _count: { select: { issues: true, verifications: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Citizen Engagement</h1>
        <p className="text-muted-foreground mt-1">Top contributors and reputation leaders</p>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Verifications</TableHead>
              <TableHead>Reputation</TableHead>
              <TableHead>Badges</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {citizens.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name ?? "Anonymous"}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c._count.issues}</TableCell>
                <TableCell>{c._count.verifications}</TableCell>
                <TableCell>{c.reputation}</TableCell>
                <TableCell>
                  {c.badges.length > 0 ? (
                    c.badges.map((b) => (
                      <Badge key={b} variant="secondary" className="mr-1">{b}</Badge>
                    ))
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
