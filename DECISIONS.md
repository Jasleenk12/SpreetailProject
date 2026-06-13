# DECISIONS.md

Decision log for the SplitEase (Splitwise clone) project. Each entry lists options considered and the final choice with reasoning.

---

## D1: Tech Stack

| Option | Pros | Cons |
|--------|------|------|
| **Next.js full-stack** ✅ | Single repo, API routes, Vercel deploy | Tightly coupled frontend/backend |
| React + Express separate | Clear separation | Two deploys, more setup |
| Django + React | Mature ORM | Heavier, less familiar for JS assignment |

**Decision:** Next.js 14 (App Router) + TypeScript  
**Reason:** Fastest path to a deployed full-stack app with one codebase. Assignment deadline favored speed.

---

## D2: Database

| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL (prod) + SQLite (dev)** ✅ | Relational, assignment-compliant, Prisma supports both | Two providers in schema |
| PostgreSQL only | Production-grade from day one | Requires Docker running locally |
| MySQL | Widely used | Less common with Vercel/serverless |
| MongoDB | Flexible schema | Assignment requires relational DB |

**Decision:** PostgreSQL for production (Neon), SQLite for local dev  
**Reason:** Meets relational DB requirement; SQLite avoids Docker dependency during development.

---

## D3: Authentication

| Option | Pros | Cons |
|--------|------|------|
| **JWT in httpOnly cookie** ✅ | Stateless, works on serverless | No instant revoke |
| NextAuth.js | Full-featured | Overkill for email/password only |
| Session table in DB | Revocable sessions | Extra table, DB round-trip per request |
| LocalStorage JWT | Simple | XSS vulnerable |

**Decision:** JWT (jose library) in httpOnly cookie, 7-day expiry  
**Reason:** Simple, secure against XSS, no extra DB table for MVP.

---

## D4: Real-Time Chat

| Option | Pros | Cons |
|--------|------|------|
| **HTTP polling (2s)** ✅ | Works on Vercel, no extra service | Not true real-time, more requests |
| WebSockets (Socket.io) | True real-time | Needs persistent server (not Vercel) |
| Server-Sent Events | One-way push | Limited Vercel support |
| Pusher / Ably | Managed real-time | External dependency, cost |

**Decision:** Poll `/api/expenses/:id/messages?since=` every 2 seconds  
**Reason:** Assignment requires real-time updates; polling is deployable on Vercel without extra infrastructure.

---

## D5: Balance Calculation

| Option | Pros | Cons |
|--------|------|------|
| **Derived from expenses + settlements** ✅ | Single source of truth, always consistent | Recalculated on each request |
| Pre-computed balance table | Faster reads | Must update on every expense/settlement |
| Event sourcing ledger | Full audit trail | Over-engineered for MVP |

**Decision:** Compute balances on-the-fly from expenses and settlements  
**Reason:** Correctness over performance at MVP scale (small groups).

---

## D6: Debt Simplification

| Option | Pros | Cons |
|--------|------|------|
| **Greedy largest-debtor/creditor** ✅ | Simple, fast, good enough | Not mathematically optimal in all cases |
| Minimum-flow algorithm | Optimal transaction count | More complex to implement |
| No simplification | Simplest | Poor UX (many pairwise debts) |

**Decision:** Greedy algorithm in `src/lib/balances.ts`  
**Reason:** Matches Splitwise-like UX with minimal code.

---

## D7: CSV Import Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Validate-then-import with skip/fix** ✅ | Transparent, produces audit report | Bad rows are lost unless fixed |
| Import all with defaults | Higher import rate | Hides data quality issues |
| Strict: abort on first error | Safe | One bad row blocks entire file |
| Background job queue | Handles large files | Overkill for assignment |

**Decision:** Row-by-row validation; skip invalid rows, auto-fix recoverable issues (bad dates), generate import report  
**Reason:** Assignment requires anomaly logging; per-row handling gives best audit trail.

---

## D8: Split Type Storage

| Option | Pros | Cons |
|--------|------|------|
| **String field** ✅ | Works with SQLite (no enum support) | No DB-level constraint |
| Prisma enum | Type-safe | SQLite doesn't support enums |
| Separate tables per split type | Normalized | Complex queries |

**Decision:** `splitType` as `String` with comment documenting valid values  
**Reason:** SQLite local dev required dropping Prisma enum; string works on both SQLite and PostgreSQL.

---

## D9: Member Invitation

| Option | Pros | Cons |
|--------|------|------|
| **Invite link + email lookup** ✅ | No email service needed | User must register before being added |
| Email invite with magic link | Better UX | Requires email provider (SendGrid etc.) |
| Open join by group name | Simplest | Security risk |

**Decision:** Unique invite code per group + add-by-email for registered users  
**Reason:** No email infrastructure; still supports two invite flows.

---

## D10: UI Framework

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind CSS** ✅ | Utility-first, fast styling | Verbose class names |
| shadcn/ui | Polished components | More setup |
| CSS Modules | Scoped styles | Slower to build |
| Material UI | Complete component set | Heavy bundle |

**Decision:** Tailwind CSS with custom green brand palette  
**Reason:** Speed of development; Splitwise-inspired green accent.

---

## D11: AI Collaboration Approach

| Option | Pros | Cons |
|--------|------|------|
| Interview-first (assignment default) | Thorough requirements | Slower start |
| **Direct build (user directive)** ✅ | Fast delivery | Defaults chosen by AI |
| AI recommends tech stack | User learns decisions | Assignment says user should decide |

**Decision:** User directed "just build it" — AI chose sensible defaults and documented them  
**Reason:** User prioritized working deliverable over discovery interview.

---

## D12: Deployment Target

| Option | Pros | Cons |
|--------|------|------|
| **Vercel + Neon** ✅ | Free tier, Next.js native | Serverless limits (no WebSockets) |
| Railway (full stack) | DB + app together | Paid after trial |
| AWS EC2 + RDS | Full control | Complex setup for assignment |
| Render | Simple deploy | Slower cold starts |

**Decision:** Vercel for app, Neon for PostgreSQL  
**Reason:** Fastest free deployment path for Next.js + Postgres.
