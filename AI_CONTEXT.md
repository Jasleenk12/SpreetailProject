# AI_CONTEXT.md

> **Source of truth for the SplitEase (Splitwise clone) build.**

---

## Project Status

| Field | Value |
|-------|-------|
| App Name | SplitEase |
| Phase | Complete — ready for deploy |
| Last Updated | 2026-06-13 |
| Deployed URL | TBD (deploy to Vercel + Neon) |
| GitHub Repo | TBD |
| AI Tool | Cursor IDE with Claude |

---

## Product Understanding

SplitEase is a simplified Splitwise clone for splitting shared expenses among groups of people (friends, roommates, travel groups).

### Product Goals

- Let users register, form groups, add expenses, see who owes whom, settle debts
- Portfolio/assignment deliverable that demonstrates full-stack engineering
- Core workflow priority: add expense → view balances → settle up

### Splitwise Research

Studied Splitwise core behaviors:
- Dashboard with aggregate you-owe / you-are-owed
- Groups as expense containers
- Add expense: one payer, multiple participants, split methods
- Balance tab with per-person net balance
- Simplify debts to minimize transactions
- Settle up records payments
- Per-expense comments

### User Personas

- **Primary:** Friends/roommates splitting bills (2–10 people per group)
- **Scale:** Small MVP — tens of users, not thousands

### MVP Scope (In)

1. Login/register (email + password)
2. Groups: create, invite via link, add by email, remove members
3. Expenses: equal, exact, percentage, shares splits
4. Expense chat with real-time updates (polling)
5. Group balances + simplified debts
6. Individual balance summary across groups (dashboard)
7. Record settlements/payments
8. PostgreSQL relational database

### Out of Scope

- Multi-currency / conversion
- OAuth / social login
- Receipt uploads
- Recurring expenses
- Email notifications
- Mobile native app
- Activity feed / audit log
- Multiple payers per expense
- Expense editing (delete only)

---

## Core Workflows

### Authentication

1. User registers with name, email, password (bcrypt hashed)
2. Login returns JWT stored in httpOnly cookie (`splitwise_token`, 7-day expiry)
3. Middleware protects all routes except `/login`, `/join`, auth API
4. Logout clears cookie

### Groups

1. User creates group → becomes admin member
2. Invite: copy link `/join?code={inviteCode}` (unique cuid per group)
3. Add member: admin/member enters email of registered user
4. Remove member: admin can remove others; any member can remove self
5. Past expenses remain after member removal (no balance blocking)

### Expenses

1. From group page → Add Expense modal
2. Fields: description, amount, paid by, split type, participants
3. Server calculates splits via `calculateSplits()` in `src/lib/balances.ts`
4. Split types:
   - **EQUAL:** amount / participant count (remainder on last)
   - **EXACT:** user enters exact amounts (must sum to total)
   - **PERCENTAGE:** must sum to 100%
   - **SHARES:** proportional to share count
5. View expense detail + chat at `/groups/:id/expenses/:expenseId`
6. Delete expense (any member)

### Settlements

1. From group → Settle Up modal
2. Select payer (who paid cash) and receiver (who received)
3. Creates Settlement record adjusting balances
4. Quick-select from simplified debt list

### Balance Calculation

```
balance[user] = 0
for each expense:
  balance[payer] += expense.amount
  for each split: balance[split.user] -= split.amount
for each settlement:
  balance[payer] += settlement.amount
  balance[receiver] -= settlement.amount
```

Positive balance = user is owed money. Negative = user owes money.

**Simplify debts:** Greedy algorithm matching largest debtor to largest creditor.

### Expense Chat

- Messages stored in `ExpenseMessage` table
- GET `/api/expenses/:id/messages?since=ISO` for incremental fetch
- Client polls every 2 seconds
- POST to send message
- UI shows live indicator

---

## Implementation Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Framework | Next.js 14 App Router | Full-stack, Vercel deploy |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Fast UI |
| Database | PostgreSQL | Assignment: relational only |
| ORM | Prisma 5 | Schema-first, migrations |
| Auth | JWT + httpOnly cookie | Stateless, serverless-friendly |
| Real-time | 2s polling | No WebSocket server on Vercel |
| Currency | USD only | MVP simplicity |
| API | REST JSON | Simple, predictable |
| Deployment | Vercel + Neon | Free tiers, easy setup |

---

## Database Schema

```prisma
User { id, email, name, password, timestamps }
Group { id, name, description, inviteCode, createdById, timestamps }
GroupMember { id, groupId, userId, role, joinedAt } @@unique([groupId, userId])
SplitType enum { EQUAL, EXACT, PERCENTAGE, SHARES }
Expense { id, groupId, paidById, description, amount, splitType, expenseDate }
ExpenseSplit { id, expenseId, userId, amount, percentage?, shares? }
ExpenseMessage { id, expenseId, userId, content, createdAt }
Settlement { id, groupId, payerId, receiverId, amount, note?, settledAt }
```

Relations:
- User → GroupMember, Expense (paidBy), ExpenseSplit, ExpenseMessage, Settlement
- Group → members, expenses, settlements
- Expense → splits, messages (cascade delete)

---

## API Design

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | { email, password, name } |
| POST | /api/auth/login | No | { email, password } |
| POST | /api/auth/logout | Yes | Clear cookie |
| GET | /api/auth/logout | Yes | { user } session check |
| GET | /api/dashboard | Yes | Summary + groups |
| GET | /api/groups | Yes | List groups |
| POST | /api/groups | Yes | Create group |
| GET | /api/groups/:id | Yes | Group + balances + debts |
| POST | /api/groups/:id/members | Yes | { email } add member |
| DELETE | /api/groups/:id/members?userId= | Yes | Remove member |
| POST | /api/groups/join | Yes | { inviteCode } |
| POST | /api/groups/:id/expenses | Yes | Create expense |
| GET | /api/expenses/:id | Yes | Expense detail |
| DELETE | /api/expenses/:id | Yes | Delete expense |
| GET | /api/expenses/:id/messages | Yes | ?since= for poll |
| POST | /api/expenses/:id/messages | Yes | { content } |
| POST | /api/groups/:id/settlements | Yes | Record payment |
| GET | /api/users/search?q= | Yes | Search users |

---

## Frontend Structure

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| / | redirect | → /dashboard or /login |
| /login | login/page.tsx | Register/login toggle |
| /dashboard | dashboard/page.tsx | Balance cards + group list |
| /groups/:id | groups/[id]/page.tsx | Tabs: expenses, balances, members |
| /groups/:id/expenses/:expenseId | expense detail | Splits + chat |
| /join?code= | join/page.tsx | Accept invite |

### Components

- `AddExpenseModal` — split type UI, participant selection
- `SettleUpModal` — payment recording with debt quick-select

### UI Notes

- Green brand color (#22c55e) — Splitwise-inspired
- Modal overlays for create/add/settle actions
- Tab navigation on group page
- Balance colors: green = owed to you, red = you owe

---

## Deployment Plan

1. Create Neon PostgreSQL database → copy `DATABASE_URL`
2. Push to GitHub
3. Import to Vercel, set env vars:
   - `DATABASE_URL`
   - `JWT_SECRET` (random 32+ chars)
   - `NEXT_PUBLIC_APP_URL` (Vercel URL)
4. Run `DATABASE_URL=... npx prisma db push`
5. Run `DATABASE_URL=... npm run db:seed` (optional demo data)
6. Local dev: `docker compose up -d` for PostgreSQL

---

## Testing Plan

### Manual Test Checklist

- [ ] Register new user
- [ ] Login/logout
- [ ] Create group
- [ ] Copy invite link, join from second account
- [ ] Add member by email
- [ ] Add expense (all 4 split types)
- [ ] Verify balances correct
- [ ] Send chat message, verify appears on other client
- [ ] Record settlement, verify balances update
- [ ] Remove member
- [ ] Delete expense

### Automated (future)

- Unit tests for `calculateSplits`, `computeGroupBalances`, `simplifyDebts`
- E2E with Playwright

---

## Trade-offs

| Simplified | Hardcoded | Avoided |
|------------|-----------|---------|
| Single currency | JWT 7-day expiry | WebSockets |
| Polling not WS | 2s poll interval | GraphQL |
| No expense edit | USD formatter | SQLite in prod |
| No receipts | Demo password: password123 | OAuth |

---

## Known Limitations

1. Chat uses polling, not true WebSockets
2. No expense edit — must delete and recreate
3. Users must exist before being added to group
4. No email invite — manual email entry only
5. Member can be removed with non-zero balance (no guard)
6. Single payer per expense only
7. No pagination on expenses/messages lists

---

## Prompts and AI Responses

### Session 1 — Discovery Start

**User:** Full assignment brief + required interview prompt  
**AI:** Asked 21 product/engineering questions. Created AI_CONTEXT.md skeleton.

### Session 2 — Build Directive

**User:** "just clone the thing whatever was asked in the assignment. give me the full working project."  
**AI:** Built complete Next.js app with all features. Updated AI_CONTEXT.md, BUILD_PLAN.md, README.md, PROMPTS.md.

---

## Changes During Implementation

| Date | Change | Reason |
|------|--------|--------|
| 2026-06-13 | Created AI_CONTEXT.md skeleton | Kickoff |
| 2026-06-13 | User skipped interview | Direct build request |
| 2026-06-13 | Chose Next.js + PostgreSQL + Prisma | Full-stack, relational DB requirement |
| 2026-06-13 | Polling for chat | Vercel-compatible real-time |
| 2026-06-13 | Split jwt.ts from auth.ts | Edge middleware compatibility |
| 2026-06-13 | Suspense wrapper on /join | useSearchParams requirement |

---

## File Map (Key Files)

```
prisma/schema.prisma       — DB schema
prisma/seed.ts             — Demo users + group
src/lib/balances.ts        — Split calc + balance logic
src/lib/auth.ts            — Session helpers
src/lib/jwt.ts             — Edge-safe JWT
src/middleware.ts           — Route protection
src/app/api/**             — All API routes
src/app/dashboard/         — Main dashboard
src/app/groups/[id]/       — Group management
src/components/            — Modals
docker-compose.yml         — Local PostgreSQL
```

---

## Rebuild Instructions

1. Read this entire file
2. Initialize Next.js 14 + TypeScript + Tailwind project named `splitwise-clone`
3. Copy schema from Database Schema section into `prisma/schema.prisma`
4. Implement `src/lib/balances.ts` with algorithms described above
5. Implement all API routes per API Design table
6. Build frontend pages per Frontend Structure
7. Add middleware with JWT verification (edge-safe, no Prisma)
8. Add docker-compose, seed, README, BUILD_PLAN

Demo accounts after seed: alice@example.com, bob@example.com, charlie@example.com (password: password123)
