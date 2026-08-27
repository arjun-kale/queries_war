"use client";

import { motion } from "framer-motion";
import { Crown, LoaderCircle, User } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function LeaderboardTable({
  contestId,
  participantId,
}: {
  contestId: Id<"contests">;
  participantId?: Id<"participants">;
}) {
  const leaderboard = useQuery(api.leaderboard.get, { contestId });

  if (leaderboard === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
        <LoaderCircle className="animate-spin" />
        Loading leaderboard…
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <p className="p-12 text-center text-muted-foreground">
        No participants have submitted yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Rank</TableHead>
          <TableHead>Participant</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaderboard.map((entry) => {
          const isMe = participantId !== undefined && entry.participantId === participantId;

          return (
            <motion.tr
              layout
              key={entry.participantId}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                isMe && "bg-primary/10 border-primary/40 font-medium",
              )}
            >
              <TableCell className="font-mono font-semibold">
                {entry.rank <= 3 ? (
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full ${
                      entry.rank === 1
                        ? "bg-amber-300 text-amber-950"
                        : entry.rank === 2
                          ? "bg-slate-300 text-slate-900"
                          : "bg-orange-300 text-orange-950"
                    }`}
                  >
                    <Crown className="size-4" />
                  </span>
                ) : (
                  entry.rank
                )}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{entry.name}</span>
                  {isMe && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                      <User className="size-3" /> You
                    </Badge>
                  )}
                  {entry.rank <= 3 && (
                    <Badge variant="outline" className="ml-1">
                      {entry.rank === 1
                        ? "Gold"
                        : entry.rank === 2
                          ? "Silver"
                          : "Bronze"}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className={cn("text-right font-mono", isMe && "text-primary font-bold")}>
                {entry.totalScore} pts
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {formatTime(entry.totalTimeTakenSeconds)}
              </TableCell>
            </motion.tr>
          );
        })}
      </TableBody>
    </Table>
  );
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
