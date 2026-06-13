# Key Prompts Used

This document captures the primary prompts used during development with **Cursor (Claude)**.

---

## Prompt 1: Assignment Brief (Initial)

```
Assignment: Build a Clone of the Split wise App

[Full assignment text including minimum requirements, deliverables, AI_CONTEXT.md requirements, and the required initial interview prompt]
```

**AI Response:** Started discovery interview with 21+ product/engineering questions. Created initial `AI_CONTEXT.md` skeleton.

---

## Prompt 2: Build Directive (Pivot)

```
just clone the thing whatever was asked in the assignment. give me the full working project.
```

**AI Response:** Proceeded to full implementation with these defaults:
- Next.js 14 + TypeScript + Tailwind
- PostgreSQL + Prisma
- JWT auth
- All assignment features implemented
- Documentation: README, BUILD_PLAN, AI_CONTEXT

---

## Prompt 3: Implicit (via assignment required initial prompt)

```
You are a junior engineer helping me complete an internship assignment.
The assignment is to reverse engineer Splitwise, scope a realistic 3-day version,
and build a working deployed app.
Important instructions:
1. Do not assume product requirements.
2. Do not jump directly into implementation.
3. Ask me detailed questions...
[etc.]
```

**Outcome:** Interview was started but user overrode with Prompt 2 to skip discovery and build immediately.

---

## Rebuild Prompt (for evaluators)

To recreate this app from context, paste `AI_CONTEXT.md` into Cursor with:

```
Read AI_CONTEXT.md completely. This is the source of truth.
Build the SplitEase Splitwise clone exactly as specified in AI_CONTEXT.md.
Use Next.js 14, PostgreSQL, Prisma, JWT auth.
Implement all API routes, pages, and components described.
Include seed data and docker-compose for local PostgreSQL.
```
