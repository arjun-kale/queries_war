import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    contestId: v.id("contests"),
    name: v.string(),
    email: v.string(),
  },
  returns: v.object({ participantId: v.id("participants"), participantToken: v.string() }),
  handler: async (ctx, args) => {
    const contest = await ctx.db.get("contests", args.contestId);
    if (!contest) throw new Error("That contest could not be found.");
    const now = Date.now();
    if (!contest.isActive || now < contest.startTime || now > contest.endTime) {
      throw new Error("This contest is not accepting registrations right now.");
    }

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    if (!name || !email) throw new Error("Name and email are required.");
    if (name.length > 100 || email.length > 200) throw new Error("Name or email is too long.");

    const participantToken = crypto.randomUUID();
    const participantId = await ctx.db.insert("participants", {
      contestId: args.contestId,
      participantToken,
      name,
      email,
      startedAt: Date.now(),
      tabSwitchCount: 0,
      pasteAttemptCount: 0,
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
    }),
  ),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get("participants", args.participantId);
    if (!participant || participant.participantToken !== args.participantToken) return null;
    const { participantToken: _, ...publicParticipant } = participant;
    return publicParticipant;
  },
});
