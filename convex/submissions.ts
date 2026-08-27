"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { executeAndGrade } from "./grading";

export const submit = action({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
    questionId: v.id("questions"),
    submittedQuery: v.string(),
  },
  returns: v.object({
    submissionId: v.id("submissions"),
    totalScore: v.number(),
    isCorrect: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.submittedQuery.length > 20_000) {
      throw new Error("Query is too long.");
    }

    const { question, isFinal }: {
      question: {
        _id: Id<"questions">;
        points: number;
        order: number;
        seedDataSql: string;
        expectedResultHash: string;
        testCases?: Array<{ seedDataSql: string; expectedResultHash: string }>;
      };
      isFinal: boolean;
    } = await ctx.runMutation(
      internal.submissionStore.validateAndGetQuestion,
      {
        participantId: args.participantId,
        participantToken: args.participantToken,
        questionId: args.questionId,
      },
    );

    const fixtures =
      question.testCases && question.testCases.length > 0
        ? question.testCases
        : [
            {
              seedDataSql: question.seedDataSql,
              expectedResultHash: question.expectedResultHash,
            },
          ];

    let isCorrect = true;
    for (const fixture of fixtures) {
      const gradeResult = await executeAndGrade(
        fixture.seedDataSql,
        args.submittedQuery,
        fixture.expectedResultHash,
      );
      if (!gradeResult.isCorrect) {
        isCorrect = false;
        break;
      }
    }

    const pointsAwarded = isCorrect ? question.points : 0;
    const submittedAt = Date.now();

    const result: { submissionId: Id<"submissions">; totalScore: number } =
      await ctx.runMutation(internal.submissionStore.recordSubmission, {
        participantId: args.participantId,
        questionId: args.questionId,
        submittedQuery: args.submittedQuery,
        isCorrect,
        pointsAwarded,
        isFinal,
        submittedAt,
      });

    return {
      submissionId: result.submissionId,
      totalScore: result.totalScore,
      isCorrect,
    };
  },
});
