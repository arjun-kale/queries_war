"use client";

import { motion } from "framer-motion";
import { Crown, LoaderCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function LeaderboardTable({ contestId }: { contestId: Id<"contests"> }) {
  const leaderboard = useQuery(api.leaderboard.get, { contestId });

  if (leaderboard === undefined) return <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground"><LoaderCircle className="animate-spin" />Loading leaderboard…</div>;
  if (leaderboard.length === 0) return <p className="p-12 text-center text-muted-foreground">No participants have submitted yet.</p>;

  return <Table><TableHeader><TableRow><TableHead className="w-20">Rank</TableHead><TableHead>Participant</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader><TableBody>{leaderboard.map((entry) => <motion.tr layout key={entry.participantId} className="border-b transition-colors hover:bg-muted/50"> <TableCell className="font-mono font-semibold">{entry.rank <= 3 ? <span className={`inline-flex size-8 items-center justify-center rounded-full ${entry.rank === 1 ? "bg-amber-300 text-amber-950" : entry.rank === 2 ? "bg-slate-300 text-slate-900" : "bg-orange-300 text-orange-950"}`}><Crown className="size-4" /></span> : entry.rank}</TableCell><TableCell className="font-medium">{entry.name}{entry.rank <= 3 && <Badge variant="outline" className="ml-2">{entry.rank === 1 ? "Gold" : entry.rank === 2 ? "Silver" : "Bronze"}</Badge>}</TableCell><TableCell className="text-right font-mono">{entry.totalScore} pts</TableCell><TableCell className="text-right font-mono text-muted-foreground">{formatTime(entry.totalTimeTakenSeconds)}</TableCell></motion.tr>)}</TableBody></Table>;
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
