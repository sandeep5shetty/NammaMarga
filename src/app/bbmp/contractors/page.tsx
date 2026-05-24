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

export default async function ContractorsPage() {
  const contractors = await db.contractor.findMany({
    orderBy: { rating: "desc" },
    include: { _count: { select: { issues: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Contractor Management</h1>
        <p className="text-muted-foreground mt-1">Track contractor performance and assignments</p>
      </div>

      {contractors.length === 0 ? (
        <p className="text-muted-foreground">
          No contractors yet. Seed demo data or add via Prisma Studio.
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Active Issues</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.company ?? c.name}</TableCell>
                  <TableCell>{c.email ?? c.phone ?? "—"}</TableCell>
                  <TableCell>{c.rating.toFixed(1)} ★</TableCell>
                  <TableCell>{c.completedJobs}</TableCell>
                  <TableCell>{c._count.issues}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "default" : "secondary"}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
