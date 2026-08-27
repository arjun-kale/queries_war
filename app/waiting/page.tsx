"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Clock, Code2, LoaderCircle, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

const PARTICIPANT_KEY = "queries-war-participant-id";
const PARTICIPANT_TOKEN_KEY = "queries-war-participant-token";

export default function WaitingRoomPage() {
  const [participantId] = useState<Id<"participants"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = window.localStorage.getItem(PARTICIPANT_KEY);
    return stored ? (stored as Id<"participants">) : undefined;
  });
  const [participantToken] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? undefined;
  });

  useEffect(() => {
    if (!participantId || !participantToken) {
      window.location.replace("/register");
    }
  }, [participantId, participantToken]);

  const participant = useQuery(
    api.participants.get,
    participantId && participantToken
      ? { participantId, participantToken }
      : "skip",
  );
  const contestData = useQuery(api.contests.getActive);
  const serverTime = useQuery(api.contests.serverTime);

  const [remainingMs, setRemainingMs] = useState<number>();
  const redirecting = useRef(false);
  const clockOffset = useRef(0);

  useEffect(() => {
    if (!contestData?.contest || serverTime === undefined) return;
    clockOffset.current = serverTime - Date.now();

    const startTime = contestData.contest.startTime;
    const tick = () => {
      const now = Date.now() + clockOffset.current;
      const diff = startTime - now;

      if (diff <= 0) {
        setRemainingMs(0);
        if (!redirecting.current) {
          redirecting.current = true;
          window.location.replace("/contest");
        }
      } else {
        setRemainingMs(diff);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [contestData?.contest, serverTime]);

  if (!participantId || participant === undefined || contestData === undefined) {
    return (
      <main className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircle className="animate-spin" />
        Loading waiting room…
      </main>
    );
  }

  if (!participant) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Registration not found. Returning to registration…</p>
      </main>
    );
  }

  const hours = remainingMs ? Math.floor(remainingMs / 3600000) : 0;
  const minutes = remainingMs ? Math.floor((remainingMs % 3600000) / 60000) : 0;
  const seconds = remainingMs ? Math.floor((remainingMs % 60000) / 1000) : 0;

  const formattedCountdown =
    remainingMs === undefined
      ? "--:--:--"
      : hours > 0
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <Card className="text-center overflow-hidden border-primary/20 shadow-xl shadow-primary/5">
          <div className="bg-primary/5 p-6 border-b">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="font-heading text-2xl">You are registered!</CardTitle>
            <CardDescription className="mt-1">
              Welcome, <span className="font-semibold text-foreground">{participant.name}</span>. The contest will begin shortly.
            </CardDescription>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Contest Starts In
              </p>
              <div className="flex items-center justify-center gap-2 font-mono text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                <Clock className="size-8 sm:size-10" />
                {formattedCountdown}
              </div>
              <p className="text-xs text-muted-foreground">
                You will be redirected automatically when the timer reaches zero.
              </p>
            </div>

            <div className="grid gap-3 pt-2 text-left sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-3.5">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Code2 className="size-4 text-primary" />
                  <span>15 SQL Challenges</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Easy to hard questions testing filtering, joins, aggregates, and window functions.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3.5">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Trophy className="size-4 text-primary" />
                  <span>Live Leaderboard</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Points awarded on correct submissions. Faster times win tie-breaks.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>Keep this tab open while you wait.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
