import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_REGISTRATIONS_PER_MINUTE = 60;
const REGISTRATION_WINDOW_MS = 60 * 1000;
// Rate-limit counting is sharded across multiple documents so concurrent
// registrations don't all read-modify-write the same row. A single shared
// counter causes OptimisticConcurrencyControlFailure under real bursts (e.g.
// 30+ contestants registering within the same few seconds) — verified via a
// 35-concurrent-registration load test where ~11% of requests hard-failed
// with a single-row counter. Each shard gets its own slice of the budget;
// exact precision isn't the point here, avoiding write contention is.
const RATE_LIMIT_SHARD_COUNT = 8;
const MAX_REGISTRATIONS_PER_SHARD = Math.ceil(
  MAX_REGISTRATIONS_PER_MINUTE / RATE_LIMIT_SHARD_COUNT,
);

export const create = mutation({
  args: {
    contestId: v.id("contests"),
    name: v.string(),
    email: v.string(),
  },
  returns: v.object({
    participantId: v.id("participants"),
    participantToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const contest = await ctx.db.get("contests", args.contestId);
    if (!contest) throw new Error("That contest could not be found.");
    const now = Date.now();
    if (!contest.isActive || now > contest.endTime) {
      throw new Error("This contest is not accepting registrations right now.");
    }

    // Rate limiting registrations per contest, sharded to avoid contention
    // (see RATE_LIMIT_SHARD_COUNT comment above).
    const shard = Math.floor(Math.random() * RATE_LIMIT_SHARD_COUNT);
    const rateLimitKey = `register:${args.contestId}:${shard}`;
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", rateLimitKey))
      .unique();

    if (rateLimit) {
      if (now - rateLimit.lastAttemptAt < REGISTRATION_WINDOW_MS) {
        if (rateLimit.attempts >= MAX_REGISTRATIONS_PER_SHARD) {
          throw new Error("Registration is busy. Please try again in a few moments.");
        }
        await ctx.db.patch("rateLimits", rateLimit._id, {
          attempts: rateLimit.attempts + 1,
        });
      } else {
        await ctx.db.patch("rateLimits", rateLimit._id, {
          attempts: 1,
          lastAttemptAt: now,
        });
      }
    } else {
      await ctx.db.insert("rateLimits", {
        key: rateLimitKey,
        attempts: 1,
        lastAttemptAt: now,
      });
    }

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    if (!name || !email) throw new Error("Name and email are required.");
    if (name.length > 100 || email.length > 200) {
      throw new Error("Name or email is too long.");
    }
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_contest_email", (q) =>
        q.eq("contestId", args.contestId).eq("email", email),
      )
      .unique();
    if (existing) {
      throw new Error("This email is already registered for the contest.");
    }

    const participantToken = crypto.randomUUID();
    const startedAt = Math.max(now, contest.startTime);
    const participantId = await ctx.db.insert("participants", {
      contestId: args.contestId,
      participantToken,
      name,
      email,
      startedAt,
      tabSwitchCount: 0,
      pasteAttemptCount: 0,
      totalScore: 0,
      submissionCount: 0,
      lastSubmittedAt: 0,
    });
    return { participantId, participantToken };
  },
});

export const get = query({
  args: { participantId: v.id("participants"), participantToken: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("participants"),
      _creationTime: v.number(),
      contestId: v.id("contests"),
      participantToken: v.optional(v.string()),
      name: v.string(),
      email: v.string(),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
      tabSwitchCount: v.number(),
      pasteAttemptCount: v.number(),
      isDisqualified: v.optional(v.boolean()),
      totalScore: v.optional(v.number()),
      submissionCount: v.optional(v.number()),
      lastSubmittedAt: v.optional(v.number()),
      hasIdentityPhoto: v.boolean(),
      identityVerificationSkipped: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) {
      return null;
    }

    return {
      _id: participant._id,
      _creationTime: participant._creationTime,
      contestId: participant.contestId,
      name: participant.name,
      email: participant.email,
      startedAt: participant.startedAt,
      finishedAt: participant.finishedAt,
      tabSwitchCount: participant.tabSwitchCount,
      pasteAttemptCount: participant.pasteAttemptCount,
      isDisqualified: participant.isDisqualified,
      totalScore: participant.totalScore,
      submissionCount: participant.submissionCount,
      lastSubmittedAt: participant.lastSubmittedAt,
      hasIdentityPhoto: participant.identityPhotoStorageId !== undefined,
      identityVerificationSkipped: participant.identityVerificationSkipped,
    };
  },
});

export const recordEvent = mutation({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
    event: v.union(v.literal("tabSwitch"), v.literal("pasteAttempt")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (
      !participant ||
      participant.participantToken !== args.participantToken ||
      participant.finishedAt !== undefined ||
      participant.isDisqualified
    ) {
      return null;
    }

    await ctx.db.patch(
      "participants",
      args.participantId,
      args.event === "tabSwitch"
        ? { tabSwitchCount: participant.tabSwitchCount + 1 }
        : { pasteAttemptCount: participant.pasteAttemptCount + 1 },
    );
    return null;
  },
});

export const generateIdentityPhotoUploadUrl = mutation({
  args: { participantId: v.id("participants"), participantToken: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) {
      throw new Error("Participant session is invalid.");
    }
    if (participant.isDisqualified) {
      throw new Error("Participant is disqualified.");
    }
    if (participant.identityPhotoStorageId !== undefined) {
      throw new Error("An identity photo has already been recorded.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveIdentityPhoto = mutation({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) {
      throw new Error("Participant session is invalid.");
    }
    if (participant.identityPhotoStorageId !== undefined) {
      throw new Error("An identity photo has already been recorded.");
    }
    await ctx.db.patch("participants", args.participantId, {
      identityPhotoStorageId: args.storageId,
    });
    return null;
  },
});

export const skipIdentityVerification = mutation({
  args: { participantId: v.id("participants"), participantToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) {
      throw new Error("Participant session is invalid.");
    }
    if (participant.identityPhotoStorageId !== undefined) {
      return null;
    }
    await ctx.db.patch("participants", args.participantId, {
      identityVerificationSkipped: true,
    });
    return null;
  },
});

export const mySubmissions = query({
  args: { participantId: v.id("participants"), participantToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      questionId: v.id("questions"),
      questionOrder: v.number(),
      questionTitle: v.string(),
      difficulty: v.string(),
      points: v.number(),
      submittedQuery: v.string(),
      isCorrect: v.boolean(),
      pointsAwarded: v.number(),
      attemptNumber: v.number(),
      submittedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) {
      return [];
    }

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_participant", (q) => q.eq("participantId", args.participantId))
      .collect();

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_contest", (q) => q.eq("contestId", participant.contestId))
      .collect();

    const questionMap = new Map(questions.map((q) => [q._id, q]));

    return submissions
      .map((sub) => {
        const question = questionMap.get(sub.questionId);
        return {
          _id: sub._id,
          questionId: sub.questionId,
          questionOrder: question?.order ?? 0,
          questionTitle: question?.title ?? "Question",
          difficulty: question?.difficulty ?? "easy",
          points: question?.points ?? 10,
          submittedQuery: sub.submittedQuery,
          isCorrect: sub.isCorrect,
          pointsAwarded: sub.pointsAwarded,
          attemptNumber: sub.attemptNumber,
          submittedAt: sub.submittedAt,
        };
      })
      .sort((a, b) => a.questionOrder - b.questionOrder || a.submittedAt - b.submittedAt);
  },
});
