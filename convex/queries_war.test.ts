/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { executeAndGrade, hashResult } from "./grading";

const modules = import.meta.glob("./**/*.ts");

describe("Queries War - Core Test Suite", () => {
  test("Result hashing is sensitive to row order (ORDER BY sensitivity)", () => {
    const rowA = { id: 1, name: "Alice", score: 100 };
    const rowB = { id: 2, name: "Bob", score: 200 };

    const hash1 = hashResult([rowA, rowB]);
    const hash2 = hashResult([rowB, rowA]);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
  });

  test("executeAndGrade grades queries correctly based on server-side evaluation", async () => {
    const seed = "CREATE TABLE users (id INT, name TEXT); INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');";
    const correctQuery = "SELECT name FROM users ORDER BY name ASC;";
    const wrongOrderQuery = "SELECT name FROM users ORDER BY name DESC;";

    // Hash for expected result: Alice, Bob
    const expectedHash = hashResult([{ name: "Alice" }, { name: "Bob" }]);

    const correctGrade = await executeAndGrade(seed, correctQuery, expectedHash);
    expect(correctGrade.isCorrect).toBe(true);

    const wrongGrade = await executeAndGrade(seed, wrongOrderQuery, expectedHash);
    expect(wrongGrade.isCorrect).toBe(false);
  });

  test("Contest lifecycle, registration, and submission verification", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    // 1. Create a contest
    const contestId = await t.run(async (ctx) => {
      return await ctx.db.insert("contests", {
        title: "Test Contest",
        startTime: now - 1000,
        endTime: now + 3600_000,
        durationSeconds: 3600,
        isActive: true,
        leaderboardVisible: true,
      });
    });

    // 2. Insert a question
    const questionId = await t.run(async (ctx) => {
      const seedDataSql = "CREATE TABLE items (id INT, val TEXT); INSERT INTO items VALUES (1, 'X');";
      const expectedResultHash = hashResult([{ val: "X" }]);
      return await ctx.db.insert("questions", {
        contestId,
        order: 1,
        difficulty: "easy",
        title: "Sample Question",
        promptMarkdown: "Select val from items",
        seedDataSql,
        expectedResultHash,
        points: 10,
      });
    });

    // 3. Register a participant
    const { participantId, participantToken } = await t.mutation(
      api.participants.create,
      {
        contestId,
        name: "Test Runner",
        email: "runner@example.com",
      },
    );

    expect(participantId).toBeDefined();
    expect(participantToken).toBeDefined();

    // 4. Test submission authorization (wrong token fails)
    await expect(
      t.mutation(internal.submissionStore.validateAndGetQuestion, {
        participantId,
        participantToken: "invalid-token",
        questionId,
      }),
    ).rejects.toThrow("Participant session is invalid.");

    // 5. Test valid participant validation
    const validPrep = await t.mutation(
      internal.submissionStore.validateAndGetQuestion,
      {
        participantId,
        participantToken,
        questionId,
      },
    );
    expect(validPrep.question.points).toBe(10);
    expect(validPrep.isFinal).toBe(true);

    // 6. Record submission and verify score
    const recordResult = await t.mutation(
      internal.submissionStore.recordSubmission,
      {
        participantId,
        questionId,
        submittedQuery: "SELECT val FROM items;",
        isCorrect: true,
        pointsAwarded: 10,
        isFinal: true,
        submittedAt: now,
      },
    );

    expect(recordResult.totalScore).toBe(10);

    // 7. Verify participant is marked finished and cannot submit again
    await expect(
      t.mutation(internal.submissionStore.validateAndGetQuestion, {
        participantId,
        participantToken,
        questionId,
      }),
    ).rejects.toThrow("This contest has already been submitted.");
  });

  test("Disqualified participant cannot submit answers", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    const contestId = await t.run(async (ctx) => {
      return await ctx.db.insert("contests", {
        title: "Disqualification Test Contest",
        startTime: now - 1000,
        endTime: now + 3600_000,
        durationSeconds: 3600,
        isActive: true,
        leaderboardVisible: true,
      });
    });

    const questionId = await t.run(async (ctx) => {
      return await ctx.db.insert("questions", {
        contestId,
        order: 1,
        difficulty: "easy",
        title: "Q1",
        promptMarkdown: "prompt",
        seedDataSql: "CREATE TABLE t(a INT);",
        expectedResultHash: "somehash",
        points: 10,
      });
    });

    const { participantId, participantToken } = await t.mutation(
      api.participants.create,
      {
        contestId,
        name: "Cheater",
        email: "cheater@example.com",
      },
    );

    // Disqualify participant
    await t.run(async (ctx) => {
      await ctx.db.patch("participants", participantId, {
        isDisqualified: true,
      });
    });

    await expect(
      t.mutation(internal.submissionStore.validateAndGetQuestion, {
        participantId,
        participantToken,
        questionId,
      }),
    ).rejects.toThrow("Participant is disqualified.");
  });

  test("Leaderboard respects leaderboardVisible and tie-break sorting", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    const contestId = await t.run(async (ctx) => {
      return await ctx.db.insert("contests", {
        title: "Leaderboard Contest",
        startTime: now - 1000,
        endTime: now + 3600_000,
        durationSeconds: 3600,
        isActive: true,
        leaderboardVisible: true,
      });
    });

    // Participant A: Score 20, finished fast
    await t.run(async (ctx) => {
      await ctx.db.insert("participants", {
        contestId,
        name: "Alice",
        email: "alice@test.com",
        startedAt: now - 500_000,
        finishedAt: now - 400_000, // 100s
        tabSwitchCount: 0,
        pasteAttemptCount: 0,
        totalScore: 20,
        lastSubmittedAt: now - 400_000,
      });
    });

    // Participant B: Score 20, took longer
    await t.run(async (ctx) => {
      await ctx.db.insert("participants", {
        contestId,
        name: "Bob",
        email: "bob@test.com",
        startedAt: now - 500_000,
        finishedAt: now - 200_000, // 300s
        tabSwitchCount: 0,
        pasteAttemptCount: 0,
        totalScore: 20,
        lastSubmittedAt: now - 200_000,
      });
    });

    // Participant C: Score 30 (winner)
    await t.run(async (ctx) => {
      await ctx.db.insert("participants", {
        contestId,
        name: "Charlie",
        email: "charlie@test.com",
        startedAt: now - 500_000,
        finishedAt: now - 100_000,
        tabSwitchCount: 0,
        pasteAttemptCount: 0,
        totalScore: 30,
        lastSubmittedAt: now - 100_000,
      });
    });

    const leaderboard = await t.query(api.leaderboard.get, { contestId });
    expect(leaderboard).toHaveLength(3);
    expect(leaderboard[0].name).toBe("Charlie"); // 30 pts (Rank 1)
    expect(leaderboard[1].name).toBe("Alice"); // 20 pts, 100s (Rank 2)
    expect(leaderboard[2].name).toBe("Bob"); // 20 pts, 300s (Rank 3)

    // Hide leaderboard and verify it returns empty
    await t.run(async (ctx) => {
      await ctx.db.patch("contests", contestId, { leaderboardVisible: false });
    });

    const hiddenLeaderboard = await t.query(api.leaderboard.get, { contestId });
    expect(hiddenLeaderboard).toEqual([]);
  });

  test("Starting a new contest enforces single active contest rule", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const adminToken = "test-admin-session-token";

    await t.run(async (ctx) => {
      await ctx.db.insert("adminSessions", {
        token: adminToken,
        expiresAt: now + 3600_000,
      });
    });

    const contestA = await t.run(async (ctx) => {
      return await ctx.db.insert("contests", {
        title: "Contest A",
        startTime: now - 1000,
        endTime: now + 3600_000,
        durationSeconds: 3600,
        isActive: true,
        leaderboardVisible: true,
      });
    });

    const contestB = await t.run(async (ctx) => {
      return await ctx.db.insert("contests", {
        title: "Contest B",
        startTime: now + 10_000,
        endTime: now + 3600_000,
        durationSeconds: 3600,
        isActive: false,
        leaderboardVisible: true,
      });
    });

    // Start Contest B
    await t.mutation(api.contests.adminStart, {
      adminToken,
      contestId: contestB,
    });

    const updatedContestA = await t.run(async (ctx) => {
      return await ctx.db.get("contests", contestA);
    });
    const updatedContestB = await t.run(async (ctx) => {
      return await ctx.db.get("contests", contestB);
    });

    expect(updatedContestB?.isActive).toBe(true);
    expect(updatedContestA?.isActive).toBe(false);
  });

  test("participants.mySubmissions returns participant submissions with question metadata", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    const contestId = await t.run(async (ctx) => {
      return await ctx.db.insert("contests", {
        title: "Submissions Test Contest",
        startTime: now - 1000,
        endTime: now + 3600_000,
        durationSeconds: 3600,
        isActive: true,
        leaderboardVisible: true,
      });
    });

    const questionId = await t.run(async (ctx) => {
      return await ctx.db.insert("questions", {
        contestId,
        order: 1,
        difficulty: "easy",
        title: "Test Q1",
        promptMarkdown: "prompt",
        seedDataSql: "CREATE TABLE t(a INT);",
        expectedResultHash: "hash123",
        points: 10,
      });
    });

    const { participantId, participantToken } = await t.mutation(
      api.participants.create,
      {
        contestId,
        name: "Contestant 1",
        email: "contestant1@test.com",
      },
    );

    // Record a submission
    await t.mutation(internal.submissionStore.recordSubmission, {
      participantId,
      questionId,
      submittedQuery: "SELECT * FROM t;",
      isCorrect: true,
      pointsAwarded: 10,
      isFinal: false,
      submittedAt: now,
    });

    // Query with valid token
    const mySubs = await t.query(api.participants.mySubmissions, {
      participantId,
      participantToken,
    });

    expect(mySubs).toHaveLength(1);
    expect(mySubs[0].questionTitle).toBe("Test Q1");
    expect(mySubs[0].questionOrder).toBe(1);
    expect(mySubs[0].pointsAwarded).toBe(10);
    expect(mySubs[0].isCorrect).toBe(true);
    expect(mySubs[0].attemptNumber).toBe(1);

    // Query with invalid token returns empty list
    const unauthorizedSubs = await t.query(api.participants.mySubmissions, {
      participantId,
      participantToken: "wrong-token",
    });
    expect(unauthorizedSubs).toEqual([]);
  });
});
