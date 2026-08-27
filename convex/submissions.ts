import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
    questionId: v.id("questions"),
    submittedQuery: v.string(),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
    isFinal: v.optional(v.boolean()),
  },
  returns: v.object({ submissionId: v.id("submissions"), totalScore: v.number() }),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) throw new Error("Participant session is invalid.");
    if (participant.finishedAt !== undefined) {
      throw new Error("This contest has already been submitted.");
    }

    const contest = await ctx.db.get("contests", participant.contestId);
    if (!contest) throw new Error("Contest not found.");
    const question = await ctx.db.get("questions", args.questionId);
    if (!question || question.contestId !== participant.contestId) {
      throw new Error("That question does not belong to this contest.");
    }

    const submittedAt = Date.now();
    const deadline = Math.min(
      participant.startedAt
        ? participant.startedAt + contest.durationSeconds * 1000
        : contest.endTime,
      contest.endTime,
    );
    if (!contest.isActive || submittedAt < contest.startTime || submittedAt > deadline) {
      throw new Error("The contest time has ended or has not started.");
    }
    if (args.submittedQuery.length > 20_000) throw new Error("Query is too long.");

    const previous = await ctx.db
      .query("submissions")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .take(1_000);
    const attemptNumber = previous.filter((item) => item.questionId === args.questionId).length + 1;
    const pointsAwarded = args.isCorrect
      ? Math.min(Math.max(args.pointsAwarded, 0), question.points)
      : 0;

    const submissionId = await ctx.db.insert("submissions", {
      participantId: args.participantId,
      questionId: args.questionId,
      submittedQuery: args.submittedQuery,
      isCorrect: args.isCorrect,
      pointsAwarded,
      submittedAt,
      attemptNumber,
    });

    if (args.isFinal === true) {
      await ctx.db.patch("participants", args.participantId, { finishedAt: Date.now() });
    }

    return {
      submissionId,
      totalScore: previous.reduce((total, item) => total + item.pointsAwarded, 0) + pointsAwarded,
    };
  },
});
