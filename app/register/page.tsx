"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, ArrowRight, LoaderCircle, ShieldCheck, UserCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PARTICIPANT_KEY = "queries-war-participant-id";
const PARTICIPANT_TOKEN_KEY = "queries-war-participant-token";

export default function RegisterPage() {
  const contest = useQuery(api.contests.getForRegistration);
  const serverTime = useQuery(api.contests.serverTime);
  const createParticipant = useMutation(api.participants.create);

  const [existingId] = useState<Id<"participants"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = window.localStorage.getItem(PARTICIPANT_KEY);
    return stored ? (stored as Id<"participants">) : undefined;
  });
  const [existingToken] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? undefined;
  });

  const existingParticipant = useQuery(
    api.participants.get,
    existingId && existingToken ? { participantId: existingId, participantToken: existingToken } : "skip",
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resume existing session automatically if valid
  useEffect(() => {
    if (!existingParticipant || !contest || serverTime === undefined) return;

    if (existingParticipant.finishedAt) {
      window.location.replace("/contest/submitted");
      return;
    }

    const currentServerTime = Date.now() + (serverTime - Date.now());
    if (currentServerTime < contest.startTime) {
      window.location.replace("/waiting");
    } else {
      window.location.replace("/contest");
    }
  }, [existingParticipant, contest, serverTime]);

  function clearExistingRegistration() {
    window.localStorage.removeItem(PARTICIPANT_KEY);
    window.localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
    window.location.reload();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      if (!contest) throw new Error("Registration is not open right now.");

      // Registration can transiently contend with other concurrent
      // registrations (rate-limit counters share a small number of shards).
      // That contention resolves within milliseconds, so retry a couple of
      // times before surfacing an error — this is expected under a burst of
      // simultaneous sign-ups, not a real failure.
      let lastError: unknown;
      let result: { participantId: Id<"participants">; participantToken: string } | undefined;
      for (let attempt = 0; attempt < 3 && !result; attempt++) {
        try {
          result = await createParticipant({ contestId: contest._id, name, email });
        } catch (attemptError) {
          lastError = attemptError;
          const message = attemptError instanceof Error ? attemptError.message : "";
          const isTransientConflict =
            message.includes("OptimisticConcurrencyControlFailure") ||
            message.includes("changed while this mutation was being run");
          if (!isTransientConflict || attempt === 2) throw attemptError;
          await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
        }
      }
      if (!result) throw lastError;
      const { participantId, participantToken } = result;

      window.localStorage.setItem(PARTICIPANT_KEY, participantId);
      window.localStorage.setItem(PARTICIPANT_TOKEN_KEY, participantToken);

      const now = serverTime ?? Date.now();
      if (now < contest.startTime) {
        window.location.assign("/waiting");
      } else {
        window.location.assign("/contest");
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not register.",
      );
      setIsSubmitting(false);
    }
  }

  const isContestClosed = contest === null;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="font-heading text-2xl">Enter Queries War</CardTitle>
          <CardDescription>
            {contest ? `${contest.title} · 15 questions · ${Math.round(contest.durationSeconds / 60)} minutes` : "Competitive SQL arena"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingParticipant ? (
            <div className="space-y-4 rounded-lg bg-primary/5 p-4 border border-primary/20 text-center">
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                <UserCheck className="size-5" />
                <span>Existing Registration Found</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You are registered as <strong>{existingParticipant.name}</strong> ({existingParticipant.email}).
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => {
                    const now = serverTime ?? Date.now();
                    if (contest && now < contest.startTime) {
                      window.location.assign("/waiting");
                    } else {
                      window.location.assign("/contest");
                    }
                  }}
                >
                  Continue to Contest <ArrowRight className="size-4 ml-1.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={clearExistingRegistration}>
                  Register as someone else
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {isContestClosed && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  <AlertCircle className="size-4 text-destructive shrink-0" />
                  <span>Registration is currently closed. No active contest is open at this moment.</span>
                </div>
              )}

              <label className="grid gap-2 text-sm font-medium">
                Name
                <input
                  required
                  disabled={isContestClosed || isSubmitting}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  placeholder="Asha Nair"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Email
                <input
                  required
                  type="email"
                  disabled={isContestClosed || isSubmitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  placeholder="asha@example.com"
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={isSubmitting || contest === undefined || isContestClosed}
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ArrowRight />
                )}
                {contest === undefined
                  ? "Loading contest…"
                  : isContestClosed
                    ? "Registration closed"
                    : "Enter contest"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
