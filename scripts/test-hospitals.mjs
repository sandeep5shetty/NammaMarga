import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const rows = await db.hospital.findMany({ take: 3 });
  console.log("count ok:", rows.length);
  if (rows[0]) console.log(rows[0].name, rows[0].kind);
} catch (e) {
  console.error("FAILED:", e.message);
  if (e.meta) console.error(e.meta);
} finally {
  await db.$disconnect();
}
