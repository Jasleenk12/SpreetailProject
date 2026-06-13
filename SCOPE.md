# SCOPE.md

## Product Scope

SplitEase is a Splitwise-inspired expense-sharing web app built as an internship assignment deliverable.

### In Scope

| Feature | Description |
|---------|-------------|
| Authentication | Email/password register and login |
| Groups | Create, invite via link, add/remove members |
| Expenses | Create with 4 split types: equal, exact, percentage, shares |
| CSV Import | Bulk import expenses from CSV with anomaly detection |
| Balances | Per-group balances, simplified debts, dashboard summary |
| Settlements | Record payments between members |
| Expense Chat | Per-expense messaging with 2-second polling |
| Database | Relational (SQLite local, PostgreSQL production) |

### Out of Scope

- Multi-currency support
- OAuth / social login
- Receipt uploads
- Recurring expenses
- Email notifications
- Mobile native app
- Expense editing (delete only)
- WebSocket-based real-time chat

---

## CSV Data Anomaly Log

Source file: `data/sample-expenses.csv`

The sample CSV was designed with intentional data quality issues to test the import pipeline. Below is every anomaly found and how the software handles it.

| Row | Field | Problem Found | Action Taken |
|-----|-------|---------------|--------------|
| 5 | `amount` | Negative value (`-30`) | **Skipped** — amounts must be positive |
| 6 | `description` | Empty description | **Skipped** — description is required |
| 7 | `paid_by_email` | Unknown user (`unknown@example.com`) not in group | **Skipped** — payer must be a group member |
| 8 | `participant_values` | Percentages sum to 90, not 100 (`50;30;10`) | **Skipped** — percentage splits must total 100% |
| 9 | `expense_date` | Invalid date string (`not-a-date`) | **Fixed** — defaulted to today's date |
| 10 | `amount` | Non-numeric value (`N/A`) | **Skipped** — amount must be a valid number |
| 1–4 | — | Valid rows | **Imported** successfully |
| 11 | — | Valid SHARES split row | **Imported** successfully |

### Additional Validation Rules (Software-Enforced)

| Anomaly Type | Detection | Action |
|--------------|-----------|--------|
| Missing CSV headers | Header row missing required columns | Abort entire import |
| Missing payer email | Empty `paid_by_email` | Skip row |
| Invalid split type | Value not in EQUAL/EXACT/PERCENTAGE/SHARES | Skip row |
| Participant not in group | Email in `participants` not a member | Skip row |
| Exact amounts mismatch | Sum of exact values ≠ expense total | Skip row |
| No participants | Empty `participants` field | Skip row |
| Zero participants after parse | All emails blank | Skip row |

---

## Database Schema

Relational schema managed by Prisma ORM (`prisma/schema.prisma`).

```
User
├── id          String   PK (cuid)
├── email       String   UNIQUE
├── name        String
├── password    String   (bcrypt hashed)
├── createdAt   DateTime
└── updatedAt   DateTime

Group
├── id          String   PK (cuid)
├── name        String
├── description String?
├── inviteCode  String   UNIQUE
├── createdById String   FK → User
├── createdAt   DateTime
└── updatedAt   DateTime

GroupMember
├── id          String   PK
├── groupId     String   FK → Group (cascade delete)
├── userId      String   FK → User (cascade delete)
├── role        String   (admin | member)
├── joinedAt    DateTime
└── UNIQUE(groupId, userId)

Expense
├── id          String   PK
├── groupId     String   FK → Group (cascade delete)
├── paidById    String   FK → User
├── description String
├── amount      Decimal
├── splitType   String   (EQUAL | EXACT | PERCENTAGE | SHARES)
├── expenseDate DateTime
├── createdAt   DateTime
└── updatedAt   DateTime

ExpenseSplit
├── id          String   PK
├── expenseId   String   FK → Expense (cascade delete)
├── userId      String   FK → User
├── amount      Decimal
├── percentage  Decimal? (for PERCENTAGE splits)
├── shares      Int?     (for SHARES splits)
└── UNIQUE(expenseId, userId)

ExpenseMessage
├── id          String   PK
├── expenseId   String   FK → Expense (cascade delete)
├── userId      String   FK → User
├── content     String
└── createdAt   DateTime

Settlement
├── id          String   PK
├── groupId     String   FK → Group (cascade delete)
├── payerId     String   FK → User
├── receiverId  String   FK → User
├── amount      Decimal
├── note        String?
├── settledAt   DateTime
└── createdAt   DateTime
```

### Entity Relationships

- User ↔ Group: many-to-many via `GroupMember`
- Group → Expense: one-to-many
- Expense → ExpenseSplit: one-to-many
- Expense → ExpenseMessage: one-to-many
- Group → Settlement: one-to-many

### CSV Import Mapping

| CSV Column | Maps To |
|------------|---------|
| `description` | `Expense.description` |
| `amount` | `Expense.amount` |
| `paid_by_email` | `Expense.paidById` (resolved via User.email) |
| `split_type` | `Expense.splitType` |
| `expense_date` | `Expense.expenseDate` |
| `participants` | `ExpenseSplit` rows (emails → userIds) |
| `participant_values` | Split amounts / percentages / shares |
