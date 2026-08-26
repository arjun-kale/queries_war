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
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_contest", (q) => q.eq("contestId", args.contestId))
      .take(1_000);

    const rows: Array<{
      participantId: Id<"participants">;
      name: string;
      totalScore: number;
      totalTimeTakenSeconds: number;
      lastSubmittedAt: number;
    }> = [];
    for (const participant of participants) {
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .take(1_000);
      const totalScore = submissions.reduce(
        (total, submission) => total + (submission.isCorrect ? submission.pointsAwarded : 0),
        0,
      );
      const lastSubmittedAt = submissions.reduce(
        (latest, submission) => Math.max(latest, submission.submittedAt),
        0,
      );
      const totalTimeTakenSeconds = participant.startedAt
        ? Math.max(0, (participant.finishedAt ?? Date.now()) - participant.startedAt) / 1_000
        : 0;

      rows.push({
        participantId: participant._id,
        name: participant.name,
        totalScore,
        totalTimeTakenSeconds,
        lastSubmittedAt,
      });
    }

    rows.sort((left, right) =>
      right.totalScore - left.totalScore ||
      left.totalTimeTakenSeconds - right.totalTimeTakenSeconds ||
      left.lastSubmittedAt - right.lastSubmittedAt,
    );

    return rows.map((row, index) => {
      const previous = rows[index - 1];
      const isTie = previous &&
        previous.totalScore === row.totalScore &&
        previous.totalTimeTakenSeconds === row.totalTimeTakenSeconds &&
        previous.lastSubmittedAt === row.lastSubmittedAt;
      return { ...row, rank: isTie ? index : index + 1 };
    });
  },
});
