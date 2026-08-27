"use client";

import Link from "next/link";
import { ArrowLeft, EyeOff, Home, LoaderCircle, Trophy } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const PARTICIPANT_KEY = "queries-war-participant-id";

export default function LeaderboardPage() {
  const [participantId] = useState<Id<"participants"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return (localStorage.getItem(PARTICIPANT_KEY) as Id<"participants">) || undefined;
  });
  const contest = useQuery(api.contests.getActive);

  if (contest === undefined) return <State message="Loading leaderboard…" />;
  if (!contest) {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 bg-muted/30 px-4">
        <Card className="max-w-md text-center p-6">
          <CardTitle className="font-heading text-xl">No Active Contest</CardTitle>
          <CardDescription className="mt-2">
            There is no active contest running at the moment.
          </CardDescription>
          <Button className="mt-4" asChild>
            <Link href="/">
              <Home className="size-4 mr-2" /> Return to Home
            </Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contest">
              <ArrowLeft className="size-4 mr-1.5" /> Back to contest
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <Home className="size-4 mr-1.5" /> Home
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="size-6" />
            </div>
            <CardTitle className="font-heading text-2xl">Live Leaderboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              {contest.contest.title} · Live rankings updated as submissions arrive
            </p>
          </CardHeader>
          <CardContent>
            {!contest.contest.leaderboardVisible ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <EyeOff className="size-8 text-muted-foreground/60 mb-2" />
                <p className="font-medium text-foreground">Leaderboard is currently hidden</p>
                <p className="text-xs max-w-sm">
                  The contest organizer has configured scores to remain private during this stage of the competition.
                </p>
              </div>
            ) : (
              <LeaderboardTable
                contestId={contest.contest._id}
                participantId={participantId}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function State({ message }: { message: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
      <LoaderCircle className="animate-spin" />
      {message}
    </main>
  );
}
