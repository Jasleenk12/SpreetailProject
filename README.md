# SplitEase — Splitwise Clone

A full-stack expense-sharing application inspired by Splitwise. Split bills with friends, track balances, settle debts, and chat on expenses in real time.

## Live Demo

> Deploy using the instructions below, then add your URL here.

## Features

- **Authentication** — Register and login with email/password.
- **Groups** — Create groups, invite via link, add/remove members
- **Expenses** — Split equally, unequally (exact amounts), by percentage, or by shares
- **Balances** — Per-group balances, simplified debts, and cross-group summary
- **Settlements** — Record payments between group members
- **Expense Chat** — Real-time messaging on each expense (2s polling)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (relational) |
| ORM | Prisma |
| Auth | JWT (httpOnly cookies) |
| AI Tool | **Cursor (Claude)** |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) OR a hosted PostgreSQL instance (Neon, Supabase, etc.)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd SpreetailProject
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://splitwise:splitwise@localhost:5432/splitwise_clone?schema=public"
JWT_SECRET="your-random-secret-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Start database

```bash
docker compose up -d
```

### 4. Setup database

```bash
npm run db:push
npm run db:seed
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

After seeding, use these accounts (password: `password123`):

| Email | Name |
|-------|------|
| alice@example.com | Alice |
| bob@example.com | Bob |
| charlie@example.com | Charlie |

Demo group invite code: `demo-group-invite`

## Deployment

### Database (Neon — recommended)

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`

### App (Vercel)

1. Push code to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Set environment variables:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — random 32+ char string
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL
4. Deploy
5. Run migrations: `npx prisma db push` against production DB (from local with prod DATABASE_URL)

```bash
DATABASE_URL="your-neon-url" npx prisma db push
DATABASE_URL="your-neon-url" npm run db:seed
```

## Project Structure

```
src/
├── app/
│   ├── api/          # REST API routes
│   ├── dashboard/    # Main dashboard
│   ├── groups/       # Group detail & expense chat
│   ├── join/         # Invite link handler
│   └── login/        # Auth page
├── components/       # Modals (AddExpense, SettleUp)
└── lib/              # Auth, balances, prisma, utils
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Demo data
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/dashboard` | User summary + groups |
| GET/POST | `/api/groups` | List/create groups |
| GET | `/api/groups/:id` | Group detail + balances |
| POST/DELETE | `/api/groups/:id/members` | Add/remove members |
| POST | `/api/groups/join` | Join via invite code |
| POST | `/api/groups/:id/expenses` | Create expense |
| GET/DELETE | `/api/expenses/:id` | Get/delete expense |
| GET/POST | `/api/expenses/:id/messages` | Expense chat |
| POST | `/api/groups/:id/settlements` | Record payment |

## Assignment Deliverables

| File | Description |
|------|-------------|
| `README.md` | Setup and deployment instructions |
| `BUILD_PLAN.md` | Product research, architecture, tradeoffs |
| `AI_CONTEXT.md` | Full rebuild context for AI/human evaluators |
| `PROMPTS.md` | Key prompts used during development |
| `SCOPE.md` | Product scope, CSV anomaly log, database schema |
| `DECISIONS.md` | Engineering decision log with options and reasoning |
| `AI_USAGE.md` | AI tools, prompts, and error corrections |
| `IMPORT_REPORT.md` | Sample CSV import report (also generated live in app) |
| `data/sample-expenses.csv` | Sample CSV with intentional data anomalies |

### CSV Import

Upload a CSV from any group page via **Import CSV**. The app validates each row, skips/fixes anomalies, and displays an import report. See `SCOPE.md` for the anomaly log and `IMPORT_REPORT.md` for a sample output.


## License

MIT
