"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_AVATAR_URL } from "@/utils/constants/misc";
import { cn } from "@/utils";
import { Camera, Crown, Medal, Target, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";

type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  reputation: number;
  reportsCount: number;
  verificationsCount: number;
  badges: string[];
  tier: string;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalCitizens: number;
  scoring: { reportIssue: number; verifyFix: number };
};

const podiumStyles = [
  { ring: "ring-amber-400/60", bg: "bg-amber-500/10", icon: Crown, label: "1st" },
  { ring: "ring-slate-400/60", bg: "bg-slate-500/10", icon: Medal, label: "2nd" },
  { ring: "ring-orange-400/60", bg: "bg-orange-500/10", icon: Medal, label: "3rd" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PodiumCard({
  entry,
  style,
  height,
}: {
  entry: LeaderboardEntry;
  style: (typeof podiumStyles)[number];
  height: string;
}) {
  const Icon = style.icon;

  return (
    <div className={cn("flex flex-col items-center", height)}>
      <div
        className={cn(
          "relative flex flex-col items-center rounded-2xl border border-border p-4 w-full max-w-[220px] transition-colors duration-300",
          style.bg,
          "ring-2",
          style.ring,
        )}
      >
        <div className="absolute -top-3 rounded-full bg-background px-2 py-0.5 text-xs font-medium border border-border">
          {style.label}
        </div>
        <Avatar className="h-16 w-16 mb-3 ring-2 ring-background">
          <AvatarImage src={entry.image ?? `${DEFAULT_AVATAR_URL}${entry.name}`} />
          <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold text-center truncate w-full">{entry.name}</p>
        <Badge variant="secondary" className="mt-1">{entry.tier}</Badge>
        <div className="flex items-center gap-1 mt-3 text-emerald-500 font-bold text-xl">
          <Trophy className="h-4 w-4" />
          {entry.reputation}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {entry.reportsCount} reports · {entry.verificationsCount} verifications
        </p>
        <Icon className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/60" />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const topThree = data?.leaderboard.slice(0, 3) ?? [];
  const rest = data?.leaderboard.slice(3) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Civic Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Compete with fellow citizens by reporting issues and verifying fixes across Bangalore.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total citizens</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {data?.totalCitizens ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Points per report</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Camera className="h-5 w-5 text-muted-foreground" />
              +{data?.scoring.reportIssue ?? 10}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Points per verification</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              +{data?.scoring.verifyFix ?? 25}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {data?.currentUser && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                #{data.currentUser.rank}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={data.currentUser.image ?? `${DEFAULT_AVATAR_URL}${data.currentUser.name}`}
                />
                <AvatarFallback>{getInitials(data.currentUser.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Your rank</p>
                <p className="text-sm text-muted-foreground">
                  {data.currentUser.reputation} reputation · {data.currentUser.tier}
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{data.currentUser.reportsCount} reports</span>
              <span>{data.currentUser.verificationsCount} verifications</span>
            </div>
          </CardContent>
        </Card>
      )}

      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
          {topThree[1] && (
            <PodiumCard entry={topThree[1]} style={podiumStyles[1]} height="md:mt-8" />
          )}
          {topThree[0] && (
            <PodiumCard entry={topThree[0]} style={podiumStyles[0]} height="" />
          )}
          {topThree[2] && (
            <PodiumCard entry={topThree[2]} style={podiumStyles[2]} height="md:mt-12" />
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All rankings</CardTitle>
          <CardDescription>Top civic contributors in Bangalore</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Citizen</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                  <TableHead className="text-right">Verifications</TableHead>
                  <TableHead className="text-right">Reputation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.length === 0 && topThree.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No citizens on the leaderboard yet. Be the first to report an issue!
                    </TableCell>
                  </TableRow>
                ) : (
                  [...topThree, ...rest].map((entry) => {
                    const isCurrentUser = data?.currentUser?.id === entry.id;
                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(isCurrentUser && "bg-emerald-500/5")}
                      >
                        <TableCell className="font-medium">
                          {entry.rank <= 3 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                              {entry.rank}
                            </span>
                          ) : (
                            entry.rank
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={entry.image ?? `${DEFAULT_AVATAR_URL}${entry.name}`}
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(entry.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{entry.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.tier}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{entry.reportsCount}</TableCell>
                        <TableCell className="text-right">{entry.verificationsCount}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {entry.reputation}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
