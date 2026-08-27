import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Replace these defaults with a proper identity provider before production use.
export const ADMIN_ID = "admin";
export const ADMIN_PASSWORD = "QueriesWar@2026";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const sessionArgs = { adminToken: v.string() };
const liveScoreValidator = v.object({
  participantId: v.id("participants"), name: v.string(), email: v.string(),
  totalScore: v.number(), submissionCount: v.number(), isFinished: v.boolean(), rank: v.number(),
});

async function requireAdmin(ctx: QueryCtx, token: string) {
  const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
  if (!session || session.expiresAt < Date.now()) throw new Error("Admin session expired. Please sign in again.");
  return session;
}

export const login = mutation({
  args: { adminId: v.string(), password: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.adminId.trim() !== ADMIN_ID || args.password !== ADMIN_PASSWORD) throw new Error("Invalid admin ID or password.");
    const token = crypto.randomUUID();
    await ctx.db.insert("adminSessions", { token, expiresAt: Date.now() + SESSION_DURATION_MS });
    return token;
  },
});

export const check = query({
  args: sessionArgs,
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", args.adminToken)).unique();
    return Boolean(session && session.expiresAt >= Date.now());
  },
});

export const logout = mutation({
  args: sessionArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", args.adminToken)).unique();
    if (session) await ctx.db.delete("adminSessions", session._id);
    return null;
  },
});

export const dashboard = query({
  args: sessionArgs,
  returns: v.object({ contestCount: v.number(), participantCount: v.number(), submissionCount: v.number(), activeContestCount: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const contests = await ctx.db.query("contests").take(50);
    let participantCount = 0;
    let submissionCount = 0;
    for (const contest of contests) {
      const participants = await ctx.db.query("participants").withIndex("by_contest", (q) => q.eq("contestId", contest._id)).take(1000);
      participantCount += participants.length;
      for (const participant of participants) submissionCount += (await ctx.db.query("submissions").withIndex("by_participant", (q) => q.eq("participantId", participant._id)).take(1000)).length;
    }
    return { contestCount: contests.length, participantCount, submissionCount, activeContestCount: contests.filter((contest) => contest.isActive).length };
  },
});

export const liveScores = query({
  args: { adminToken: v.string(), contestId: v.id("contests") },
  returns: v.array(liveScoreValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const participants = await ctx.db.query("participants").withIndex("by_contest", (q) => q.eq("contestId", args.contestId)).take(1000);
    const scores: Array<{ participantId: Id<"participants">; name: string; email: string; totalScore: number; submissionCount: number; isFinished: boolean; }> = [];
    for (const participant of participants) {
      const submissions = await ctx.db.query("submissions").withIndex("by_participant", (q) => q.eq("participantId", participant._id)).take(1000);
      scores.push({ participantId: participant._id, name: participant.name, email: participant.email, totalScore: submissions.reduce((total, item) => total + item.pointsAwarded, 0), submissionCount: submissions.length, isFinished: participant.finishedAt !== undefined });
    }
    scores.sort((left, right) => right.totalScore - left.totalScore || right.submissionCount - left.submissionCount || left.name.localeCompare(right.name));
    return scores.map((score, index) => ({ ...score, rank: index + 1 }));
  },
});
