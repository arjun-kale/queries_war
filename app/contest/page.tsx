"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
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
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  const [remaining, setRemaining] = useState<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirecting = useRef(false);
  const clockOffset = useRef(0);

  const questions = contestData?.questions ?? [];
  const question = questions[currentIndex];
  const fixtures: string[] = question
    ? question.testCases && question.testCases.length > 0
      ? question.testCases.map((tc) => tc.seedDataSql)
      : [question.seedDataSql]
    : [];

  const queryText = (question ? drafts[question._id] : undefined) ?? "";

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
        }
      }
    };

    const handlePrevent = (event: Event) => {
      event.preventDefault();
    };

    // Note: Browser client-side keyboard/event blocks are deterrence only, not a hard security boundary.
    const handleKeyDown = (event: KeyboardEvent) => {
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handlePrevent);
    document.addEventListener("copy", handlePrevent);
    document.addEventListener("cut", handlePrevent);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handlePrevent);
      document.removeEventListener("copy", handlePrevent);
      document.removeEventListener("cut", handlePrevent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [participantId, participantToken, recordEvent]);

  function handleEditorPaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const now = Date.now();
    if (participantId && participantToken && now - lastPasteAttemptRef.current >= 2000) {
      lastPasteAttemptRef.current = now;
      void recordEvent({ participantId, participantToken, event: "pasteAttempt" });
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

      setStatuses((current) => ({
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
  
  // Handled ended contest gracefully
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

  if (!question) return <LoadingState message="Questions are being prepared." />;

  return (
    <main className="min-h-svh bg-muted/30 text-sm pb-12">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
        <div>
          <p className="font-heading text-lg font-semibold">Queries War</p>
          <p className="text-xs text-muted-foreground">{participant.name} · SQL arena</p>
        </div>
        <div className="flex items-center gap-3">
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
          questions={questions}
          currentIndex={currentIndex}
          statuses={statuses}
          onSelectQuestion={selectQuestion}
        />

        <section className="grid min-w-0 gap-5">
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
            <div className="flex flex-wrap gap-2 border-t p-4">
              <Button
                variant="secondary"
                onClick={executeQuery}
                disabled={isRunning || isSubmitting}
              >
                <Play className="size-4 mr-1.5" />
                {isRunning ? "Running preview…" : "Run query"}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || isRunning}>
                <Send className="size-4 mr-1.5" />
                {isSubmitting ? "Grading…" : "Submit answer"}
              </Button>
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
