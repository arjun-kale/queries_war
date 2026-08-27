import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contests: defineTable({
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    durationSeconds: v.number(),
    isActive: v.boolean(),
    leaderboardVisible: v.boolean(),
  })
    .index("by_title", ["title"])
    .index("by_active", ["isActive"]),

  questions: defineTable({
    contestId: v.id("contests"),
    order: v.number(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    title: v.string(),
    promptMarkdown: v.string(),
    seedDataSql: v.string(),
    expectedResultHash: v.string(),
    points: v.number(),
  }).index("by_contest", ["contestId"]),

  participants: defineTable({
    contestId: v.id("contests"),
    name: v.string(),
    email: v.string(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    tabSwitchCount: v.number(),
    pasteAttemptCount: v.number(),
    isDisqualified: v.optional(v.boolean()),
  }).index("by_contest", ["contestId"]),

  submissions: defineTable({
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    submittedQuery: v.string(),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
    submittedAt: v.number(),
    attemptNumber: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_question", ["questionId"]),

  adminSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
});
