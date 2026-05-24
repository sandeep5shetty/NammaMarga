import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WARDS = [
  { number: 1, name: "Hebbal", zone: "North", latitude: 13.0358, longitude: 77.597 },
  { number: 2, name: "Yelahanka", zone: "North", latitude: 13.1007, longitude: 77.5963 },
  { number: 3, name: "Malleswaram", zone: "Central", latitude: 13.0035, longitude: 77.5647 },
  { number: 4, name: "Rajajinagar", zone: "West", latitude: 12.9915, longitude: 77.5494 },
  { number: 5, name: "Vijayanagar", zone: "West", latitude: 12.9716, longitude: 77.5373 },
  { number: 6, name: "Basavanagudi", zone: "South", latitude: 12.942, longitude: 77.573 },
  { number: 7, name: "Jayanagar", zone: "South", latitude: 12.925, longitude: 77.5938 },
  { number: 8, name: "BTM Layout", zone: "South", latitude: 12.9166, longitude: 77.6101 },
  { number: 9, name: "Koramangala", zone: "South-East", latitude: 12.9279, longitude: 77.6271 },
  { number: 10, name: "Indiranagar", zone: "East", latitude: 12.9784, longitude: 77.6408 },
  { number: 11, name: "Whitefield", zone: "East", latitude: 12.9698, longitude: 77.7499 },
  { number: 12, name: "Mahadevapura", zone: "East", latitude: 12.9912, longitude: 77.6885 },
  { number: 13, name: "Shivajinagar", zone: "Central", latitude: 12.9855, longitude: 77.6033 },
  { number: 14, name: "Chamarajpet", zone: "Central", latitude: 12.9591, longitude: 77.566 },
  { number: 15, name: "Electronic City", zone: "South", latitude: 12.8399, longitude: 77.677 },
];

async function main() {
  for (const ward of WARDS) {
    await prisma.ward.upsert({
      where: { number: ward.number },
      update: {},
      create: ward,
    });
  }

  const contractors = [
    { name: "Raj Infrastructure", company: "Raj Infra Pvt Ltd", email: "raj@infra.com", rating: 4.5, completedJobs: 42 },
    { name: "Green City Works", company: "Green City Works", email: "contact@greencity.in", rating: 4.2, completedJobs: 38 },
    { name: "Bangalore Roads Co", company: "BRC Solutions", email: "info@brc.in", rating: 3.9, completedJobs: 27 },
  ];

  for (const c of contractors) {
    const existing = await prisma.contractor.findFirst({ where: { email: c.email } });
    if (!existing) await prisma.contractor.create({ data: c });
  }

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
