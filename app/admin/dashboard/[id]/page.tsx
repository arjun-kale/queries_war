"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, CircleAlert, Clock, Code, LoaderCircle, Shield, ShieldCheck, ShieldX, UserCheck, UserX } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_KEY = "queries-war-admin-token";

export default function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const participantId = resolvedParams.id as Id<"participants">;

  const [token] = useState<string | undefined>(() =>
    typeof window === "undefined"
      ? undefined
      : localStorage.getItem(ADMIN_KEY) ?? undefined,
  );

  useEffect(() => {
    if (!token) location.replace("/admin/login");
  }, [token]);

  const validSession = useQuery(
    api.admin.check,
    token ? { adminToken: token } : "skip",
  );

  const participant = useQuery(
    api.admin.participantDetail,
    token && validSession === true ? { adminToken: token, participantId } : "skip",
  );

  const submissions = useQuery(
    api.admin.participantSubmissions,
    token && validSession === true ? { adminToken: token, participantId } : "skip",
  );

  const identityPhotoUrl = useQuery(
    api.admin.participantIdentityPhotoUrl,
    token && validSession === true ? { adminToken: token, participantId } : "skip",
  );

  const setDisqualified = useMutation(api.admin.setDisqualified);
  const [actionMessage, setActionMessage] = useState<string>();

  useEffect(() => {
    if (validSession === false) {
      localStorage.removeItem(ADMIN_KEY);
      location.replace("/admin/login?expired=1");
    }
  }, [validSession]);

  if (!token || validSession !== true || participant === undefined || submissions === undefined) {
    return (
      <main className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircle className="animate-spin" />
        Loading participant details…
      </main>
    );
  }

  if (!participant) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Participant not found.</p>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="size-4 mr-2" /> Back to admin
          </Link>
        </Button>
      </main>
    );
  }

  async function handleToggleDisqualify() {
    if (!token || !participant) return;
    const actionLabel = participant.isDisqualified
      ? `lift the disqualification for ${participant.name}`
      : `DISQUALIFY ${participant.name} from the contest`;

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) {
      return;
    }

    try {
      await setDisqualified({
        adminToken: token,
        participantId: participant._id,
        isDisqualified: !participant.isDisqualified,
      });
      setActionMessage(
        !participant.isDisqualified
          ? "Participant has been disqualified."
          : "Disqualification has been lifted.",
      );
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Could not update disqualification.",
      );
    }
  }

  return (
    <main className="min-h-svh bg-muted/30 pb-12">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="size-4 mr-1.5" /> Back to admin
              </Link>
            </Button>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <p className="font-heading text-lg font-semibold">Participant drilldown</p>
            </div>
          </div>
          <Button
            variant={participant.isDisqualified ? "outline" : "destructive"}
            size="sm"
            onClick={handleToggleDisqualify}
          >
            {participant.isDisqualified ? (
              <>
                <UserCheck className="size-4 mr-1.5" /> Requalify participant
              </>
            ) : (
              <>
                <UserX className="size-4 mr-1.5" /> Disqualify participant
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        {actionMessage && (
          <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
            {actionMessage}
          </div>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-2xl">{participant.name}</CardTitle>
                <CardDescription className="text-sm font-mono mt-1">
                  {participant.email}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {participant.isDisqualified ? (
                  <Badge variant="destructive">Disqualified</Badge>
                ) : participant.finishedAt ? (
                  <Badge variant="outline">Finished</Badge>
                ) : (
                  <Badge variant="secondary">In progress</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs text-muted-foreground">Total score</p>
                <p className="mt-1 font-heading text-2xl font-bold text-primary">
                  {participant.totalScore} pts
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs text-muted-foreground">Submissions count</p>
                <p className="mt-1 font-heading text-2xl font-bold">
                  {participant.submissionCount}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs text-muted-foreground">Tab switches</p>
                <p className="mt-1 font-heading text-2xl font-bold">
                  {participant.tabSwitchCount}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs text-muted-foreground">Paste attempts</p>
                <p className="mt-1 font-heading text-2xl font-bold">
                  {participant.pasteAttemptCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Identity verification</CardTitle>
              <CardDescription>
                One-time photo captured at contest start, for dispute evidence only.
              </CardDescription>
            </div>
            {participant.hasIdentityPhoto ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> Verified
              </Badge>
            ) : participant.identityVerificationSkipped ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <ShieldX className="size-3.5" /> Skipped
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </CardHeader>
          <CardContent>
            {participant.hasIdentityPhoto ? (
              identityPhotoUrl === undefined ? (
                <p className="text-sm text-muted-foreground">Loading photo…</p>
              ) : identityPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={identityPhotoUrl}
                  alt={`Identity verification photo for ${participant.name}`}
                  className="max-h-80 rounded-lg border object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Photo could not be loaded (it may have been removed from storage).
                </p>
              )
            ) : participant.identityVerificationSkipped ? (
              <p className="text-sm text-muted-foreground">
                This participant skipped identity verification (camera unavailable or denied).
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This participant has not reached the verification step yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission history</CardTitle>
            <CardDescription>
              Full chronological log of all queries submitted by this participant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No submissions recorded yet for this participant.
              </p>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div
                    key={sub._id}
                    className={`rounded-lg border p-4 transition-colors ${
                      sub.isCorrect
                        ? "border-primary/30 bg-primary/5"
                        : "border-destructive/20 bg-destructive/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        {sub.isCorrect ? (
                          <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                            <Check className="size-3.5" />
                          </div>
                        ) : (
                          <div className="flex size-6 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                            <CircleAlert className="size-3.5" />
                          </div>
                        )}
                        <span className="font-semibold text-sm">
                          Q{sub.questionOrder}: {sub.questionTitle}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Attempt #{sub.attemptNumber}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(sub.submittedAt).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold font-mono text-sm text-foreground">
                          +{sub.pointsAwarded} pts
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Code className="size-3.5" />
                        <span>Submitted SQL</span>
                      </div>
                      <pre className="overflow-x-auto rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                        {sub.submittedQuery}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
