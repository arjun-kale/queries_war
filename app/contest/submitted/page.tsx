"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Home,
  LoaderCircle,
  Sparkles,
  Trophy,
  Clock,
  Code2,
  XCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PARTICIPANT_KEY = "queries-war-participant-id";
const PARTICIPANT_TOKEN_KEY = "queries-war-participant-token";

export default function ContestSubmittedPage() {
  const [participantId] = useState<Id<"participants"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = window.localStorage.getItem(PARTICIPANT_KEY);
    return stored ? (stored as Id<"participants">) : undefined;
  });
  const [participantToken] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? undefined;
  });

  const participant = useQuery(
    api.participants.get,
    participantId && participantToken
      ? { participantId, participantToken }
      : "skip",
  );

  const submissions = useQuery(
    api.participants.mySubmissions,
    participantId && participantToken
      ? { participantId, participantToken }
      : "skip",
  );

  const durationSeconds =
    participant?.startedAt && participant?.finishedAt
      ? Math.max(0, Math.round((participant.finishedAt - participant.startedAt) / 1000))
      : undefined;

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <Card className="text-center overflow-hidden border-primary/20 shadow-xl shadow-primary/5">
          <div className="bg-primary/5 p-6 border-b">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-8" />
            </div>
            <CardTitle className="font-heading text-3xl font-semibold">
              Contest Finished!
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {participant?.name
                ? `Great job, ${participant.name}! Your SQL answers have been recorded.`
                : "Your SQL answers have been recorded and graded."}
            </CardDescription>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {participant === undefined && participantId ? (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <LoaderCircle className="animate-spin" /> Calculating final score…
              </div>
            ) : participant ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                  <div className="flex justify-center text-primary mb-1">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Final Score</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-primary">
                    {participant.totalScore ?? 0} pts
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4 text-center">
                  <div className="flex justify-center text-muted-foreground mb-1">
                    <Code2 className="size-4" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Submissions</p>
                  <p className="mt-1 font-heading text-2xl font-bold">
                    {participant.submissionCount ?? 0}
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4 text-center">
                  <div className="flex justify-center text-muted-foreground mb-1">
                    <Clock className="size-4" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Time Taken</p>
                  <p className="mt-1 font-heading text-2xl font-bold">
                    {durationSeconds !== undefined ? formatDuration(durationSeconds) : "--"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3 pt-2">
              <Button size="lg" className="w-full" asChild>
                <Link href="/contest/leaderboard">
                  <Trophy className="size-5 mr-2" /> View Live Leaderboard
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">
                  <Home className="size-4 mr-2" /> Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {submissions && submissions.length > 0 && (
          <Card className="text-left">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Question Results Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Detailed record of all graded submissions for your session
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {submissions.map((sub) => (
                <div
                  key={sub._id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {sub.isCorrect ? (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        Q{sub.questionOrder}. {sub.questionTitle}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 capitalize",
                            sub.difficulty === "easy"
                              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : sub.difficulty === "medium"
                                ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "border-rose-500/30 text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {sub.difficulty}
                        </Badge>
                        <span>Attempt #{sub.attemptNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        sub.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      +{sub.pointsAwarded} pts
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      of {sub.points} max
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
