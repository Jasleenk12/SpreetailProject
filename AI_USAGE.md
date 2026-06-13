# AI_USAGE.md

Documentation of AI collaboration during the SplitEase (Splitwise clone) internship assignment.

---

## AI Tools Used

| Tool | Role |
|------|------|
| **Cursor IDE** | Primary development environment |
| **Claude (via Cursor Agent)** | Code generation, architecture, debugging, documentation |

---

## Key Prompts

### Prompt 1: Assignment Brief + Required Interview Mode

```
You are a junior engineer helping me complete an internship assignment.
The assignment is to reverse engineer Splitwise, scope a realistic 3-day version,
and build a working deployed app.
[... full assignment text with interview instructions ...]
Start by interviewing me. Ask questions across product goals, data model, auth, etc.
Do not give me a final plan until you have asked enough questions.
```

**Outcome:** AI started a structured product interview and created `AI_CONTEXT.md` skeleton.

---

### Prompt 2: Direct Build Directive

```
just clone the thing whatever was asked in the assignment. give me the full working project.
```

**Outcome:** AI skipped remaining interview, chose tech stack defaults, and built the full application in one session.

---

### Prompt 3: Add Submission Files

```
also add theses files as i have to provide these also.
[screenshot of Google Form requiring SCOPE.md, DECISIONS.md, Import report, AI_USAGE.md]
```

**Outcome:** AI added CSV import feature, anomaly detection, import report generation, and all four submission documents.

---

## AI Errors and Corrections

### Error 1: `create-next-app` Failed on Directory Name

**What AI produced:** Ran `npx create-next-app@14 .` in folder `SpreetailProject`.

**Problem:** npm rejected the project name because it contains capital letters (`SpreetailProject`).

**How identified:** Terminal error: `name can no longer contain capital letters`.

**Correction:** Manually scaffolded the project — created `package.json` with `"name": "splitwise-clone"`, plus all config files (`tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, etc.) by hand instead of using the CLI.

---

### Error 2: Prisma Enum Incompatible with SQLite

**What AI produced:** `enum SplitType { EQUAL EXACT PERCENTAGE SHARES }` in `prisma/schema.prisma` with SQLite provider.

**Problem:** `prisma db push` failed with `P1012: the current connector does not support enums`.

**How identified:** Build/deploy step failed during `npx prisma db push`.

**Correction:** Replaced Prisma enum with `splitType String @default("EQUAL")` and updated TypeScript code to use string union types (`"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES"`).

---

### Error 3: Broken `dashboard/route.ts` After Import Cleanup

**What AI produced:** When fixing an unused import, AI accidentally removed the `computeGroupBalances` import AND introduced a syntax error (extra `}` in the Prisma `include` block).

**Problem:** `npm run build` failed with `Expression expected` at line 20 and missing `computeGroupBalances` reference.

**How identified:** Production build (`npm run build`) failed with TypeScript/webpack compile error.

**Correction:** Restored `import { computeGroupBalances } from "@/lib/balances"` and fixed the malformed Prisma query braces in `src/app/api/dashboard/route.ts`.

---

### Error 4: `parseBody()` Called Without Request Argument

**What AI produced:** API routes calling `parseBody<T>()` with no arguments: `await parseBody<{ email: string }>()`.

**Problem:** TypeScript error: `Expected 1 arguments, but got 0` — the helper requires the `Request` object.

**How identified:** `npm run build` type-check phase failed on `src/app/api/auth/login/route.ts`.

**Correction:** Updated all 7 API routes to pass `request`: `await parseBody<T>(request)`.

---

### Error 5: Prisma `mode: "insensitive"` on SQLite

**What AI produced:** User search query with `{ contains: q, mode: "insensitive" }`.

**Problem:** TypeScript error — SQLite provider doesn't support case-insensitive `mode` filter.

**How identified:** Build failed on `src/app/api/users/search/route.ts`.

**Correction:** Removed `mode: "insensitive"` from search filters (SQLite default matching is case-insensitive for ASCII anyway).

---

## What Worked Well

- AI generated the complete database schema, API routes, and frontend pages in a single pass
- Balance calculation logic (`calculateSplits`, `simplifyDebts`) was correct on first attempt
- Documentation files (README, BUILD_PLAN, AI_CONTEXT) were thorough and assignment-aligned
- AI correctly identified Edge runtime constraint and split JWT logic into `jwt.ts` separate from `auth.ts`

## What Required Human Oversight

- Verifying builds after each major change (`npm run build`)
- Choosing to use SQLite when Docker wasn't available locally
- Providing the Google Form screenshot to know which additional files were needed
- Deployment credentials (GitHub, Vercel, Neon) — not automatable without user accounts
