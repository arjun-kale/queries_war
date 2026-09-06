import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const CONTEST_TITLE = "Queries War";

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

function sanitizeSeedSql(seedSql: string) {
  return seedSql
    .replace(/^\s*-- (?:Correct query|Expected row(?:s)?):.*(?:\r?\n|$)/gm, "")
    .trim();
}

// Final question bank — see QUESTION_BANK.md for the authored reference
// (prompts, correct queries, and hash derivation notes). Every
// expectedResultHash below was independently re-verified against this
// project's own grading engine (convex/grading.ts) before being seeded.
const questions: Seed[] = [
  {
    order: 1,
    difficulty: "easy",
    title: "Fresh Fruits",
    points: 10,
    promptMarkdown:
      "Return id, name, price, and stock for fruits with stock greater than 50, ordered by stock descending.\n\nSchema: fruits(id, name, price, stock)",
    seedDataSql: String.raw`CREATE TABLE fruits (id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);
INSERT INTO fruits VALUES
(1,'Apple',120,80),
(2,'Banana',50,30),
(3,'Mango',200,65),
(4,'Grapes',350,20),
(5,'Orange',100,55);`,
    expectedResultHash: "7057272919fd2c895078d238091dd950c4fcd381bab94d7f4d2ca38bf678fbf2",
  },
  {
    order: 2,
    difficulty: "easy",
    title: "Active Members",
    points: 10,
    promptMarkdown:
      "Return name and city of members where is_active = 1.\n\nSchema: members(id, name, city, is_active)",
    seedDataSql: String.raw`CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT, city TEXT, is_active INTEGER);
INSERT INTO members VALUES
(1,'Rahul','Pune',1),
(2,'Sneha','Mumbai',0),
(3,'Aditya','Pune',1),
(4,'Kavya','Delhi',1),
(5,'Meera','Nagpur',0);`,
    expectedResultHash: "e8ade49d4a552c90db66103456558dc24bcb05ed936e7a76186d12cc5b2c6f9d",
  },
  {
    order: 3,
    difficulty: "easy",
    title: "Cheap Books",
    points: 10,
    promptMarkdown:
      "Return title and price of books cheaper than 300, ordered by price ascending.\n\nSchema: books(id, title, author, price)",
    seedDataSql: String.raw`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author TEXT, price INTEGER);
INSERT INTO books VALUES
(1,'Dune','Frank Herbert',450),
(2,'Sapiens','Yuval Noah',350),
(3,'Atomic Habits','James Clear',280),
(4,'The Alchemist','Paulo Coelho',199),
(5,'1984','George Orwell',250);`,
    expectedResultHash: "5a29926ddddb4416d17461cf39a666d2303da9389892510006d110206bf7fdc8",
  },
  {
    order: 4,
    difficulty: "easy",
    title: "Count Students Per Class",
    points: 10,
    promptMarkdown:
      "Return class and the number of students in each class as total, ordered by class ascending.\n\nSchema: students(id, name, class)",
    seedDataSql: String.raw`CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, class TEXT);
INSERT INTO students VALUES
(1,'Aman','10A'),
(2,'Bhavna','10B'),
(3,'Chetan','10A'),
(4,'Divya','10B'),
(5,'Esha','10A'),
(6,'Farhan','10B');`,
    expectedResultHash: "0fc4219f4aff180aba5169b4a4bd7549c244c2784f89efab7dc5a511e11a0cb3",
  },
  {
    order: 5,
    difficulty: "easy",
    title: "Highest Paid Employee",
    points: 10,
    promptMarkdown:
      "Return the name and salary of the employee with the highest salary.\n\nSchema: employees(id, name, dept, salary)",
    seedDataSql: String.raw`CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employees VALUES
(1,'Alice','Eng',90000),
(2,'Bob','HR',60000),
(3,'Carol','Eng',95000),
(4,'Dave','Sales',70000),
(5,'Eve','HR',62000);`,
    expectedResultHash: "d8b9c9000700769b9d293ab3e1792fa0a0d346b96fba23cf29b017c1fc7ab740",
  },
  {
    order: 6,
    difficulty: "medium",
    title: "Department Averages",
    points: 20,
    promptMarkdown:
      "Return dept and the average salary as avg_salary for each department, but only for departments where the average salary is above 65000. Order by avg_salary descending.\n\nSchema: employees2(id, name, dept, salary)",
    seedDataSql: String.raw`CREATE TABLE employees2 (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employees2 VALUES
(1,'Alice','Eng',90000),
(2,'Bob','HR',60000),
(3,'Carol','Eng',95000),
(4,'Dave','Sales',70000),
(5,'Eve','HR',62000),
(6,'Frank','Sales',72000);`,
    expectedResultHash: "64a9a74ed2ecac4eebc0bc88631b3f3309740c8d55c921037721876a7acb3f52",
  },
  {
    order: 7,
    difficulty: "medium",
    title: "Orders With Customer Names",
    points: 20,
    promptMarkdown:
      "Return order_id, customer name, and amount for all orders, ordered by order_id ascending.\n\nSchema: customers(id, name) and orders(order_id, customer_id, amount)",
    seedDataSql: String.raw`CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO customers VALUES (1,'Neha'),(2,'Rohit'),(3,'Simran');
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);
INSERT INTO orders VALUES
(101,1,500),
(102,2,300),
(103,1,700),
(104,3,450);`,
    expectedResultHash: "4c50bfc6775d8aeec174160d7956844a829b5a2a83c47b98e7208c2e89df14e4",
  },
  {
    order: 8,
    difficulty: "medium",
    title: "Products Never Ordered",
    points: 20,
    promptMarkdown:
      "Return the name of products that have never appeared in the sales table.\n\nSchema: products(id, name) and sales(id, product_id, qty)",
    seedDataSql: String.raw`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO products VALUES (1,'Pen'),(2,'Notebook'),(3,'Eraser'),(4,'Sharpener'),(5,'Ruler');
CREATE TABLE sales (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);
INSERT INTO sales VALUES
(1,1,10),
(2,2,5),
(3,1,3);`,
    expectedResultHash: "4318128c33b3282ac03b911f19903c443198ab84c7f29dad4fe431c87ad718eb",
  },
  {
    order: 9,
    difficulty: "medium",
    title: "Second Highest Score",
    points: 20,
    promptMarkdown:
      "Return the second highest score from the table as a single column second_highest.\n\nSchema: scores(id, player, score)",
    seedDataSql: String.raw`CREATE TABLE scores (id INTEGER PRIMARY KEY, player TEXT, score INTEGER);
INSERT INTO scores VALUES
(1,'Ravi',88),
(2,'Sita',95),
(3,'Gopal',95),
(4,'Meena',80),
(5,'Anil',90);`,
    expectedResultHash: "784d8a37e24a84ad3a39dc290fc6ff4616d0562f1d5a958c2edeb7d92764f7d9",
  },
  {
    order: 10,
    difficulty: "medium",
    title: "Category Wise Max Price",
    points: 20,
    promptMarkdown:
      "Return category and the maximum price in that category as max_price, ordered by category ascending.\n\nSchema: items(id, category, price)",
    seedDataSql: String.raw`CREATE TABLE items (id INTEGER PRIMARY KEY, category TEXT, price INTEGER);
INSERT INTO items VALUES
(1,'Electronics',1200),
(2,'Electronics',2500),
(3,'Furniture',800),
(4,'Furniture',1500),
(5,'Grocery',150),
(6,'Grocery',90);`,
    expectedResultHash: "b9a311ab29425bbb1a1b1de0ef7803f6788bf7564bb0f2a78bc7f45543739c83",
  },
  {
    order: 11,
    difficulty: "medium",
    title: "Employees Earning Above Their Department Average",
    points: 20,
    promptMarkdown:
      "Return name, dept, and salary of employees who earn more than the average salary of their own department. Order by name ascending.\n\nSchema: staff(id, name, dept, salary)",
    seedDataSql: String.raw`CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO staff VALUES
(1,'Aarav','Eng',90000),
(2,'Bina','Eng',70000),
(3,'Chirag','Eng',95000),
(4,'Deepa','HR',60000),
(5,'Esha','HR',65000);`,
    expectedResultHash: "735f5dc565622239fc4d6b55c171b469fc45e914576efff976e15aef6cb18131",
  },
  {
    order: 12,
    difficulty: "hard",
    title: "Top Scorer Per Subject",
    points: 30,
    promptMarkdown:
      "For each subject, return the student with the highest marks in that subject. Return subject, student, marks, ordered by subject ascending. Assume no ties within a subject.\n\nSchema: exam(id, student, subject, marks)",
    seedDataSql: String.raw`CREATE TABLE exam (id INTEGER PRIMARY KEY, student TEXT, subject TEXT, marks INTEGER);
INSERT INTO exam VALUES
(1,'Aisha','Math',88),
(2,'Bilal','Math',95),
(3,'Chetna','Science',77),
(4,'Aisha','Science',91),
(5,'Bilal','English',60),
(6,'Chetna','English',85);`,
    expectedResultHash: "f6bf8d9dfdf7e2e7545983bf6c2f9d46395251d15f35abcfe558e0b9f26b2904",
  },
  {
    order: 13,
    difficulty: "hard",
    title: "Running Total of Sales",
    points: 30,
    promptMarkdown:
      "Return sale_date, amount, and a running cumulative total as running_total, ordered by sale_date ascending.\n\nSchema: daily_sales(id, sale_date, amount)",
    seedDataSql: String.raw`CREATE TABLE daily_sales (id INTEGER PRIMARY KEY, sale_date TEXT, amount INTEGER);
INSERT INTO daily_sales VALUES
(1,'2024-01-01',100),
(2,'2024-01-02',150),
(3,'2024-01-03',200),
(4,'2024-01-04',50);`,
    expectedResultHash: "9dda3796eac01bc3754c2290bfbdaca932e172e00c4613e5a2cb2577ab7ddd18",
  },
  {
    order: 14,
    difficulty: "hard",
    title: "Departments With More Than One Employee Above 70000",
    points: 30,
    promptMarkdown:
      "Return dept for departments having more than 1 employee with salary greater than 70000. Order by dept ascending.\n\nSchema: workers(id, name, dept, salary)",
    seedDataSql: String.raw`CREATE TABLE workers (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO workers VALUES
(1,'Ira','Eng',95000),
(2,'Jatin','Eng',88000),
(3,'Kabir','Eng',50000),
(4,'Lata','Sales',75000),
(5,'Manav','Sales',40000),
(6,'Nisha','HR',30000);`,
    expectedResultHash: "3d2dab3dab0cd6c403b6b10c45ff8792414aa74054b16c4e4f40a3aa988c1d01",
  },
  {
    order: 15,
    difficulty: "hard",
    title: "Consecutive Login Streak",
    points: 30,
    promptMarkdown:
      "A user's login is part of a 'streak' if they logged in on consecutive calendar days. Return the user and the length of their LONGEST streak of consecutive-day logins as longest_streak. Order by user ascending.\n\nSchema: logins(id, user, login_date) — login_date is TEXT in 'YYYY-MM-DD' format",
    seedDataSql: String.raw`CREATE TABLE logins (id INTEGER PRIMARY KEY, user TEXT, login_date TEXT);
INSERT INTO logins VALUES
(1,'Zara','2024-01-01'),
(2,'Zara','2024-01-02'),
(3,'Zara','2024-01-03'),
(4,'Zara','2024-01-05'),
(5,'Yusuf','2024-01-01'),
(6,'Yusuf','2024-01-02');`,
    expectedResultHash: "e87162ec13f4bffacb78f83b2db2537c28dfd3933e9fec3589390829d8c40b55",
  },
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
