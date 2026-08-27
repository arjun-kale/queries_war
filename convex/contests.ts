import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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

async function copyQuestionsIfEmpty(ctx: MutationCtx, contestId: Id<"contests">) {
  const existing = await ctx.db.query("questions").withIndex("by_contest", (q) => q.eq("contestId", contestId)).take(1);
  if (existing.length > 0) return;
  const sourceContests = await ctx.db.query("contests").order("desc").take(50);
  for (const source of sourceContests) {
    if (source._id === contestId) continue;
    const questions = await ctx.db.query("questions").withIndex("by_contest", (q) => q.eq("contestId", source._id)).take(100);
    if (questions.length === 0) continue;
    for (const question of questions) {
      await ctx.db.insert("questions", { contestId, order: question.order, difficulty: question.difficulty, title: question.title, promptMarkdown: question.promptMarkdown, seedDataSql: question.seedDataSql, expectedResultHash: question.expectedResultHash, points: question.points });
    }
    return;
  }
}

export const activate = internalMutation({
  args: { title: v.string() },
  returns: v.id("contests"),
  handler: async (ctx, args) => {
    const contests = await ctx.db
      .query("contests")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .take(1);
    const contest = contests[0];
    if (!contest) throw new Error(`Contest not found: ${args.title}`);
    await ctx.db.patch("contests", contest._id, { isActive: true });
    return contest._id;
  },
});

export const getActive = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ contest: contestValidator, questions: v.array(questionValidator) }),
  ),
  handler: async (ctx) => {
    // Resolve the same contest used by registration. Looking up any active
    // row can select an unrelated/stale contest when more than one exists.
    const contests = await ctx.db
      .query("contests")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .take(1);
    const contest = contests[0];
    if (!contest || !contest.isActive) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_contest", (q) => q.eq("contestId", contest._id))
      .order("asc")
      .take(15);

    return { contest, questions };
  },
});

export const getForRegistration = query({
  args: {},
  returns: v.union(v.null(), contestValidator),
  handler: async (ctx) => {
    const contests = await ctx.db
      .query("contests")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .take(1);
    const contest = contests[0];
    return contest && contest.isActive ? contest : null;
  },
});

export const serverTime = query({
  args: {},
  returns: v.number(),
  handler: async () => Date.now(),
});

export const adminList = query({
  args: { adminToken: v.string() },
  returns: v.array(contestValidator),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", args.adminToken)).unique();
    if (!session || session.expiresAt < Date.now()) throw new Error("Admin session expired.");
    return await ctx.db.query("contests").order("desc").take(50);
  },
});

export const adminUpdate = mutation({
  args: {
    adminToken: v.string(),
    contestId: v.id("contests"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    durationSeconds: v.number(),
    isActive: v.boolean(),
    leaderboardVisible: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", args.adminToken)).unique();
    if (!session || session.expiresAt < Date.now()) throw new Error("Admin session expired.");
    if (!args.title.trim()) throw new Error("Contest title is required.");
    if (!Number.isFinite(args.startTime) || !Number.isFinite(args.endTime)) throw new Error("Start and end dates are required.");
    if (args.endTime <= args.startTime) throw new Error("End date must be after the start date.");
    if (!Number.isFinite(args.durationSeconds) || args.durationSeconds <= 0) throw new Error("Duration must be greater than zero.");
    if (args.isActive) await copyQuestionsIfEmpty(ctx, args.contestId);
    await ctx.db.patch("contests", args.contestId, {
      title: args.title.trim(), startTime: args.startTime, endTime: args.endTime,
      durationSeconds: args.durationSeconds, isActive: args.isActive, leaderboardVisible: args.leaderboardVisible,
    });
    return null;
  },
});

export const adminCreate = mutation({
  args: {
    adminToken: v.string(),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    durationSeconds: v.number(),
  },
  returns: v.id("contests"),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", args.adminToken)).unique();
    if (!session || session.expiresAt < Date.now()) throw new Error("Admin session expired.");
    if (!args.title.trim()) throw new Error("Contest title is required.");
    if (!Number.isFinite(args.startTime) || !Number.isFinite(args.endTime)) throw new Error("Start and end dates are required.");
    if (args.endTime <= args.startTime) throw new Error("End date must be after the start date.");
    if (!Number.isFinite(args.durationSeconds) || args.durationSeconds <= 0) throw new Error("Duration must be greater than zero.");
    const contestId = await ctx.db.insert("contests", {
      title: args.title.trim(), startTime: args.startTime, endTime: args.endTime,
      durationSeconds: args.durationSeconds, isActive: false, leaderboardVisible: true,
    });
    await copyQuestionsIfEmpty(ctx, contestId);
    return contestId;
  },
});
