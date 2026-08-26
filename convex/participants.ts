import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    contestId: v.id("contests"),
    name: v.string(),
    email: v.string(),
  },
  returns: v.id("participants"),
  handler: async (ctx, args) => {
    const contest = await ctx.db.get("contests", args.contestId);
    if (!contest) throw new Error("That contest could not be found.");
    if (contest.isActive === false && Date.now() > contest.endTime) {
      throw new Error("This contest is no longer accepting registrations.");
    }

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    if (!name || !email) throw new Error("Name and email are required.");

    return await ctx.db.insert("participants", {
      contestId: args.contestId,
      name,
      email,
      startedAt: Date.now(),
      tabSwitchCount: 0,
      pasteAttemptCount: 0,
    });
  },
});

export const get = query({
  args: { participantId: v.id("participants") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("participants"),
      _creationTime: v.number(),
      contestId: v.id("contests"),
      name: v.string(),
      email: v.string(),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
      tabSwitchCount: v.number(),
      pasteAttemptCount: v.number(),
      isDisqualified: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => await ctx.db.get("participants", args.participantId),
});
