"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { CheckCircle2, Home, LoaderCircle, Sparkles, Trophy, Clock, Code2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

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
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <Card className="text-center overflow-hidden border-primary/20 shadow-xl shadow-primary/5">
          <div className="bg-primary/5 p-6 border-b">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-8" />
            </div>
            <CardTitle className="font-heading text-3xl font-semibold">
              Contest Submitted!
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
      </div>
    </main>
  );
}
