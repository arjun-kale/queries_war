"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, CircleAlert, Clock3, LoaderCircle, Play, Send, X } from "lucide-react";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { runQuery, type QueryResult } from "@/lib/sqlRunner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PARTICIPANT_KEY = "queries-war-participant-id";
type Status = "unattempted" | "correct" | "wrong";

export default function ContestPage() {
  const [participantId] = useState<Id<"participants"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = window.localStorage.getItem(PARTICIPANT_KEY);
    return stored ? (stored as Id<"participants">) : undefined;
  });
  const participant = useQuery(api.participants.get, participantId ? { participantId } : "skip");
  const contestData = useQuery(api.contests.getActive);
  const serverTime = useQuery(api.contests.serverTime);
  const submitAnswer = useMutation(api.submissions.submit);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queryText, setQueryText] = useState("SELECT *\nFROM products\nLIMIT 10;");
  const [result, setResult] = useState<QueryResult>();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [remaining, setRemaining] = useState<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirecting = useRef(false);
  const questions = contestData?.questions ?? [];
  const question = questions[currentIndex];
  const clockOffset = useRef(0);

  useEffect(() => {
    if (!participantId) window.location.replace("/register");
  }, [participantId]);

  useEffect(() => {
    if (!participant?.startedAt || !contestData?.contest || serverTime === undefined) return;
    clockOffset.current = serverTime - Date.now();
    const deadline = Math.min(participant.startedAt + contestData.contest.durationSeconds * 1000, contestData.contest.endTime);
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

  const formattedTime = remaining === undefined ? "--:--" : `${String(Math.floor(remaining / 60_000)).padStart(2, "0")}:${String(Math.floor((remaining % 60_000) / 1_000)).padStart(2, "0")}`;

  async function executeQuery() {
    if (!question) return;
    setIsRunning(true);
    const nextResult = await runQuery(question.seedDataSql, queryText);
    setResult(nextResult);
    setIsRunning(false);
  }

  function selectQuestion(index: number) {
    setCurrentIndex(index);
    setQueryText("SELECT *\nFROM products\nLIMIT 10;");
    setResult(undefined);
  }

  async function handleSubmit() {
    if (!question || !participantId) return;
    setIsSubmitting(true);
    const nextResult = await runQuery(question.seedDataSql, queryText);
    setResult(nextResult);
    if (!nextResult.success || !nextResult.resultHash) {
      setIsSubmitting(false);
      return;
    }
    try {
      const isCorrect = nextResult.resultHash === question.expectedResultHash;
      const isFinal = currentIndex === questions.length - 1;
      await submitAnswer({ participantId, questionId: question._id, submittedQuery: queryText, isCorrect, pointsAwarded: isCorrect ? question.points : 0, isFinal });
      setStatuses((current) => ({ ...current, [question._id]: isCorrect ? "correct" : "wrong" }));
      if (isFinal) window.location.replace("/contest/submitted");
      else selectQuestion(currentIndex + 1);
    } catch (submissionError) {
      setResult({ success: false, error: submissionError instanceof Error ? submissionError.message : "Could not submit answer." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!participantId || participant === undefined || contestData === undefined) return <LoadingState />;
  if (!participant) return <LoadingState message="Participant not found. Return to registration to begin again." />;
  if (!contestData) return <LoadingState message="The contest is not active yet." />;
  if (!question) return <LoadingState message="Questions are being prepared." />;

  return <main className="min-h-svh bg-muted/30 text-sm">
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
      <div><p className="font-heading text-lg font-semibold">Queries War</p><p className="text-xs text-muted-foreground">{participant.name} · SQL arena</p></div>
      <div className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono font-semibold ${remaining !== undefined && remaining < 300_000 ? "border-destructive/40 text-destructive" : "text-primary"}`}><Clock3 className="size-4" />{formattedTime}</div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 p-4 md:grid-cols-[220px_minmax(0,1fr)] md:p-8">
      <Card className="h-fit"><CardHeader className="pb-3"><CardTitle className="text-sm">Questions <span className="text-muted-foreground">{questions.length}/15</span></CardTitle></CardHeader><CardContent className="grid grid-cols-5 gap-2 md:grid-cols-3">{questions.map((item, index) => { const status = statuses[item._id] ?? "unattempted"; return <button key={item._id} onClick={() => selectQuestion(index)} className={`relative flex size-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${index === currentIndex ? "border-primary bg-primary text-primary-foreground" : status === "correct" ? "border-primary/30 bg-primary/10 text-primary" : status === "wrong" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-background hover:bg-muted"}`} aria-label={`Question ${index + 1}, ${status}`}>{index + 1}{status === "correct" && <Check className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background" />}{status === "wrong" && <X className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background" />}</button>; })}</CardContent></Card>
      <section className="grid min-w-0 gap-5">
        <Card><CardHeader className="gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={question.difficulty === "hard" ? "destructive" : question.difficulty === "medium" ? "secondary" : "outline"}>{question.difficulty}</Badge><span className="text-xs text-muted-foreground">Question {question.order} · {question.points} points</span></div><CardTitle className="font-heading text-2xl">{question.title}</CardTitle></CardHeader><CardContent><div className="max-h-56 overflow-y-auto whitespace-pre-wrap leading-7 text-muted-foreground">{question.promptMarkdown}</div></CardContent></Card>
        <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between border-b bg-zinc-950 py-3 text-white"><CardTitle className="font-mono text-sm">query.sql</CardTitle><Badge variant="outline" className="border-zinc-700 text-zinc-300">SQLite</Badge></CardHeader><CardContent className="p-0"><CodeMirror value={queryText} onChange={setQueryText} extensions={[sql()]} minHeight="260px" theme="dark" className="max-h-[430px] overflow-auto font-mono text-sm" basicSetup={{ lineNumbers: true, foldGutter: true }} /></CardContent><div className="flex flex-wrap gap-2 border-t p-4"><Button variant="secondary" onClick={executeQuery} disabled={isRunning || isSubmitting}><Play />{isRunning ? "Running…" : "Run query"}</Button><Button onClick={handleSubmit} disabled={isSubmitting || isRunning}><Send />{isSubmitting ? "Submitting…" : "Submit answer"}</Button></div></Card>
        {result && <Card><CardHeader className="py-4"><CardTitle className="flex items-center gap-2 text-sm">{result.success ? <><Check className="text-primary" />Query result</> : <><CircleAlert className="text-destructive" />Query error</>}</CardTitle></CardHeader><CardContent className="overflow-auto pb-5">{result.error ? <p className="rounded-md bg-destructive/10 p-3 text-destructive">{result.error}</p> : result.rows && result.rows.length > 0 ? <table className="min-w-full text-left text-xs"><thead><tr>{Object.keys(result.rows[0]).map((key) => <th key={key} className="border-b px-3 py-2 font-semibold">{key}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index} className="even:bg-muted/50">{Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="whitespace-nowrap border-b px-3 py-2 font-mono">{String(value ?? "NULL")}</td>)}</tr>)}</tbody></table> : <p className="text-muted-foreground">Query returned no rows.</p>}</CardContent></Card>}
      </section>
    </div>
  </main>;
}

function LoadingState({ message = "Loading contest…" }: { message?: string }) { return <main className="flex min-h-svh items-center justify-center text-muted-foreground"><div className="flex items-center gap-2"><LoaderCircle className="animate-spin" />{message}</div></main>; }
