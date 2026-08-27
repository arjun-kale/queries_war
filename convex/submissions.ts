import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
    questionId: v.id("questions"),
    submittedQuery: v.string(),
    resultHashes: v.array(v.string()),
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

    const contestQuestions = await ctx.db
      .query("questions")
      .withIndex("by_contest", (q) => q.eq("contestId", participant.contestId))
      .collect();
    const expectedHashes = question.testCases?.map((testCase) => testCase.expectedResultHash) ?? [question.expectedResultHash];
    const isCorrect = expectedHashes.length === args.resultHashes.length && expectedHashes.every((hash, index) => hash === args.resultHashes[index]);

    const previous = await ctx.db
      .query("submissions")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .take(1_000);
    const attemptNumber = previous.filter((item) => item.questionId === args.questionId).length + 1;
    const pointsAwarded = isCorrect ? question.points : 0;

    const submissionId = await ctx.db.insert("submissions", {
      participantId: args.participantId,
      questionId: args.questionId,
      submittedQuery: args.submittedQuery,
      isCorrect,
      pointsAwarded,
      submittedAt,
      attemptNumber,
    });

    const isFinal = question.order === Math.max(...contestQuestions.map((item) => item.order));
    if (isFinal) {
      await ctx.db.patch("participants", args.participantId, { finishedAt: Date.now() });
    }

    return {
      submissionId,
      totalScore: previous.reduce((total, item) => total + item.pointsAwarded, 0) + pointsAwarded,
    };
  },
});
