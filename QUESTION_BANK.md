# SQL Query War — Question Bank

15 questions · 1 hour contest · sql.js (SQLite) grading · generated for developer handoff

**How this works:** Each question shows only a table image (name + 4-6 sample rows). Participants read the schema and data from the image and write SQL in the query box. Submissions run against `seedDataSql` in an in-memory SQLite (sql.js) and the result rows are hashed (SHA-256, keys sorted alphabetically, JS-style compact JSON) and compared to `expectedResultHash`. All hashes were verified to match Node.js `JSON.stringify` number/string formatting exactly — see the note on whole-number floats (Q6) below.

> **Images**: this file links to `images/qXX_*.png`. Keep the `images/` folder in the same directory as this file (or update the paths) so the images render.

## Summary

| # | Title | Difficulty | Points |
|---|---|---|---|
| 1 | Fresh Fruits | easy | 10 |
| 2 | Active Members | easy | 10 |
| 3 | Cheap Books | easy | 10 |
| 4 | Count Students Per Class | easy | 10 |
| 5 | Highest Paid Employee | easy | 10 |
| 6 | Department Averages | medium | 20 |
| 7 | Orders With Customer Names | medium | 20 |
| 8 | Products Never Ordered | medium | 20 |
| 9 | Second Highest Score | medium | 20 |
| 10 | Category Wise Max Price | medium | 20 |
| 11 | Employees Earning Above Their Department Average | medium | 20 |
| 12 | Top Scorer Per Subject | hard | 30 |
| 13 | Running Total of Sales | hard | 30 |
| 14 | Departments With More Than One Employee Above 70000 | hard | 30 |
| 15 | Consecutive Login Streak | hard | 30 |

**Total possible score:** 5×10 + 6×20 + 4×30 = **290 points**

---

## Q1. Fresh Fruits — `easy` — 10 points

**Prompt shown to participant:**

> Return `id`, `name`, `price`, and `stock` for fruits with `stock` greater than 50, ordered by `stock` descending.
> 
> Schema: fruits(id, name, price, stock)

**Table image shown to participant:**

![Q1 table](images/q01_fresh_fruits.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE fruits (id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);
INSERT INTO fruits VALUES
(1,'Apple',120,80),
(2,'Banana',50,30),
(3,'Mango',200,65),
(4,'Grapes',350,20),
(5,'Orange',100,55);
```

**Correct query (reference):**
```sql
SELECT id, name, price, stock FROM fruits WHERE stock > 50 ORDER BY stock DESC;
```

**expectedResultHash (SHA-256):**
```
7057272919fd2c895078d238091dd950c4fcd381bab94d7f4d2ca38bf678fbf2
```

**Expected result rows (sanity check only):**
```json
[{"id":1,"name":"Apple","price":120,"stock":80},{"id":3,"name":"Mango","price":200,"stock":65},{"id":5,"name":"Orange","price":100,"stock":55}]
```

---

## Q2. Active Members — `easy` — 10 points

**Prompt shown to participant:**

> Return `name` and `city` of members where `is_active` = 1.
> 
> Schema: members(id, name, city, is_active)

**Table image shown to participant:**

![Q2 table](images/q02_active_members.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT, city TEXT, is_active INTEGER);
INSERT INTO members VALUES
(1,'Rahul','Pune',1),
(2,'Sneha','Mumbai',0),
(3,'Aditya','Pune',1),
(4,'Kavya','Delhi',1),
(5,'Meera','Nagpur',0);
```

**Correct query (reference):**
```sql
SELECT name, city FROM members WHERE is_active = 1;
```

**expectedResultHash (SHA-256):**
```
e8ade49d4a552c90db66103456558dc24bcb05ed936e7a76186d12cc5b2c6f9d
```

**Expected result rows (sanity check only):**
```json
[{"city":"Pune","name":"Rahul"},{"city":"Pune","name":"Aditya"},{"city":"Delhi","name":"Kavya"}]
```

---

## Q3. Cheap Books — `easy` — 10 points

**Prompt shown to participant:**

> Return `title` and `price` of books cheaper than 300, ordered by `price` ascending.
> 
> Schema: books(id, title, author, price)

**Table image shown to participant:**

![Q3 table](images/q03_cheap_books.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author TEXT, price INTEGER);
INSERT INTO books VALUES
(1,'Dune','Frank Herbert',450),
(2,'Sapiens','Yuval Noah',350),
(3,'Atomic Habits','James Clear',280),
(4,'The Alchemist','Paulo Coelho',199),
(5,'1984','George Orwell',250);
```

**Correct query (reference):**
```sql
SELECT title, price FROM books WHERE price < 300 ORDER BY price ASC;
```

**expectedResultHash (SHA-256):**
```
5a29926ddddb4416d17461cf39a666d2303da9389892510006d110206bf7fdc8
```

**Expected result rows (sanity check only):**
```json
[{"price":199,"title":"The Alchemist"},{"price":250,"title":"1984"},{"price":280,"title":"Atomic Habits"}]
```

---

## Q4. Count Students Per Class — `easy` — 10 points

**Prompt shown to participant:**

> Return `class` and the number of students in each class as `total`, ordered by `class` ascending.
> 
> Schema: students(id, name, class)

**Table image shown to participant:**

![Q4 table](images/q04_count_students.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, class TEXT);
INSERT INTO students VALUES
(1,'Aman','10A'),
(2,'Bhavna','10B'),
(3,'Chetan','10A'),
(4,'Divya','10B'),
(5,'Esha','10A'),
(6,'Farhan','10B');
```

**Correct query (reference):**
```sql
SELECT class, COUNT(*) AS total FROM students GROUP BY class ORDER BY class ASC;
```

**expectedResultHash (SHA-256):**
```
0fc4219f4aff180aba5169b4a4bd7549c244c2784f89efab7dc5a511e11a0cb3
```

**Expected result rows (sanity check only):**
```json
[{"class":"10A","total":3},{"class":"10B","total":3}]
```

---

## Q5. Highest Paid Employee — `easy` — 10 points

**Prompt shown to participant:**

> Return the `name` and `salary` of the employee with the highest salary.
> 
> Schema: employees(id, name, dept, salary)

**Table image shown to participant:**

![Q5 table](images/q05_highest_paid.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employees VALUES
(1,'Alice','Eng',90000),
(2,'Bob','HR',60000),
(3,'Carol','Eng',95000),
(4,'Dave','Sales',70000),
(5,'Eve','HR',62000);
```

**Correct query (reference):**
```sql
SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 1;
```

**expectedResultHash (SHA-256):**
```
d8b9c9000700769b9d293ab3e1792fa0a0d346b96fba23cf29b017c1fc7ab740
```

**Expected result rows (sanity check only):**
```json
[{"name":"Carol","salary":95000}]
```

---

## Q6. Department Averages — `medium` — 20 points

**Prompt shown to participant:**

> Return `dept` and the average salary as `avg_salary` for each department, but only for departments where the average salary is above 65000. Order by `avg_salary` descending.
> 
> Schema: employees2(id, name, dept, salary)

**Table image shown to participant:**

![Q6 table](images/q06_dept_averages.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE employees2 (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO employees2 VALUES
(1,'Alice','Eng',90000),
(2,'Bob','HR',60000),
(3,'Carol','Eng',95000),
(4,'Dave','Sales',70000),
(5,'Eve','HR',62000),
(6,'Frank','Sales',72000);
```

**Correct query (reference):**
```sql
SELECT dept, AVG(salary) AS avg_salary FROM employees2 GROUP BY dept HAVING AVG(salary) > 65000 ORDER BY avg_salary DESC;
```

**expectedResultHash (SHA-256):**
```
64a9a74ed2ecac4eebc0bc88631b3f3309740c8d55c921037721876a7acb3f52
```

**Expected result rows (sanity check only):**
```json
[{"avg_salary":92500,"dept":"Eng"},{"avg_salary":71000,"dept":"Sales"}]
```

---

## Q7. Orders With Customer Names — `medium` — 20 points

**Prompt shown to participant:**

> Return `order_id`, customer `name`, and `amount` for all orders, ordered by `order_id` ascending.
> 
> Schema: customers(id, name) and orders(order_id, customer_id, amount)

**Table image shown to participant:**

![Q7 table](images/q07_orders_customers.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO customers VALUES (1,'Neha'),(2,'Rohit'),(3,'Simran');
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);
INSERT INTO orders VALUES
(101,1,500),
(102,2,300),
(103,1,700),
(104,3,450);
```

**Correct query (reference):**
```sql
SELECT o.order_id, c.name, o.amount FROM orders o INNER JOIN customers c ON o.customer_id = c.id ORDER BY o.order_id ASC;
```

**expectedResultHash (SHA-256):**
```
4c50bfc6775d8aeec174160d7956844a829b5a2a83c47b98e7208c2e89df14e4
```

**Expected result rows (sanity check only):**
```json
[{"amount":500,"name":"Neha","order_id":101},{"amount":300,"name":"Rohit","order_id":102},{"amount":700,"name":"Neha","order_id":103},{"amount":450,"name":"Simran","order_id":104}]
```

---

## Q8. Products Never Ordered — `medium` — 20 points

**Prompt shown to participant:**

> Return the `name` of products that have never appeared in the `sales` table.
> 
> Schema: products(id, name) and sales(id, product_id, qty)

**Table image shown to participant:**

![Q8 table](images/q08_products_never_ordered.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO products VALUES (1,'Pen'),(2,'Notebook'),(3,'Eraser'),(4,'Sharpener'),(5,'Ruler');
CREATE TABLE sales (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);
INSERT INTO sales VALUES
(1,1,10),
(2,2,5),
(3,1,3);
```

**Correct query (reference):**
```sql
SELECT name FROM products WHERE id NOT IN (SELECT product_id FROM sales) ORDER BY name ASC;
```

**expectedResultHash (SHA-256):**
```
4318128c33b3282ac03b911f19903c443198ab84c7f29dad4fe431c87ad718eb
```

**Expected result rows (sanity check only):**
```json
[{"name":"Eraser"},{"name":"Ruler"},{"name":"Sharpener"}]
```

---

## Q9. Second Highest Score — `medium` — 20 points

**Prompt shown to participant:**

> Return the second highest `score` from the table as a single column `second_highest`.
> 
> Schema: scores(id, player, score)

**Table image shown to participant:**

![Q9 table](images/q09_second_highest_score.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE scores (id INTEGER PRIMARY KEY, player TEXT, score INTEGER);
INSERT INTO scores VALUES
(1,'Ravi',88),
(2,'Sita',95),
(3,'Gopal',95),
(4,'Meena',80),
(5,'Anil',90);
```

**Correct query (reference):**
```sql
SELECT MAX(score) AS second_highest FROM scores WHERE score < (SELECT MAX(score) FROM scores);
```

**expectedResultHash (SHA-256):**
```
784d8a37e24a84ad3a39dc290fc6ff4616d0562f1d5a958c2edeb7d92764f7d9
```

**Expected result rows (sanity check only):**
```json
[{"second_highest":90}]
```

---

## Q10. Category Wise Max Price — `medium` — 20 points

**Prompt shown to participant:**

> Return `category` and the maximum `price` in that category as `max_price`, ordered by `category` ascending.
> 
> Schema: items(id, category, price)

**Table image shown to participant:**

![Q10 table](images/q10_category_max_price.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE items (id INTEGER PRIMARY KEY, category TEXT, price INTEGER);
INSERT INTO items VALUES
(1,'Electronics',1200),
(2,'Electronics',2500),
(3,'Furniture',800),
(4,'Furniture',1500),
(5,'Grocery',150),
(6,'Grocery',90);
```

**Correct query (reference):**
```sql
SELECT category, MAX(price) AS max_price FROM items GROUP BY category ORDER BY category ASC;
```

**expectedResultHash (SHA-256):**
```
b9a311ab29425bbb1a1b1de0ef7803f6788bf7564bb0f2a78bc7f45543739c83
```

**Expected result rows (sanity check only):**
```json
[{"category":"Electronics","max_price":2500},{"category":"Furniture","max_price":1500},{"category":"Grocery","max_price":150}]
```

---

## Q11. Employees Earning Above Their Department Average — `medium` — 20 points

**Prompt shown to participant:**

> Return `name`, `dept`, and `salary` of employees who earn more than the average salary of their own department. Order by `name` ascending.
> 
> Schema: staff(id, name, dept, salary)

**Table image shown to participant:**

![Q11 table](images/q11_above_dept_average.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO staff VALUES
(1,'Aarav','Eng',90000),
(2,'Bina','Eng',70000),
(3,'Chirag','Eng',95000),
(4,'Deepa','HR',60000),
(5,'Esha','HR',65000);
```

**Correct query (reference):**
```sql
SELECT name, dept, salary FROM staff s1 WHERE salary > (SELECT AVG(salary) FROM staff s2 WHERE s2.dept = s1.dept) ORDER BY name ASC;
```

**expectedResultHash (SHA-256):**
```
735f5dc565622239fc4d6b55c171b469fc45e914576efff976e15aef6cb18131
```

**Expected result rows (sanity check only):**
```json
[{"dept":"Eng","name":"Aarav","salary":90000},{"dept":"Eng","name":"Chirag","salary":95000},{"dept":"HR","name":"Esha","salary":65000}]
```

---

## Q12. Top Scorer Per Subject — `hard` — 30 points

**Prompt shown to participant:**

> For each `subject`, return the `student` with the highest `marks` in that subject. Return `subject`, `student`, `marks`, ordered by `subject` ascending. Assume no ties within a subject.
> 
> Schema: exam(id, student, subject, marks)

**Table image shown to participant:**

![Q12 table](images/q12_top_scorer_per_subject.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE exam (id INTEGER PRIMARY KEY, student TEXT, subject TEXT, marks INTEGER);
INSERT INTO exam VALUES
(1,'Aisha','Math',88),
(2,'Bilal','Math',95),
(3,'Chetna','Science',77),
(4,'Aisha','Science',91),
(5,'Bilal','English',60),
(6,'Chetna','English',85);
```

**Correct query (reference):**
```sql
SELECT e1.subject, e1.student, e1.marks
FROM exam e1
WHERE e1.marks = (SELECT MAX(e2.marks) FROM exam e2 WHERE e2.subject = e1.subject)
ORDER BY e1.subject ASC;
```

**expectedResultHash (SHA-256):**
```
f6bf8d9dfdf7e2e7545983bf6c2f9d46395251d15f35abcfe558e0b9f26b2904
```

**Expected result rows (sanity check only):**
```json
[{"marks":85,"student":"Chetna","subject":"English"},{"marks":95,"student":"Bilal","subject":"Math"},{"marks":91,"student":"Aisha","subject":"Science"}]
```

---

## Q13. Running Total of Sales — `hard` — 30 points

**Prompt shown to participant:**

> Return `sale_date`, `amount`, and a running cumulative total as `running_total`, ordered by `sale_date` ascending.
> 
> Schema: daily_sales(id, sale_date, amount)

**Table image shown to participant:**

![Q13 table](images/q13_running_total_sales.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE daily_sales (id INTEGER PRIMARY KEY, sale_date TEXT, amount INTEGER);
INSERT INTO daily_sales VALUES
(1,'2024-01-01',100),
(2,'2024-01-02',150),
(3,'2024-01-03',200),
(4,'2024-01-04',50);
```

**Correct query (reference):**
```sql
SELECT sale_date, amount,
  (SELECT SUM(d2.amount) FROM daily_sales d2 WHERE d2.sale_date <= d1.sale_date) AS running_total
FROM daily_sales d1
ORDER BY sale_date ASC;
```

**expectedResultHash (SHA-256):**
```
9dda3796eac01bc3754c2290bfbdaca932e172e00c4613e5a2cb2577ab7ddd18
```

**Expected result rows (sanity check only):**
```json
[{"amount":100,"running_total":100,"sale_date":"2024-01-01"},{"amount":150,"running_total":250,"sale_date":"2024-01-02"},{"amount":200,"running_total":450,"sale_date":"2024-01-03"},{"amount":50,"running_total":500,"sale_date":"2024-01-04"}]
```

---

## Q14. Departments With More Than One Employee Above 70000 — `hard` — 30 points

**Prompt shown to participant:**

> Return `dept` for departments having more than 1 employee with `salary` greater than 70000. Order by `dept` ascending.
> 
> Schema: workers(id, name, dept, salary)

**Table image shown to participant:**

![Q14 table](images/q14_depts_above_70000.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE workers (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO workers VALUES
(1,'Ira','Eng',95000),
(2,'Jatin','Eng',88000),
(3,'Kabir','Eng',50000),
(4,'Lata','Sales',75000),
(5,'Manav','Sales',40000),
(6,'Nisha','HR',30000);
```

**Correct query (reference):**
```sql
SELECT dept FROM workers WHERE salary > 70000 GROUP BY dept HAVING COUNT(*) > 1 ORDER BY dept ASC;
```

**expectedResultHash (SHA-256):**
```
3d2dab3dab0cd6c403b6b10c45ff8792414aa74054b16c4e4f40a3aa988c1d01
```

**Expected result rows (sanity check only):**
```json
[{"dept":"Eng"}]
```

---

## Q15. Consecutive Login Streak — `hard` — 30 points

**Prompt shown to participant:**

> A user's login is part of a 'streak' if they logged in on consecutive calendar days. Return the `user` and the length of their LONGEST streak of consecutive-day logins as `longest_streak`. Order by `user` ascending.
> 
> Schema: logins(id, user, login_date)  -- login_date is TEXT in 'YYYY-MM-DD' format

**Table image shown to participant:**

![Q15 table](images/q15_consecutive_login_streak.png)

**seedDataSql** (used for grading; NOT shown to participant):
```sql
CREATE TABLE logins (id INTEGER PRIMARY KEY, user TEXT, login_date TEXT);
INSERT INTO logins VALUES
(1,'Zara','2024-01-01'),
(2,'Zara','2024-01-02'),
(3,'Zara','2024-01-03'),
(4,'Zara','2024-01-05'),
(5,'Yusuf','2024-01-01'),
(6,'Yusuf','2024-01-02');
```

**Correct query (reference):**
```sql
WITH grp AS (
  SELECT user, login_date,
    julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user ORDER BY login_date) AS grp_key
  FROM logins
)
SELECT user, MAX(cnt) AS longest_streak
FROM (
  SELECT user, grp_key, COUNT(*) AS cnt
  FROM grp
  GROUP BY user, grp_key
)
GROUP BY user
ORDER BY user ASC;
```

**expectedResultHash (SHA-256):**
```
e87162ec13f4bffacb78f83b2db2537c28dfd3933e9fec3589390829d8c40b55
```

**Expected result rows (sanity check only):**
```json
[{"longest_streak":2,"user":"Yusuf"},{"longest_streak":3,"user":"Zara"}]
```

---

_Generated reference document · all queries tested against real SQLite · hashes verified against Node.js JSON.stringify semantics_