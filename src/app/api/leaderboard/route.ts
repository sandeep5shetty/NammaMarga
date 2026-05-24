import { getAuthUser } from "@/lib/auth/get-user";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

function getRankTier(reputation: number) {
  if (reputation >= 300) return "Bangalore Hero";
  if (reputation >= 150) return "Civic Champion";
  if (reputation >= 50) return "Active Citizen";
  if (reputation >= 10) return "Reporter";
  return "Newcomer";
}

export async function GET() {
  try {
    const currentUser = await getAuthUser();

    const citizens = await db.user.findMany({
      where: { role: "CITIZEN" },
      orderBy: [{ reputation: "desc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        reputation: true,
        badges: true,
        createdAt: true,
        _count: {
          select: {
            issues: true,
            verifications: true,
          },
        },
      },
    });

    const leaderboard = citizens.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.name ?? "Anonymous Citizen",
      email: user.email,
      image: user.image,
      reputation: user.reputation,
      reportsCount: user._count.issues,
      verificationsCount: user._count.verifications,
      badges: user.badges.length > 0 ? user.badges : [getRankTier(user.reputation)],
      tier: getRankTier(user.reputation),
    }));

    let currentUserEntry = null;
    if (currentUser) {
      const rankIndex = citizens.findIndex((u) => u.id === currentUser.id);
      if (rankIndex >= 0) {
        currentUserEntry = leaderboard[rankIndex];
      } else if (currentUser.role === "CITIZEN") {
        const higherCount = await db.user.count({
          where: {
            role: "CITIZEN",
            OR: [
              { reputation: { gt: currentUser.reputation } },
              {
                reputation: currentUser.reputation,
                createdAt: { lt: currentUser.createdAt },
              },
            ],
          },
        });

        const userWithCounts = await db.user.findUnique({
          where: { id: currentUser.id },
          include: {
            _count: { select: { issues: true, verifications: true } },
          },
        });

        currentUserEntry = {
          rank: higherCount + 1,
          id: currentUser.id,
          name: currentUser.name ?? "Anonymous Citizen",
          email: currentUser.email,
          image: currentUser.image,
          reputation: currentUser.reputation,
          reportsCount: userWithCounts?._count.issues ?? 0,
          verificationsCount: userWithCounts?._count.verifications ?? 0,
          badges:
            currentUser.badges.length > 0
              ? currentUser.badges
              : [getRankTier(currentUser.reputation)],
          tier: getRankTier(currentUser.reputation),
        };
      }
    }

    const totalCitizens = await db.user.count({ where: { role: "CITIZEN" } });

    return NextResponse.json({
      data: {
        leaderboard,
        currentUser: currentUserEntry,
        totalCitizens,
        scoring: {
          reportIssue: 10,
          verifyFix: 25,
        },
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
