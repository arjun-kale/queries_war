import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const leaderboardRow = v.object({
  participantId: v.id("participants"),
  rank: v.number(),
  name: v.string(),
  totalScore: v.number(),
  totalTimeTakenSeconds: v.number(),
  lastSubmittedAt: v.number(),
});

export const get = query({
  args: { contestId: v.id("contests") },
  returns: v.array(leaderboardRow),
  handler: async (ctx, args) => {
    const contest = await ctx.db.get("contests", args.contestId);
    if (!contest || !contest.leaderboardVisible) {
      return [];
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_contest", (q) => q.eq("contestId", args.contestId))
      .take(1_000);

    const now = Date.now();
    const rows: Array<{
      participantId: Id<"participants">;
      name: string;
      totalScore: number;
      totalTimeTakenSeconds: number;
      lastSubmittedAt: number;
    }> = [];

    for (const participant of participants) {
      if (participant.isDisqualified) continue;

      let totalScore = participant.totalScore;
      let lastSubmittedAt = participant.lastSubmittedAt;

      if (totalScore === undefined || lastSubmittedAt === undefined) {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_participant", (q) =>
            q.eq("participantId", participant._id),
          )
          .take(1_000);
        totalScore = submissions.reduce(
          (total, submission) =>
            total + (submission.isCorrect ? submission.pointsAwarded : 0),
          0,
        );
        lastSubmittedAt = submissions.reduce(
          (latest, submission) => Math.max(latest, submission.submittedAt),
          0,
        );
      }

      const deadline = participant.startedAt
        ? Math.min(
            participant.startedAt + contest.durationSeconds * 1000,
            contest.endTime,
          )
        : contest.endTime;
      const effectiveEnd = participant.finishedAt ?? Math.min(now, deadline);
      const totalTimeTakenSeconds = participant.startedAt
        ? Math.max(0, (effectiveEnd - participant.startedAt) / 1000)
        : 0;

      rows.push({
        participantId: participant._id,
        name: participant.name,
        totalScore: totalScore ?? 0,
        totalTimeTakenSeconds,
        lastSubmittedAt: lastSubmittedAt ?? 0,
      });
    }

    rows.sort(
      (left, right) =>
        right.totalScore - left.totalScore ||
        left.totalTimeTakenSeconds - right.totalTimeTakenSeconds ||
        left.lastSubmittedAt - right.lastSubmittedAt,
    );

    return rows.map((row, index) => {
      const previous = rows[index - 1];
      const isTie =
        previous &&
        previous.totalScore === row.totalScore &&
        previous.totalTimeTakenSeconds === row.totalTimeTakenSeconds &&
        previous.lastSubmittedAt === row.lastSubmittedAt;
      return { ...row, rank: isTie ? index : index + 1 };
    });
  },
});
