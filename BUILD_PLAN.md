# BUILD_PLAN.md

## 1. Product Research

### How Splitwise Was Studied

Splitwise was analyzed by reviewing its core user flows:

- **Dashboard** — Shows overall balance (you owe / you are owed) across all groups
- **Groups** — Container for shared expenses among a set of people
- **Add Expense** — One payer, multiple participants, flexible split methods
- **Balances** — Net balance per person, with optional debt simplification
- **Settle Up** — Record cash/bank payments to reduce outstanding debts
- **Comments** — Per-expense discussion thread

### Key Workflows Identified

1. User registers → creates/joins group → adds expense → views balances → settles debt
2. Group admin invites members via link or email
3. Expense split types: equal, exact amounts, percentage, shares
4. Balance = sum(paid) - sum(owed) per user, adjusted by settlements
5. Simplified debts minimize number of transactions between members

### Product Assumptions

- Single currency (USD) for MVP
- One payer per expense (not multiple payers)
- Users must register before being added to groups
- Email-based member addition (user must exist in system)
- Invite links use a unique group code
- Real-time chat via polling (Vercel-compatible, no WebSocket server needed)
- Any group member can add expenses and record settlements
- Group creator is admin; admins can remove other members

---

## 2. Architecture

### Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | Next.js 14 (App Router) | Full-stack in one repo, easy Vercel deploy |
| Language | TypeScript | Type safety across frontend and API |
| Styling | Tailwind CSS | Fast, consistent UI |
| Database | PostgreSQL | Assignment requires relational DB |
| ORM | Prisma | Schema-first, migrations, type-safe queries |
| Auth | JWT in httpOnly cookies | Simple, stateless, works on serverless |
| Real-time | Polling (2s interval) | No extra infra; works on Vercel |

### Database Schema

```
User ──┬── GroupMember ── Group
       ├── Expense (paidBy) ── ExpenseSplit
       ├── ExpenseMessage
       └── Settlement (payer/receiver)

Group ── Expense, Settlement, GroupMember
```

**Enums:** `SplitType` = EQUAL | EXACT | PERCENTAGE | SHARES

### API Design

RESTful JSON API under `/api/`:

- Auth: register, login, logout
- Dashboard: aggregated balances
- Groups: CRUD members, join via invite
- Expenses: create with split calculation server-side
- Messages: GET with `?since=` for incremental polling, POST to send
- Settlements: record payment between two members

### Frontend Structure

| Route | Purpose |
|-------|---------|
| `/login` | Register / login toggle |
| `/dashboard` | Balance summary + group list |
| `/groups/:id` | Tabs: Expenses, Balances, Members |
| `/groups/:id/expenses/:expenseId` | Expense detail + live chat |
| `/join?code=` | Accept invite link |

**Components:** `AddExpenseModal`, `SettleUpModal`

### Balance Calculation

```
For each expense:
  payer balance += expense.amount
  each split participant balance -= split.amount

For each settlement:
  payer balance += settlement.amount
  receiver balance -= settlement.amount

Simplify debts: greedy match largest debtor to largest creditor
```

### Deployment Approach

1. **Database:** Neon PostgreSQL (free tier)
2. **App:** Vercel (Next.js native)
3. **Env vars:** DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL
4. **Migrations:** `prisma db push` against production DB
5. **Seed:** Optional demo data via `npm run db:seed`

---

## 3. AI Collaboration Process

### How the AI Was Instructed

1. **Initial prompt** (assignment-required): AI as junior engineer, interview before building
2. **User pivot:** "Just clone the thing, give me the full working project"
3. AI proceeded with reasonable defaults based on assignment requirements

### Questions the AI Would Have Asked (skipped due to user directive)

- User personas, currency, multi-payer support, notification preferences
- User chose to defer all decisions to implementation defaults

### How the Plan Evolved

| Stage | Decision |
|-------|----------|
| Discovery | Interview started, AI_CONTEXT.md skeleton created |
| Pivot | User requested full build immediately |
| Implementation | Next.js + PostgreSQL + Prisma + JWT chosen |
| Real-time | Polling instead of WebSockets for deploy simplicity |

### AI_CONTEXT.md Maintenance

Updated throughout build with product scope, schema, API design, trade-offs, and prompts.

---

## 4. Tradeoffs

### Simplified

- Single currency (USD)
- No receipt/image uploads
- No expense categories
- No recurring expenses
- No push notifications or email invites
- No activity feed / audit log
- Polling-based chat instead of WebSockets

### Hardcoded

- JWT expiry: 7 days
- Chat poll interval: 2 seconds
- Currency formatter: en-US / USD
- Demo seed passwords: `password123`

### Avoided

- Multi-currency conversion
- OAuth / social login
- Mobile native app
- GraphQL
- Non-relational databases
- Complex permission roles (only admin vs member)

### Would Improve With More Time

- WebSocket chat via Pusher or Ably
- Email invite flow with magic links
- Expense edit (currently delete + recreate)
- Debt simplification UI with one-click settle
- Unit tests for balance calculation
- E2E tests with Playwright
- Expense categories and receipt upload
- Push notifications for new expenses/messages
- Mobile-responsive polish and dark mode
