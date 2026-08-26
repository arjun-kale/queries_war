import { query } from "./_generated/server";
import { v } from "convex/values";

const contestValidator = v.object({
  _id: v.id("contests"),
  _creationTime: v.number(),
  title: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  durationSeconds: v.number(),
  isActive: v.boolean(),
  leaderboardVisible: v.boolean(),
});

const questionValidator = v.object({
  _id: v.id("questions"),
  _creationTime: v.number(),
  contestId: v.id("contests"),
  order: v.number(),
  difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  title: v.string(),
  promptMarkdown: v.string(),
  seedDataSql: v.string(),
  expectedResultHash: v.string(),
  points: v.number(),
});

export const getActive = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ contest: contestValidator, questions: v.array(questionValidator) }),
  ),
  handler: async (ctx) => {
    const contest = await ctx.db
      .query("contests")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(1);
    if (!contest[0]) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_contest", (q) => q.eq("contestId", contest[0]._id))
      .order("asc")
      .take(15);

    return { contest: contest[0], questions };
  },
});

export const getForRegistration = query({
  args: {},
  returns: v.union(v.null(), contestValidator),
  handler: async (ctx) => {
    const contests = await ctx.db
      .query("contests")
      .withIndex("by_title", (q) => q.eq("title", "Queries War"))
      .take(1);
    return contests[0] ?? null;
  },
});

export const serverTime = query({
  args: {},
  returns: v.number(),
  handler: async () => Date.now(),
});
