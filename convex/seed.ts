import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const CONTEST_TITLE = "Queries War";

const catalogSql = String.raw`CREATE TABLE titles (id INTEGER PRIMARY KEY, title TEXT, type TEXT, release_year INTEGER, genre TEXT, rating REAL);
INSERT INTO titles VALUES
 (1,'Neon Samurai','Anime',2022,'Action',8.7),(2,'Moonlit Detectives','Movie',2021,'Mystery',8.2),
 (3,'Skybound Academy','Anime',2023,'Fantasy',9.1),(4,'Paper Cranes','Movie',2020,'Drama',7.8),
 (5,'Pixel Raiders','Anime',2024,'Action',8.5),(6,'Last Train Home','Movie',2022,'Drama',8.9),
 (7,'Ocean Signal','Anime',2021,'Sci-Fi',7.5),(8,'Ember City','Anime',2023,'Action',8.0);`;

const usersSql = String.raw`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, country TEXT);
INSERT INTO users VALUES (1,'Asha Nair','India'),(2,'Kenji Sato','Japan'),(3,'Mira Chen','United States'),(4,'Leo Martins','India'),(5,'Sofia Costa','Brazil'),(6,'Omar Haddad','United Kingdom');`;

const historySql = String.raw`CREATE TABLE watch_history (id INTEGER PRIMARY KEY, user_id INTEGER, title_id INTEGER, minutes_watched INTEGER, progress_percent INTEGER, completed INTEGER, watched_at TEXT);
INSERT INTO watch_history VALUES
 (1,1,1,95,100,1,'2026-03-01'),(2,1,3,120,60,0,'2026-03-02'),
 (3,2,3,45,40,0,'2026-03-01'),(4,2,5,100,100,1,'2026-03-04'),
 (5,3,2,130,100,1,'2026-03-02'),(6,3,6,110,100,1,'2026-03-05'),
 (7,4,1,60,50,0,'2026-03-03'),(8,4,8,90,100,1,'2026-03-06'),
 (9,5,4,100,100,1,'2026-03-01'),(10,6,7,70,55,0,'2026-03-07'),
 (11,6,1,125,100,1,'2026-03-08'),(12,2,2,75,100,1,'2026-03-09');`;

const reviewsSql = String.raw`CREATE TABLE reviews (id INTEGER PRIMARY KEY, user_id INTEGER, title_id INTEGER, score INTEGER);
INSERT INTO reviews VALUES
 (1,1,1,9),(2,2,3,10),(3,3,2,8),(4,4,1,8),(5,5,3,9),
 (6,6,5,9),(7,1,6,10),(8,2,6,9),(9,3,5,8),(10,4,8,8),(11,5,2,7),(12,6,4,7);`;

type Seed = {
  order: number;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  promptMarkdown: string;
  seedDataSql: string;
  expectedResultHash: string;
  testCases?: Array<{ seedDataSql: string; expectedResultHash: string }>;
  points: number;
};

// Keep authoring notes out of the SQL that is sent to contestants. The
// expected hashes remain the grading key, but the answer and result rows must
// never be visible in the contest database.
function sanitizeSeedSql(seedSql: string) {
  return seedSql
    .replace(/^\s*-- (?:Correct query|Expected row(?:s)?):.*(?:\r?\n|$)/gm, "")
    .trim();
}

const questions: Seed[] = [
  { order: 1, difficulty: "easy", title: "Browse the premiere shelf", points: 10, promptMarkdown: "List every title with title, release year, and rating. Sort by release year descending, then title ascending.\n\nSchema: titles(id, title, type, release_year, genre, rating)", seedDataSql: catalogSql, expectedResultHash: "f1fa032c1872a751e459b1d04eb84d776f0cce201142fea9cab30b4f0e076413" },
  { order: 2, difficulty: "easy", title: "Find acclaimed anime", points: 10, promptMarkdown: "Find Anime titles rated at least 8.5. Return title and rating, highest rating first.\n\nSchema: titles(id, title, type, release_year, genre, rating)", seedDataSql: catalogSql, expectedResultHash: "9a6d0154eb971762c6802e9ba699fbe8ea6a9b5110c3cdf70fbd5f53f6b479cc" },
  { order: 3, difficulty: "easy", title: "Top three ratings", points: 10, promptMarkdown: "Return the three highest-rated titles with title and rating.\n\nSchema: titles(id, title, type, release_year, genre, rating)", seedDataSql: catalogSql, expectedResultHash: "f5c471a95e8a4c7f95e622f025343794a70694b187b921c9cfb725ccf42de1e7" },
  { order: 4, difficulty: "easy", title: "Home-country viewers", points: 10, promptMarkdown: "List users from India, returning name and country alphabetically by name.\n\nSchema: users(id, name, country)", seedDataSql: `-- Correct query: SELECT name, country FROM users WHERE country = 'India' ORDER BY name;\n-- Expected rows: ('Asha Nair','India'), ('Leo Martins','India')\n${usersSql}`, expectedResultHash: "73e0c96037256a53f671fb05f0b1b0f2a338e105620d85255e058805e3fa58e2" },
  { order: 5, difficulty: "easy", title: "Completed watch minutes", points: 10, promptMarkdown: "Count completed watch records and sum their minutes. Return completed_watch_count and total_minutes.\n\nSchema: watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: SELECT COUNT(*) AS completed_watch_count, SUM(minutes_watched) AS total_minutes FROM watch_history WHERE completed = 1;\n-- Expected row: (8,825)\n${historySql}`, expectedResultHash: "da8002f578dca53a03e779e192872dcdb0cc57458c16a2b2c3ff3f9f23b44c65" },
  { order: 6, difficulty: "medium", title: "Name the completed watches", points: 20, promptMarkdown: "Show each completed watch with the user's name, title id, and minutes watched. Use an INNER JOIN and preserve watch record order.\n\nSchema: users(id, name, country); watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: SELECT u.name AS user_name, wh.title_id, wh.minutes_watched FROM users u INNER JOIN watch_history wh ON wh.user_id = u.id WHERE wh.completed = 1 ORDER BY wh.id;\n-- Expected rows: ('Asha Nair',1,95), ('Kenji Sato',5,100), ('Mira Chen',2,130), ('Mira Chen',6,110), ('Leo Martins',8,90), ('Sofia Costa',4,100), ('Omar Haddad',1,125), ('Kenji Sato',2,75)\n${usersSql}\n${historySql}`, expectedResultHash: "d32aa8f3f0634b6fdcb6ac79f7be1c27e7d9baf222c11af5d315446c9bd4e94b" },
  { order: 7, difficulty: "medium", title: "Viewers and their history", points: 20, promptMarkdown: "List every user and their number of watch records, including users with none. Return name and watch_count ordered by user id. Use a LEFT JOIN.\n\nSchema: users(id, name, country); watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: SELECT u.name, COUNT(wh.id) AS watch_count FROM users u LEFT JOIN watch_history wh ON wh.user_id = u.id GROUP BY u.id, u.name ORDER BY u.id;\n-- Expected rows: ('Asha Nair',2), ('Kenji Sato',3), ('Mira Chen',2), ('Leo Martins',2), ('Sofia Costa',1), ('Omar Haddad',2)\n${usersSql}\n${historySql}`, expectedResultHash: "4cf7487c02f4a523dad1100a9c697bb2746bcddb7f6a6d140be182f1a61d24d1" },
  { order: 8, difficulty: "medium", title: "Popular catalog entries", points: 20, promptMarkdown: "Find title ids watched at least twice. Return title_id and watch_count, sorted by watch_count descending then title_id. Use GROUP BY and HAVING.\n\nSchema: watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: SELECT title_id, COUNT(*) AS watch_count FROM watch_history GROUP BY title_id HAVING COUNT(*) >= 2 ORDER BY watch_count DESC, title_id;\n-- Expected rows: (1,2), (2,2), (3,2)\n${historySql}`, expectedResultHash: "c07155da0b9dfcfc3005bb78f1fcba9b9b8fc172a01c4ac785f6550ee0662e0f" },
  { order: 9, difficulty: "medium", title: "Above the catalog average", points: 20, promptMarkdown: "Return titles rated above the average rating of all titles. Include title and rating, highest first. Use a subquery in WHERE.\n\nSchema: titles(id, title, type, release_year, genre, rating)", seedDataSql: `-- Correct query: SELECT title, rating FROM titles WHERE rating > (SELECT AVG(rating) FROM titles) ORDER BY rating DESC;\n-- Expected rows: ('Skybound Academy',9.1), ('Last Train Home',8.9), ('Neon Samurai',8.7), ('Pixel Raiders',8.5)\n${catalogSql}`, expectedResultHash: "46b20fec1ca0151fba3f745a81df60998a29570be7ee24193a4fdf44dfb40ad3" },
  { order: 10, difficulty: "medium", title: "Anime watchers", points: 20, promptMarkdown: "Find users who watched at least one Anime title. Return unique names alphabetically. Use a subquery in WHERE.\n\nSchema: users(id, name, country); titles(id, title, type, release_year, genre, rating); watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: SELECT name FROM users WHERE id IN (SELECT user_id FROM watch_history WHERE title_id IN (SELECT id FROM titles WHERE type = 'Anime')) ORDER BY name;\n-- Expected rows: ('Asha Nair'), ('Kenji Sato'), ('Leo Martins'), ('Omar Haddad')\n${usersSql}\n${catalogSql}\n${historySql}`, expectedResultHash: "3fc36a32cb834e5466d96566a4e6484ac1afb89ac4000c0ca85855e0793f793d" },
  { order: 11, difficulty: "hard", title: "Completed minutes by country", points: 30, promptMarkdown: "For completed watches, calculate total minutes by viewer country. Return country and completed_minutes, highest total first.\n\nSchema: users(id, name, country); watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: SELECT u.country, SUM(wh.minutes_watched) AS completed_minutes FROM users u JOIN watch_history wh ON wh.user_id = u.id WHERE wh.completed = 1 GROUP BY u.country ORDER BY completed_minutes DESC;\n-- Expected rows: ('United States',240), ('Japan',175), ('India',185), ('United Kingdom',125), ('Brazil',100) [exact order: United States, India, Japan, United Kingdom, Brazil by totals 240,185,175,125,100]\n${usersSql}\n${historySql}`, expectedResultHash: "7760c981f2d99ebe020f37a7c2744c25f9c5ff4eaf7accb752f687e183d04848" },
  { order: 12, difficulty: "hard", title: "Rank by critic score", points: 30, promptMarkdown: "Average each reviewed title's score and rank titles using RANK(), with highest average first. Return title, avg_score, and score_rank.\n\nSchema: titles(id, title, type, release_year, genre, rating); reviews(id, user_id, title_id, score)", seedDataSql: `-- Correct query: SELECT t.title, AVG(r.score) AS avg_score, RANK() OVER (ORDER BY AVG(r.score) DESC) AS score_rank FROM titles t JOIN reviews r ON r.title_id = t.id GROUP BY t.id, t.title ORDER BY score_rank, t.title;\n-- Expected rows: ('Skybound Academy',9.5,1), ('Last Train Home',9.5,1), ('Neon Samurai',8.5,3), ('Pixel Raiders',8.5,3), ('Ember City',8.0,5), ('Moonlit Detectives',7.5,6), ('Paper Cranes',7.0,7)\n${catalogSql}\n${reviewsSql}`, expectedResultHash: "05b7fca51474f08a9c174d3bfca659600a35dac9e5524295726f90a611917f2c" },
  { order: 13, difficulty: "hard", title: "Latest watch per viewer", points: 30, promptMarkdown: "Return each user's latest watch using ROW_NUMBER(). Include name, title_id, and watched_at, ordered by name.\n\nSchema: users(id, name, country); watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: WITH ranked AS (SELECT u.name, wh.title_id, wh.watched_at, ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY wh.watched_at DESC, wh.id DESC) AS row_num FROM users u JOIN watch_history wh ON wh.user_id = u.id) SELECT name, title_id, watched_at FROM ranked WHERE row_num = 1 ORDER BY name;\n-- Expected rows: ('Asha Nair',3,'2026-03-02'), ('Kenji Sato',2,'2026-03-09'), ('Leo Martins',8,'2026-03-06'), ('Mira Chen',6,'2026-03-05'), ('Omar Haddad',1,'2026-03-08'), ('Sofia Costa',4,'2026-03-01')\n${usersSql}\n${historySql}`, expectedResultHash: "e213c255c1a34f8b7b684116e285bd21cb4d9c34efe2bf8470df9431650a3309" },
  { order: 14, difficulty: "hard", title: "Genre standouts", points: 30, promptMarkdown: "Find titles rated above the average rating of their own genre. Return title, genre, and rating sorted by rating descending. Use a correlated subquery.\n\nSchema: titles(id, title, type, release_year, genre, rating)", seedDataSql: `-- Correct query: SELECT t.title, t.genre, t.rating FROM titles t WHERE t.rating > (SELECT AVG(t2.rating) FROM titles t2 WHERE t2.genre = t.genre) ORDER BY t.rating DESC;\n-- Expected rows: ('Last Train Home','Drama',8.9), ('Neon Samurai','Action',8.7), ('Pixel Raiders','Action',8.5)\n${catalogSql}`, expectedResultHash: "453d825a64bea4e825c1a50c9e4aa7ea419d127f901d04ad058af273623c647e" },
  { order: 15, difficulty: "hard", title: "Binge leaderboard", points: 30, promptMarkdown: "Use a CTE to total completed watch minutes per user. Return name and completed_minutes, highest total first.\n\nSchema: users(id, name, country); watch_history(id, user_id, title_id, minutes_watched, progress_percent, completed, watched_at)", seedDataSql: `-- Correct query: WITH completed AS (SELECT user_id, minutes_watched FROM watch_history WHERE completed = 1) SELECT u.name, SUM(c.minutes_watched) AS completed_minutes FROM users u JOIN completed c ON c.user_id = u.id GROUP BY u.id, u.name ORDER BY completed_minutes DESC;\n-- Expected rows: ('Mira Chen',240), ('Kenji Sato',175), ('Omar Haddad',125), ('Sofia Costa',100), ('Asha Nair',95), ('Leo Martins',90)\n${usersSql}\n${historySql}`, expectedResultHash: "0b15f5d8224d4c9eadb1824b530201dc4d84c72ff8689b7cfd0bc711d283e624" },
];

export const seed = internalMutation({
  args: {},
  returns: v.object({ contestId: v.id("contests"), created: v.number(), replaced: v.boolean() }),
  handler: async (ctx) => {
    const timestamp = Date.now();
    const existing = await ctx.db.query("contests").withIndex("by_title", (q) => q.eq("title", CONTEST_TITLE)).take(1);
    const contestId = existing[0]?._id ?? await ctx.db.insert("contests", { title: CONTEST_TITLE, startTime: timestamp, endTime: timestamp + 3_600_000, durationSeconds: 3600, isActive: true, leaderboardVisible: true });
    if (existing[0]) await ctx.db.patch("contests", contestId, { startTime: timestamp, endTime: timestamp + 3_600_000, durationSeconds: 3600, isActive: true, leaderboardVisible: true });
    const oldQuestions = await ctx.db.query("questions").withIndex("by_contest", (q) => q.eq("contestId", contestId)).take(100);
    for (const question of oldQuestions) await ctx.db.delete("questions", question._id);
    for (const question of questions) {
      await ctx.db.insert("questions", {
        ...question,
        contestId,
        seedDataSql: sanitizeSeedSql(question.seedDataSql),
        testCases: question.testCases?.map((testCase) => ({
          ...testCase,
          seedDataSql: sanitizeSeedSql(testCase.seedDataSql),
        })),
      });
    }
    return { contestId, created: questions.length, replaced: oldQuestions.length > 0 };
  },
});
