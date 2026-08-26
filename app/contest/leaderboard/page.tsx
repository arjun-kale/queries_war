"use client";

import Link from "next/link";
import { ArrowLeft, LoaderCircle, Trophy } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeaderboardPage() {
  const contest = useQuery(api.contests.getActive);
  if (contest === undefined) return <State message="Loading leaderboard…" />;
  if (!contest) return <State message="The contest leaderboard is not available yet." />;
  return <main className="min-h-svh bg-muted/30 px-4 py-10"><div className="mx-auto max-w-4xl"><Button variant="ghost" asChild><Link href="/contest"><ArrowLeft />Back to contest</Link></Button><Card className="mt-5"><CardHeader><div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Trophy className="size-6" /></div><CardTitle className="font-heading text-2xl">Live leaderboard</CardTitle><p className="text-sm text-muted-foreground">{contest.contest.title} · updates live as answers arrive</p></CardHeader><CardContent><LeaderboardTable contestId={contest.contest._id} /></CardContent></Card></div></main>;
}

function State({ message }: { message: string }) { return <main className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground"><LoaderCircle className="animate-spin" />{message}</main>; }
