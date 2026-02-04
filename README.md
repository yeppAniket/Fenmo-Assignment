# Fenmo - Expense Tracker

Full-stack expense tracker built for **production-like correctness** under retries, refreshes, and slow networks.

**Live:** https://fenmo-expense-tracker.fly.dev

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Fastify + SQLite (better-sqlite3) |
| Frontend | React + Vite + TypeScript |
| Testing | Vitest (25 integration tests) |
| Deployment | Fly.io (Docker, persistent SQLite volume) |

## How to Run Locally

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Start backend (port 3001)
cd ../backend && npm run dev

# 3. Start frontend (port 5173) — in a separate terminal
cd ../frontend && npm run dev

# 4. Open http://localhost:5173
```

The SQLite database file (`expenses.db`) is created automatically on first backend start.

### Environment Variables

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `PORT` | backend | `3001` | Server port |
| `DB_PATH` | backend | `./expenses.db` | SQLite database file path |
| `VITE_API_URL` | frontend | (empty) | Backend API base URL (empty = relative URLs via Vite proxy) |

### Scripts

| Script | Backend | Frontend |
|--------|---------|----------|
| `npm run dev` | Start dev server (tsx watch) | Start Vite dev server |
| `npm run build` | Compile TypeScript | Build production bundle |
| `npm test` | Run 25 integration tests | — |

## Key Design Decisions

### Money as Integer Paise

All monetary values are stored as **integer paise** (`amount_paise INTEGER`) rather than floating-point. The API accepts amounts as decimal strings (e.g. `"199.50"`) and converts to paise (`19950`) server-side using integer arithmetic (`whole * 100 + fractional`). This eliminates floating-point rounding errors.

### Idempotent POST via Idempotency-Key

`POST /expenses` requires an `Idempotency-Key` header (UUID). The column has a `UNIQUE` constraint:

- Duplicate key → return existing expense with **200** (no duplicate insert)
- New key → insert and return **201**

Safe under network retries, double-clicks, and page refreshes.

### Pending Submission Recovery

Before POST, the frontend persists `{ idempotencyKey, payload }` to `localStorage`. On success, it's cleared. If the user refreshes mid-request, a recovery banner appears with Retry (same key) or Dismiss.

### Multi-User (No Auth)

Users enter a name on first visit (stored in `localStorage`). All expenses are tagged with this username and filtered by it. No authentication — just namespace separation. This keeps the focus on data correctness rather than auth infrastructure.

### Date Handling

Dates stored as `TEXT` in `YYYY-MM-DD` format. Sorts lexicographically in SQLite. Avoids timezone issues. A separate `created_at` ISO timestamp records server insertion time. The validator checks for real calendar dates (rejects `2024-02-30`).

### Safe HTTP Client

The frontend `httpClient.ts` wraps `fetch()` to:
- Check `Content-Type` before calling `res.json()` (prevents crashes on HTML error pages from reverse proxies)
- Catch network errors and wrap in `HttpError` with user-friendly message
- Propagate `AbortSignal` for request cancellation

## API Documentation

### POST /expenses

```
POST /expenses
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "amount": "199.50",
  "category": "Food",
  "description": "Lunch",
  "date": "2025-03-15",
  "user": "alice"
}
```

**201 Created** / **200 Idempotent Replay:**
```json
{
  "id": 1,
  "amount_paise": 19950,
  "category": "Food",
  "description": "Lunch",
  "date": "2025-03-15",
  "created_at": "2025-03-15T10:30:00.123Z"
}
```

**Validation rules:**
- `amount` — required, non-negative decimal string, up to 2 decimal places
- `category` — required, non-empty, max 50 characters
- `date` — required, valid `YYYY-MM-DD` calendar date
- `description` — optional, max 200 characters
- `user` — required, non-empty, max 50 characters

### GET /expenses

| Param | Example | Default |
|-------|---------|---------|
| `user` | `?user=alice` | all users |
| `category` | `?category=Food` | all categories |
| `sort` | `?sort=date_asc` | `date_desc` |

```json
{
  "items": [ ... ],
  "count": 1,
  "total_paise": 19950
}
```

### GET /expenses/summary

| Param | Example | Default |
|-------|---------|---------|
| `user` | `?user=alice` | all users |

```json
{
  "categories": [
    { "category": "Food", "total_paise": 15000, "count": 2 }
  ],
  "grand_total_paise": 15000
}
```

### GET /users

Returns distinct usernames that have created expenses.

```json
{
  "users": ["alice", "bob"]
}
```

### GET /health

```
→ 200 { "status": "ok" }
```

## Database Schema

```sql
CREATE TABLE expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_paise    INTEGER NOT NULL CHECK(amount_paise >= 0),
  category        TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  date            TEXT    NOT NULL,
  created_at      TEXT    NOT NULL,
  idempotency_key TEXT    NOT NULL UNIQUE,
  user            TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX expenses_date_idx     ON expenses(date DESC);
CREATE INDEX expenses_category_idx ON expenses(category);
CREATE INDEX expenses_user_idx     ON expenses(user);
```

## Testing

```bash
cd backend && npm test   # 25 integration tests
```

Tests cover:
- POST idempotency (duplicate key → same row, 200 replay)
- Validation (missing fields, negative amount, invalid date, impossible date, missing user)
- GET filtering by category and by user
- GET sorting (date_desc, date_asc)
- Summary filtering by user
- Total computation (matches sum of filtered items)
- Empty state handling

## Deployment

Single-service deployment on Fly.io. The backend serves both the API and the frontend static files from `frontend/dist/`.

```bash
fly deploy
```

SQLite database persists on a Fly.io volume mounted at `/data/expenses.db`.
