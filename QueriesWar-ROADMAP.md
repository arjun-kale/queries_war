# Queries War — SQL Contest Platform
### Build Plan (Next.js + Convex, Vercel, 2–3 hour build window)

---

## 1. Concept Summary

**Queries War** — a timed, competitive SQL contest.

- 1 hour, 15 SQL questions, easy → hard difficulty curve
- Live leaderboard (rank updates as people submit — **truly live**, not polled)
- Anti-cheat: disable copy/paste, disable right-click, tab-switch detection
- Precise timestamp tracking (down to the second) for tie-breaking
- Admin dashboard (you) — live results, per-user submissions, force-end contest
- Tie-breaker logic: score first, then total time, then last-submission timestamp
- Deploy on Vercel

---

## 2. Tech Stack (matches your usual setup)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Animation | framer-motion |
| Database + Backend | **Convex** — schema, mutations/queries, and realtime subscriptions all in one. No separate ORM, no API routes needed for most data access. |
| Auth | Simple — name + email creates a Participant document, Convex returns its `_id` as the client's identity token (stored in a cookie/localStorage). Admin login = single hardcoded password/env var checked in a Convex mutation, not a full user table. |
| Realtime leaderboard | **Convex's `useQuery` hook — live by default.** No polling, no websocket setup needed — Convex handles the subscription under the hood. This is a genuine upgrade over a Prisma+polling setup: the leaderboard re-renders the instant a new submission lands, for every connected client, with zero extra code. |
| SQL execution sandbox | **sql.js (SQLite compiled to WASM, runs in-browser)** — each question ships a pre-seeded mini SQLite DB. User query runs client-side against it. No backend SQL execution = no injection risk, no server load, instant feedback. (Unchanged by the Convex swap — this part is DB-agnostic.) |
| Package manager | pnpm |
| Deploy | Vercel (frontend) + Convex Cloud (backend, deploys separately via `npx convex deploy`) |

**Why sql.js instead of a real backend SQL engine:** Running arbitrary user-submitted SQL against a real server-side database is a genuine security risk (DROP TABLE, resource exhaustion, etc.) and would eat most of your 3 hours in sandboxing work alone. sql.js runs entirely in the browser sandbox — zero server risk, and it's actually *more* anti-cheat-friendly since there's nothing to intercept over the network except the final answer/score.

**Why Convex over Prisma+Neon here specifically:** Your two headline features — "live result" and "admin can view dashboard live" — are exactly what Convex's reactive queries are built for. You get that for free instead of building a polling loop. The trade-off is the tie-break sort logic gets written as TypeScript inside a Convex query function instead of a SQL `ORDER BY` — slightly different mental model, not harder.

---

## 3. Data Model (Convex schema, `convex/schema.ts`)

```
contests
 - title, startTime, endTime, durationSeconds, isActive, leaderboardVisible

questions
 - contestId (ref), order (1-15), difficulty ("easy" | "medium" | "hard")
 - title, promptMarkdown
 - seedDataSql (creates + fills the mini table(s) for sql.js)
 - expectedResultHash (hash of correct result set, for auto-grading)
 - points

participants
 - contestId (ref), name, email
 - startedAt (when they clicked "Start" — set server-side in a mutation)
 - finishedAt (when they submit final / time runs out)
 - tabSwitchCount, pasteAttemptCount (anti-cheat flags, default 0)
 - isDisqualified (optional, manual admin action)

submissions
 - participantId (ref), questionId (ref)
 - submittedQuery (string, stored for admin review / plagiarism check)
 - isCorrect, pointsAwarded
 - submittedAt (server timestamp via Convex mutation — this powers tie-break)
 - attemptNumber
```

Convex indexes to add: `submissions.by_participant`, `submissions.by_question`, `participants.by_contest` — these keep the leaderboard query and admin drill-down fast.

**Leaderboard is a *query function*, not a stored table** — `convex/leaderboard.ts` computes it live from `participants` + `submissions` every time it's subscribed to. Convex caches and only re-runs it when the underlying data actually changes, so this is cheap.

**Tie-break logic (your "first, second, third" requirement):**
1. Higher total score wins
2. If tied → lower total time taken (finishedAt − startedAt) wins
3. If still tied → whoever's *last correct submission timestamp* is earliest wins
4. Deterministic to the second — every submission is timestamped inside the Convex mutation (server-side), never trusting the client's clock
5. Written as a plain `.sort()` comparator in the TypeScript query function — no SQL needed

---

## 4. Anti-Cheat Features (realistic scope for 3 hours)

What's achievable and genuinely useful in this timeframe:
- Disable `copy`, `cut`, `paste`, `contextmenu` (right-click) events on the contest page via JS event listeners
- Detect and log tab-switch / window-blur events (`visibilitychange`) — calls a Convex mutation to increment a counter, doesn't need to auto-disqualify, just flags for admin review
- Disable browser dev tools shortcuts (F12, Ctrl+Shift+I) — deters casual cheating (not bulletproof, no client-side JS defense is, but worth having)
- Lock the question order — no going back and forth if you want stricter timing (optional toggle)
- Server-authoritative timestamps for every submission (Convex mutations run server-side, so this is automatic — never trust `new Date()` on the client)
- Full submission history stored — you can manually review any participant's query log after the contest, and since Convex is live, you see it appear in your admin view in real time as they submit

**Be upfront with yourself:** no purely client-side anti-cheat is unbeatable (a determined person can screen-record, use a second device, etc.). This is a deterrent + evidence layer, not a guarantee — same as basically every online coding contest platform (HackerRank, LeetCode contests included).

---

## 5. Page / Route Map

```
/                          → Landing page, contest info, "Register" CTA
/register                  → Name + email form → Convex mutation creates Participant → redirect to /waiting
/waiting                   → Countdown to contest start
/contest                   → The actual contest UI (question list, SQL editor, timer, submit)
/contest/leaderboard       → Public live leaderboard (optional — you may want this admin-only until contest ends)
/admin/login               → Simple password gate
/admin/dashboard           → Live participant list, live scores, tab-switch flags — updates in real time via useQuery
/admin/dashboard/[id]      → Individual participant's full submission history — also live
/admin/contest/control     → Start/pause/end contest, reveal leaderboard toggle
```

---

## 6. Core UI Components

- `<ContestTimer />` — big countdown, turns red under 5 min, auto-submits at 0
- `<QuestionSidebar />` — 15 question pills, color-coded (unattempted / correct / wrong / current)
- `<SqlEditor />` — CodeMirror (`@uiw/react-codemirror` with SQL mode — faster to integrate than Monaco)
- `<ResultTable />` — shows query output vs expected shape
- `<LeaderboardTable />` — rank, name, score, time — subscribed live via `useQuery(api.leaderboard.get)`, no polling code needed
- `<AntiCheatWatcher />` — invisible component, attaches event listeners, calls Convex mutations on violations
- `<AdminLiveGrid />` — table of all participants with live score + flags, sortable, live via `useQuery`

---

## 7. Build Roadmap — 3 Hour Timeline

### Phase 0 — Setup (15 min)
- You already have Next.js + Tailwind + shadcn/ui set up
- `npm install convex` (or pnpm), run `npx convex dev` to spin up your Convex project and get a deployment URL
- Install: `sql.js`, `@uiw/react-codemirror`, `@codemirror/lang-sql`, `framer-motion`, `lucide-react`
- Write `convex/schema.ts` (Section 3), Convex pushes schema automatically on save while `convex dev` is running — no separate migration step

### Phase 1 — Data + Question Authoring (30–40 min)
- Write your 15 questions now (this is the part *you* need to do — content, not code)
- Easy (1–5): single table SELECT/WHERE/ORDER BY
- Medium (6–10): JOIN, GROUP BY, aggregate functions
- Hard (11–15): subqueries, window functions, multi-table joins, HAVING
- A one-off Convex mutation (`convex/seed.ts`) or the Convex dashboard's data import to insert your 15 `questions` documents with seed SQL + expected result hash

### Phase 2 — Contest Flow (45–60 min)
- Register page → calls a Convex mutation `participants.create`, sets `startedAt` server-side
- Contest page: `useQuery` to load questions, renders SQL editor, runs query against sql.js in-browser, checks result against `expectedResultHash`, calls Convex mutation `submissions.submit`
- Timer component, auto-submit-and-lock at 0 (anchor off server time — fetch it once via a Convex query on load, don't trust the client clock as the source of truth)
- `submissions.submit` mutation: server timestamps, validates timing hasn't passed contest end, stores the submission, recalculates score

### Phase 3 — Anti-Cheat Layer (20–30 min)
- Global event listeners for copy/paste/right-click/devtools
- Tab-switch counter → Convex mutation `participants.flagTabSwitch`
- Debounce so rapid switching doesn't spam Convex

### Phase 4 — Admin Dashboard (30–40 min)
- `/admin/login` — simple env-var password check via a Convex action, sets a signed cookie
- `/admin/dashboard` — `useQuery(api.leaderboard.get)` — **updates live automatically, no polling code to write**
- Per-participant drill-down of submissions, also live
- Contest control: manual start/end toggle via mutation

### Phase 5 — Polish + Deploy (15–20 min)
- Responsive check, loading states, error boundaries
- `npx convex deploy` to push your backend to production
- Add `CONVEX_DEPLOYMENT` / `NEXT_PUBLIC_CONVEX_URL` env vars to Vercel project
- Deploy frontend to Vercel, run one full end-to-end test yourself before opening it to real participants

**Total: ~2.5–3 hrs** — actually a bit faster than the Prisma/Neon version since you skip writing polling logic and API routes for most data access. If you're short on time, Phase 1 (question writing) is the one to pre-do the night before.

---

## 8. Cut-List (if you're running out of time on contest day)

Cut in this order, each saves real time with minimal loss:
1. Public leaderboard page → keep leaderboard admin-only, announce winner manually after
2. Tab-switch detection UI polish → just log to Convex silently, review later
3. Question-order locking → let people navigate freely, simpler UX
4. Fancy result-diff UI → just show ✅/❌ and expected row count

**Never cut:** server-side timestamping, tie-break logic, the anti-copy-paste listeners — these are the actual point of the contest.

---

## 9. Deployment Checklist

- [ ] `npx convex deploy` run at least once, production deployment URL noted
- [ ] `NEXT_PUBLIC_CONVEX_URL` added to Vercel project env vars (this is the production Convex URL, not the dev one)
- [ ] `ADMIN_PASSWORD` env var set (don't hardcode in source) — set in both Convex's env vars (`npx convex env set`) and Vercel if referenced client-side
- [ ] Test full flow end-to-end on the deployed URL, not just localhost — Convex dev vs prod deployments are separate, easy to accidentally test against dev
- [ ] Confirm timer/timestamps use server time (from Convex), not participant's local browser time
