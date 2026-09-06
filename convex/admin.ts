import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const ADMIN_ID = "admin";
export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "QueriesWar@2026";
}

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;

const sessionArgs = { adminToken: v.string() };

const liveScoreValidator = v.object({
  participantId: v.id("participants"),
  name: v.string(),
  email: v.string(),
  totalScore: v.number(),
  submissionCount: v.number(),
  isFinished: v.boolean(),
  isDisqualified: v.boolean(),
  tabSwitchCount: v.number(),
  pasteAttemptCount: v.number(),
  hasIdentityPhoto: v.boolean(),
  identityVerificationSkipped: v.boolean(),
  rank: v.number(),
});

async function requireAdmin(ctx: QueryCtx | MutationCtx, token: string) {
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  return session;
}

export const login = mutation({
  args: { adminId: v.string(), password: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const rateLimitKey = "admin_login";
    const now = Date.now();
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", rateLimitKey))
      .unique();

    if (rateLimit?.lockedUntil && now < rateLimit.lockedUntil) {
      const waitSeconds = Math.ceil((rateLimit.lockedUntil - now) / 1000);
      throw new Error(
        `Too many failed login attempts. Account locked for ${waitSeconds} seconds.`,
      );
    }

    const expectedPassword = getAdminPassword();
    const isValid =
      args.adminId.trim() === ADMIN_ID && args.password === expectedPassword;

    if (!isValid) {
      const attempts = (rateLimit?.attempts ?? 0) + 1;
      const lockedUntil =
        attempts >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : undefined;

      if (rateLimit) {
        await ctx.db.patch("rateLimits", rateLimit._id, {
          attempts,
          lastAttemptAt: now,
          lockedUntil,
        });
      } else {
        await ctx.db.insert("rateLimits", {
          key: rateLimitKey,
          attempts,
          lastAttemptAt: now,
          lockedUntil,
        });
      }

      if (lockedUntil) {
        throw new Error(
          "Too many failed login attempts. Locked out for 5 minutes.",
        );
      }
      throw new Error("Invalid admin ID or password.");
    }

    if (rateLimit) {
      await ctx.db.delete("rateLimits", rateLimit._id);
    }

    const token = crypto.randomUUID();
    await ctx.db.insert("adminSessions", {
      token,
      expiresAt: now + SESSION_DURATION_MS,
    });
    return token;
  },
});

export const check = query({
  args: sessionArgs,
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.adminToken))
      .unique();
    return Boolean(session && session.expiresAt >= Date.now());
  },
});

export const logout = mutation({
  args: sessionArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.adminToken))
      .unique();
    if (session) await ctx.db.delete("adminSessions", session._id);
    return null;
  },
});

export const setLeaderboardVisible = mutation({
  args: {
    adminToken: v.string(),
    contestId: v.id("contests"),
    leaderboardVisible: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const contest = await ctx.db.get("contests", args.contestId);
    if (!contest) throw new Error("Contest not found.");
    await ctx.db.patch("contests", args.contestId, {
      leaderboardVisible: args.leaderboardVisible,
    });
    return null;
  },
});

export const setDisqualified = mutation({
  args: {
    adminToken: v.string(),
    participantId: v.id("participants"),
    isDisqualified: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant) throw new Error("Participant not found.");
    await ctx.db.patch("participants", args.participantId, {
      isDisqualified: args.isDisqualified,
    });
    return null;
  },
});

export const dashboard = query({
  args: sessionArgs,
  returns: v.object({
    contestCount: v.number(),
    participantCount: v.number(),
    submissionCount: v.number(),
    activeContestCount: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const contests = await ctx.db.query("contests").take(50);
    let participantCount = 0;
    let submissionCount = 0;
    for (const contest of contests) {
      const participants = await ctx.db
        .query("participants")
        .withIndex("by_contest", (q) => q.eq("contestId", contest._id))
        .take(1000);
      participantCount += participants.length;
      for (const participant of participants) {
        submissionCount +=
          participant.submissionCount ??
          (
            await ctx.db
              .query("submissions")
              .withIndex("by_participant", (q) =>
                q.eq("participantId", participant._id),
              )
              .take(1000)
          ).length;
      }
    }
    return {
      contestCount: contests.length,
      participantCount,
      submissionCount,
      activeContestCount: contests.filter((contest) => contest.isActive).length,
    };
  },
});

export const liveScores = query({
  args: { adminToken: v.string(), contestId: v.id("contests") },
  returns: v.array(liveScoreValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const contest = await ctx.db.get("contests", args.contestId);
    if (!contest) return [];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_contest", (q) => q.eq("contestId", args.contestId))
      .take(1000);

    const now = Date.now();
    const scores: Array<{
      participantId: Id<"participants">;
      name: string;
      email: string;
      totalScore: number;
      submissionCount: number;
      isFinished: boolean;
      isDisqualified: boolean;
      tabSwitchCount: number;
      pasteAttemptCount: number;
      hasIdentityPhoto: boolean;
      identityVerificationSkipped: boolean;
    }> = [];

    for (const participant of participants) {
      const isPastDeadline = Boolean(
        participant.startedAt &&
          (now > participant.startedAt + contest.durationSeconds * 1000 ||
            now > contest.endTime),
      );
      const isFinished = participant.finishedAt !== undefined || isPastDeadline;

      let totalScore = participant.totalScore;
      let submissionCount = participant.submissionCount;

      if (totalScore === undefined || submissionCount === undefined) {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_participant", (q) =>
            q.eq("participantId", participant._id),
          )
          .take(1000);
        totalScore = submissions.reduce(
          (total, item) => total + (item.isCorrect ? item.pointsAwarded : 0),
          0,
        );
        submissionCount = submissions.length;
      }

      scores.push({
        participantId: participant._id,
        name: participant.name,
        email: participant.email,
        totalScore: totalScore ?? 0,
        submissionCount: submissionCount ?? 0,
        isFinished,
        isDisqualified: Boolean(participant.isDisqualified),
        tabSwitchCount: participant.tabSwitchCount ?? 0,
        pasteAttemptCount: participant.pasteAttemptCount ?? 0,
        hasIdentityPhoto: participant.identityPhotoStorageId !== undefined,
        identityVerificationSkipped: Boolean(participant.identityVerificationSkipped),
      });
    }

    scores.sort(
      (left, right) =>
        right.totalScore - left.totalScore ||
        right.submissionCount - left.submissionCount ||
        left.name.localeCompare(right.name),
    );

    return scores.map((score, index) => ({ ...score, rank: index + 1 }));
  },
});

export const participantDetail = query({
  args: { adminToken: v.string(), participantId: v.id("participants") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("participants"),
      contestId: v.id("contests"),
      name: v.string(),
      email: v.string(),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
      tabSwitchCount: v.number(),
      pasteAttemptCount: v.number(),
      isDisqualified: v.optional(v.boolean()),
      totalScore: v.number(),
      submissionCount: v.number(),
      hasIdentityPhoto: v.boolean(),
      identityVerificationSkipped: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant) return null;

    let totalScore = participant.totalScore;
    let submissionCount = participant.submissionCount;
    if (totalScore === undefined || submissionCount === undefined) {
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_participant", (q) =>
          q.eq("participantId", participant._id),
        )
        .take(1000);
      totalScore = submissions.reduce(
        (total, item) => total + (item.isCorrect ? item.pointsAwarded : 0),
        0,
      );
      submissionCount = submissions.length;
    }

    return {
      _id: participant._id,
      contestId: participant.contestId,
      name: participant.name,
      email: participant.email,
      startedAt: participant.startedAt,
      finishedAt: participant.finishedAt,
      tabSwitchCount: participant.tabSwitchCount ?? 0,
      pasteAttemptCount: participant.pasteAttemptCount ?? 0,
      isDisqualified: participant.isDisqualified,
      totalScore: totalScore ?? 0,
      submissionCount: submissionCount ?? 0,
      hasIdentityPhoto: participant.identityPhotoStorageId !== undefined,
      identityVerificationSkipped: Boolean(participant.identityVerificationSkipped),
    };
  },
});

export const participantIdentityPhotoUrl = query({
  args: { adminToken: v.string(), participantId: v.id("participants") },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.identityPhotoStorageId === undefined) {
      return null;
    }
    return await ctx.storage.getUrl(participant.identityPhotoStorageId);
  },
});

export const participantSubmissions = query({
  args: { adminToken: v.string(), participantId: v.id("participants") },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      questionId: v.id("questions"),
      questionTitle: v.string(),
      questionOrder: v.number(),
      submittedQuery: v.string(),
      isCorrect: v.boolean(),
      pointsAwarded: v.number(),
      submittedAt: v.number(),
      attemptNumber: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminToken);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId),
      )
      .order("desc")
      .take(100);

    const result = [];
    for (const sub of submissions) {
      const question = await ctx.db.get("questions", sub.questionId);
      result.push({
        _id: sub._id,
        questionId: sub.questionId,
        questionTitle: question?.title ?? "Unknown Question",
        questionOrder: question?.order ?? 0,
        submittedQuery: sub.submittedQuery,
        isCorrect: sub.isCorrect,
        pointsAwarded: sub.pointsAwarded,
        submittedAt: sub.submittedAt,
        attemptNumber: sub.attemptNumber,
      });
    }

    return result;
  },
});
