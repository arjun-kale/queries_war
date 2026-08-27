"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PARTICIPANT_KEY = "queries-war-participant-id";
const PARTICIPANT_TOKEN_KEY = "queries-war-participant-token";

export default function RegisterPage() {
  const contest = useQuery(api.contests.getForRegistration);
  const createParticipant = useMutation(api.participants.create);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      if (!contest) throw new Error("Registration is not open yet.");
      const { participantId, participantToken } = await createParticipant({ contestId: contest._id, name, email });
      // A new registration always replaces any stale registration left on this device.
      window.localStorage.setItem(PARTICIPANT_KEY, participantId);
      window.localStorage.setItem(PARTICIPANT_TOKEN_KEY, participantToken);
      window.location.assign("/contest");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not register.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="font-heading text-2xl">Enter Queries War</CardTitle>
          <CardDescription>{contest?.title ?? "The next SQL contest"} · 15 questions · 60 minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" placeholder="Asha Nair" /></label>
            <label className="grid gap-2 text-sm font-medium">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" placeholder="asha@example.com" /></label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={isSubmitting || contest === undefined}>
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
              {contest === undefined ? "Loading contest…" : "Start contest"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
