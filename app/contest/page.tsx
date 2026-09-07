"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { runQuery, type QueryResult } from "@/lib/sqlRunner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContestTimer } from "@/components/contest/ContestTimer";
import { QuestionSidebar, type QuestionStatus } from "@/components/contest/QuestionSidebar";
import { ResultTable, type FixtureSummary } from "@/components/contest/ResultTable";
import { SchemaDrawer } from "@/components/contest/SchemaDrawer";
import { IdentityVerification } from "@/components/contest/IdentityVerification";
import { useToast } from "@/components/ui/toast";

const PARTICIPANT_KEY = "queries-war-participant-id";
const PARTICIPANT_TOKEN_KEY = "queries-war-participant-token";

interface SubmissionFeedback {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  attemptNumber: number;
  isLastQuestion: boolean;
}

export default function ContestPage() {
  const { toast } = useToast();

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
    participantId && participantToken ? { participantId, participantToken } : "skip",
  );
  const contestData = useQuery(api.contests.getActive);
  const serverTime = useQuery(api.contests.serverTime);
  const mySubmissions = useQuery(
    api.participants.mySubmissions,
    participantId && participantToken ? { participantId, participantToken } : "skip",
  );
  const submitAnswer = useAction(api.submissions.submit);
  const recordEvent = useMutation(api.participants.recordEvent);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined" || !participantId) return {};
    try {
      const saved = window.localStorage.getItem(`queries-war-drafts-${participantId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [result, setResult] = useState<QueryResult>();
  const [fixtureSummaries, setFixtureSummaries] = useState<FixtureSummary[]>();
  const [submissionFeedback, setSubmissionFeedback] = useState<SubmissionFeedback | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, QuestionStatus>>({});
  const [remaining, setRemaining] = useState<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissIntegrityBanner, setDismissIntegrityBanner] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const redirecting = useRef(false);
  const clockOffset = useRef(0);

  // Keep the camera visibly on (deterrent only) after the identity-check
  // photo is taken, instead of turning it off. No further photos or video
  // are captured from this stream — it only feeds the small live preview.
  useEffect(() => {
    if (cameraStream && cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = cameraStream;
      void cameraPreviewRef.current.play();
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  // The contest-ended screen renders on the same page mount (no navigation),
  // so it wouldn't otherwise trigger the unmount cleanup above. This only
  // stops the tracks (a side effect); the preview's visibility is derived
  // from contest state below rather than cleared via setState here.
  useEffect(() => {
    if (contestData && !contestData.contest.isActive && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
  }, [contestData, cameraStream]);

  const showCameraPreview = Boolean(cameraStream && contestData?.contest.isActive);

  const questions = contestData?.questions ?? [];
  const question = questions[currentIndex];
  const fixtures: string[] = question
    ? question.testCases && question.testCases.length > 0
      ? question.testCases.map((tc) => tc.seedDataSql)
      : [question.seedDataSql]
    : [];

  const queryText = (question ? drafts[question._id] : undefined) ?? "";

  // Question statuses (and the header's "solved" count) are derived from the
  // server's submission history, with in-session local updates layered on
  // top for instant feedback. `localStatuses` alone starts empty on every
  // mount/refresh, so without the server-derived base a page reload would
  // make solved questions look unattempted again even though the score is
  // unaffected.
  const statuses: Record<string, QuestionStatus> = useMemo(() => {
    const serverStatuses: Record<string, QuestionStatus> = {};
    if (mySubmissions) {
      for (const sub of mySubmissions) {
        serverStatuses[sub.questionId] = sub.isCorrect ? "correct" : "wrong";
      }
    }
    return { ...serverStatuses, ...localStatuses };
  }, [mySubmissions, localStatuses]);

  function handleQueryChange(val: string) {
    if (question && participantId) {
      setDrafts((prev) => {
        const next = { ...prev, [question._id]: val };
        try {
          window.localStorage.setItem(
            `queries-war-drafts-${participantId}`,
            JSON.stringify(next),
          );
        } catch {
          // ignore localStorage error
        }
        return next;
      });
    }
  }

  function selectQuestion(index: number) {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setResult(undefined);
      setFixtureSummaries(undefined);
      setSubmissionFeedback(null);
    }
  }

  useEffect(() => {
    if (!participantId || !participantToken) window.location.replace("/register");
  }, [participantId, participantToken]);

  useEffect(() => {
    if (participant === null && participantId && !redirecting.current) {
      redirecting.current = true;
      window.localStorage.removeItem(PARTICIPANT_KEY);
      window.localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
      window.location.replace("/register");
    }
  }, [participant, participantId]);


  useEffect(() => {
    if (!contestData?.contest || serverTime === undefined) return;
    const currentServerTime = Date.now() + (serverTime - Date.now());
    if (currentServerTime < contestData.contest.startTime && !redirecting.current) {
      redirecting.current = true;
      window.location.replace("/waiting");
    }
  }, [contestData?.contest, serverTime]);

  useEffect(() => {
    if (!participant?.startedAt || !contestData?.contest || serverTime === undefined) return;
    clockOffset.current = serverTime - Date.now();
    const deadline = Math.min(
      participant.startedAt + contestData.contest.durationSeconds * 1000,
      contestData.contest.endTime,
    );
    const tick = () => {
      const next = Math.max(0, deadline - (Date.now() + clockOffset.current));
      setRemaining(next);
      if (next === 0 && !redirecting.current) {
        redirecting.current = true;
        window.location.replace("/contest/submitted");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [participant?.startedAt, contestData?.contest, serverTime]);

  useEffect(() => {
    if (participant?.finishedAt !== undefined) window.location.replace("/contest/submitted");
  }, [participant?.finishedAt]);

  const lastTabSwitchRef = useRef<number>(0);
  const lastPasteAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (!participantId || !participantToken) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const now = Date.now();
        if (now - lastTabSwitchRef.current >= 3000) {
          lastTabSwitchRef.current = now;
          void recordEvent({ participantId, participantToken, event: "tabSwitch" });
          toast({
            title: "Tab switch logged",
            description: "Leaving the contest window has been recorded for integrity review.",
            variant: "warning",
          });
        }
      }
    };

    const handlePrevent = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handlePrevent);
    document.addEventListener("copy", handlePrevent);
    document.addEventListener("cut", handlePrevent);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handlePrevent);
      document.removeEventListener("copy", handlePrevent);
      document.removeEventListener("cut", handlePrevent);
    };
  }, [participantId, participantToken, recordEvent, toast]);

  function handleEditorPaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const now = Date.now();
    if (participantId && participantToken && now - lastPasteAttemptRef.current >= 2000) {
      lastPasteAttemptRef.current = now;
      void recordEvent({ participantId, participantToken, event: "pasteAttempt" });
      toast({
        title: "Pasting is disabled",
        description: "Code pasting is disabled during the contest to ensure integrity.",
        variant: "warning",
      });
    }
  }

  async function executeQuery() {
    if (!question || fixtures.length === 0) return;
    setIsRunning(true);

    const summaries: FixtureSummary[] = [];
    let primaryResult: QueryResult | undefined;

    for (let i = 0; i < fixtures.length; i++) {
      const fixtureSql = fixtures[i];
      const res = await runQuery(fixtureSql, queryText);
      if (i === 0) {
        primaryResult = res;
      }
      summaries.push({
        fixtureIndex: i + 1,
        success: res.success,
        error: res.error,
        rowCount: res.rows?.length,
      });
    }

    setResult(primaryResult);
    setFixtureSummaries(summaries);
    setIsRunning(false);
  }

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter runs query preview (Submit stays explicit click)
  const executeQueryRef = useRef(executeQuery);
  useEffect(() => {
    executeQueryRef.current = executeQuery;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void executeQueryRef.current();
        return;
      }

      // Devtools deterrence
      if (
        event.key === "F12" ||
        ((event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          ["I", "i", "J", "j", "C", "c"].includes(event.key)) ||
        ((event.ctrlKey || event.metaKey) &&
          (event.key === "u" || event.key === "U"))
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSubmit() {
    if (!question || !participantId) return;
    setIsSubmitting(true);
    setSubmissionFeedback(null);

    // Run preview check on first fixture before submission
    if (fixtures.length > 0) {
      const localResult = await runQuery(fixtures[0], queryText);
      if (!localResult.success) {
        setResult(localResult);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (!participantToken) throw new Error("Participant session is missing.");
      const submissionResult = await submitAnswer({
        participantId,
        participantToken,
        questionId: question._id,
        submittedQuery: queryText,
      });

      const isLast = currentIndex === questions.length - 1;

      setLocalStatuses((current) => ({
        ...current,
        [question._id]: submissionResult.isCorrect ? "correct" : "wrong",
      }));

      setSubmissionFeedback({
        questionId: question._id,
        isCorrect: submissionResult.isCorrect,
        pointsAwarded: submissionResult.pointsAwarded,
        attemptNumber: submissionResult.attemptNumber,
        isLastQuestion: isLast,
      });
    } catch (submissionError) {
      setResult({
        success: false,
        error:
          submissionError instanceof Error
            ? submissionError.message
            : "Could not submit answer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!participantId || participant === undefined || contestData === undefined) return <LoadingState />;
  if (!participant) return <LoadingState message="Your registration expired. Returning to registration…" />;
  
  // Handle ended contest gracefully
  if (!contestData || !contestData.contest.isActive) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md text-center p-6 space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <CardTitle className="font-heading text-xl">Contest Ended</CardTitle>
          <CardDescription>
            This contest has been concluded by the organizer. All your submitted answers have been preserved.
          </CardDescription>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild>
              <Link href="/contest/submitted">
                <CheckCircle2 className="size-4 mr-2" /> View Your Submission Summary
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contest/leaderboard">
                <Trophy className="size-4 mr-2 text-primary" /> View Final Leaderboard
              </Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (
    participantToken &&
    !participant.hasIdentityPhoto &&
    !participant.identityVerificationSkipped
  ) {
    return (
      <IdentityVerification
        participantId={participant._id}
        participantToken={participantToken}
        onStreamHandoff={setCameraStream}
      />
    );
  }

  if (!question) return <LoadingState message="Questions are being prepared." />;

  const solvedCount = Object.values(statuses).filter((s) => s === "correct").length;

  return (
    <main className="min-h-svh bg-muted/30 text-sm pb-12">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
        <div>
          <p className="font-heading text-lg font-semibold">Queries War</p>
          <p className="text-xs text-muted-foreground">{participant.name} · SQL arena</p>
        </div>
        <div className="flex items-center gap-3">
          {showCameraPreview && (
            <div
              className="relative size-9 shrink-0 overflow-hidden rounded-full border-2 border-primary/40"
              title="Camera is on — visible for the rest of the contest as an integrity deterrent. Nothing further is captured or uploaded from it."
            >
              <video
                ref={cameraPreviewRef}
                className="size-full object-cover"
                muted
                playsInline
              />
              <span className="absolute right-0 top-0 size-2 rounded-full bg-destructive ring-1 ring-background" />
            </div>
          )}
          {/* Live Header Score Badge */}
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>{participant.totalScore ?? 0} pts</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-normal text-muted-foreground">
              {solvedCount}/{questions.length} solved
            </span>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href="/contest/leaderboard" target="_blank" rel="noopener noreferrer">
              <Trophy className="size-4 mr-1.5 text-primary" />
              Leaderboard
            </Link>
          </Button>
          <ContestTimer remaining={remaining} />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 md:grid-cols-[220px_minmax(0,1fr)] md:p-8">
        <QuestionSidebar
          questions={questions.map((q) => ({
            _id: q._id,
            order: q.order,
            difficulty: q.difficulty,
            points: q.points,
          }))}
          currentIndex={currentIndex}
          statuses={statuses}
          onSelectQuestion={selectQuestion}
        />

        <section className="grid min-w-0 gap-5">
          {/* Contest Integrity Notice */}
          {!dismissIntegrityBanner && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Contest Integrity Active:</strong> Tab switching, devtools, and copy-paste are monitored and recorded for contest integrity review.
                </span>
              </div>
              <button
                onClick={() => setDismissIntegrityBanner(true)}
                className="text-muted-foreground hover:text-foreground text-[11px] underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    question.difficulty === "hard"
                      ? "destructive"
                      : question.difficulty === "medium"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {question.difficulty}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Question {question.order} of {questions.length} · {question.points} points
                </span>
              </div>
              <CardTitle className="font-heading text-2xl">{question.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap leading-7 text-muted-foreground">
                {question.promptMarkdown}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Schema & Sample Data Drawer */}
          <SchemaDrawer key={question._id} seedSql={question.seedDataSql} />

          {/* Submission Feedback Banner */}
          {submissionFeedback && (
            <div
              className={`rounded-xl border p-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
                submissionFeedback.isCorrect
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  {submissionFeedback.isCorrect ? (
                    <CheckCircle2 className="size-6 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-6 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-heading font-semibold text-base">
                      {submissionFeedback.isCorrect
                        ? `Correct Solution! +${submissionFeedback.pointsAwarded} points awarded`
                        : "Incorrect Solution (0 points)"}
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      {submissionFeedback.isCorrect
                        ? `Your answer passed all evaluation checks on attempt #${submissionFeedback.attemptNumber}.`
                        : "Your query did not produce the expected result on the grading fixtures. You can revise your SQL and resubmit."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {submissionFeedback.isCorrect ? (
                    submissionFeedback.isLastQuestion ? (
                      <Button size="sm" asChild>
                        <Link href="/contest/submitted">
                          <Trophy className="size-4 mr-1.5" /> Finish Contest
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => selectQuestion(currentIndex + 1)}
                      >
                        Next Question (Q{currentIndex + 2})
                        <ArrowRight className="size-4 ml-1.5" />
                      </Button>
                    )
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSubmissionFeedback(null)}
                      >
                        <RotateCcw className="size-3.5 mr-1.5" /> Revise SQL
                      </Button>
                      {!submissionFeedback.isLastQuestion && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => selectQuestion(currentIndex + 1)}
                        >
                          Skip to Q{currentIndex + 2}
                          <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between border-b bg-zinc-950 py-3 text-white">
              <div className="flex items-center gap-2">
                <CardTitle className="font-mono text-sm">query.sql</CardTitle>
                {drafts[question._id] && (
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] py-0">
                    Draft saved
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                SQLite
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <CodeMirror
                value={queryText}
                onChange={handleQueryChange}
                onPaste={handleEditorPaste}
                extensions={[sql()]}
                minHeight="260px"
                theme="dark"
                className="max-h-107.5 overflow-auto font-mono text-sm"
                basicSetup={{ lineNumbers: true, foldGutter: true }}
              />
            </CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={executeQuery}
                  disabled={isRunning || isSubmitting}
                >
                  <Play className="size-4 mr-1.5" />
                  {isRunning ? "Running preview…" : "Run query"}
                  <kbd className="ml-2 hidden sm:inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border">
                    Ctrl+↵
                  </kbd>
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || isRunning}>
                  <Send className="size-4 mr-1.5" />
                  {isSubmitting ? "Grading…" : "Submit answer"}
                </Button>
              </div>

              <span className="text-[11px] text-muted-foreground hidden md:inline">
                Press <kbd className="font-mono font-semibold">Ctrl+Enter</kbd> to preview query
              </span>
            </div>
          </Card>

          {result && (
            <ResultTable
              result={result}
              fixtureSummaries={fixtureSummaries}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function LoadingState({ message = "Loading contest…" }: { message?: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-2">
        <LoaderCircle className="animate-spin" />
        {message}
      </div>
    </main>
  );
}
