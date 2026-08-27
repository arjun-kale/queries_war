import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const validateAndGetQuestion = internalMutation({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
    questionId: v.id("questions"),
  },
  returns: v.object({
    question: v.object({
      _id: v.id("questions"),
      points: v.number(),
      order: v.number(),
      seedDataSql: v.string(),
      expectedResultHash: v.string(),
      testCases: v.optional(
        v.array(
          v.object({
            seedDataSql: v.string(),
            expectedResultHash: v.string(),
          }),
        ),
      ),
    }),
    isFinal: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) {
      throw new Error("Participant session is invalid.");
    }
    if (participant.isDisqualified) {
      throw new Error("Participant is disqualified.");
    }
    if (participant.finishedAt !== undefined) {
      throw new Error("This contest has already been submitted.");
    }

    const contest = await ctx.db.get("contests", participant.contestId);
    if (!contest) throw new Error("Contest not found.");

    const question = await ctx.db.get("questions", args.questionId);
    if (!question || question.contestId !== participant.contestId) {
      throw new Error("That question does not belong to this contest.");
    }

    const now = Date.now();
    const deadline = Math.min(
      participant.startedAt
        ? participant.startedAt + contest.durationSeconds * 1000
        : contest.endTime,
      contest.endTime,
    );

    if (!contest.isActive || now < contest.startTime || now > deadline) {
      if (now > deadline && participant.finishedAt === undefined) {
        await ctx.db.patch("participants", participant._id, { finishedAt: deadline });
      }
      throw new Error("The contest time has ended or has not started.");
    }

    const contestQuestions = await ctx.db
      .query("questions")
      .withIndex("by_contest", (q) => q.eq("contestId", participant.contestId))
      .collect();

    const isFinal =
      question.order === Math.max(...contestQuestions.map((item) => item.order));

    return {
      question: {
        _id: question._id,
        points: question.points,
        order: question.order,
        seedDataSql: question.seedDataSql,
        expectedResultHash: question.expectedResultHash,
        testCases: question.testCases,
      },
      isFinal,
    };
  },
});

export const recordSubmission = internalMutation({
  args: {
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    submittedQuery: v.string(),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
    isFinal: v.boolean(),
    submittedAt: v.number(),
  },
  returns: v.object({
    submissionId: v.id("submissions"),
    totalScore: v.number(),
  }),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant) throw new Error("Participant not found.");

    const previous = await ctx.db
      .query("submissions")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .take(1_000);

    const attemptNumber =
      previous.filter((item) => item.questionId === args.questionId).length + 1;

    const submissionId = await ctx.db.insert("submissions", {
      participantId: args.participantId,
      questionId: args.questionId,
      submittedQuery: args.submittedQuery,
      isCorrect: args.isCorrect,
      pointsAwarded: args.pointsAwarded,
      submittedAt: args.submittedAt,
      attemptNumber,
    });

    const totalScore =
      previous.reduce(
        (total, item) => total + (item.isCorrect ? item.pointsAwarded : 0),
        0,
      ) + (args.isCorrect ? args.pointsAwarded : 0);
    const submissionCount = previous.length + 1;
    const lastSubmittedAt = args.submittedAt;

    await ctx.db.patch("participants", args.participantId, {
      totalScore,
      submissionCount,
      lastSubmittedAt,
      ...(args.isFinal ? { finishedAt: args.submittedAt } : {}),
    });

    return {
      submissionId,
      totalScore,
    };
  },
});
