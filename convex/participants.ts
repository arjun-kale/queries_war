import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_REGISTRATIONS_PER_MINUTE = 60;
const REGISTRATION_WINDOW_MS = 60 * 1000;

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

    // Rate limiting registrations per contest
    const rateLimitKey = `register:${args.contestId}`;
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", rateLimitKey))
      .unique();

    if (rateLimit) {
      if (now - rateLimit.lastAttemptAt < REGISTRATION_WINDOW_MS) {
        if (rateLimit.attempts >= MAX_REGISTRATIONS_PER_MINUTE) {
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
