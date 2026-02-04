# Expense Tracker

Minimal full-stack expense tracker built for **production-like correctness** under retries, refreshes, and slow networks.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Fastify + SQLite (better-sqlite3) |
| Frontend | React + Vite + TypeScript |
| Testing | Vitest (20 integration tests) |
| Monorepo | `backend/` and `frontend/` |

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

The SQLite database file (`expenses.db`) is created automatically on first backend start. No migrations to run.

### Environment Variables

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `PORT` | backend | `3001` | Server port |
| `VITE_API_URL` | frontend | `http://localhost:3001` | Backend API base URL |

### Scripts

| Script | Backend | Frontend |
|--------|---------|----------|
| `npm run dev` | Start dev server (tsx watch) | Start Vite dev server |
| `npm run build` | Compile TypeScript | Build production bundle |
| `npm test` | Run integration tests | Run tests |
| `npm run lint` | ESLint | ESLint |

## Key Design Decisions

### Money as Integer Paise

All monetary values are stored as **integer paise** (`amount_paise INTEGER`) rather than floating-point. The API accepts amounts as decimal strings (e.g. `"199.50"`) and converts to paise (`19950`) server-side. This eliminates floating-point rounding errors that plague financial calculations.

### Idempotent POST via Idempotency-Key

The `POST /expenses` endpoint requires an `Idempotency-Key` header (UUID). The `idempotency_key` column has a `UNIQUE` constraint. On duplicate key:

- If the key already exists → return the existing expense with **200** (no duplicate insert)
- If the key is new → insert and return **201**

This makes the endpoint safe under:
- **Network retries** — same key replays harmlessly
- **Double-clicks** — button is disabled, but even if it fires twice, same key = same row
- **Refresh after submit** — pending submission stored in `localStorage`; retry uses same key

### Pending Submission Recovery

Before sending a POST, the frontend persists `{ idempotencyKey, payload }` to `localStorage`. On success, it's cleared. If the user refreshes mid-request, the app shows a recovery banner with Retry (same key, no duplicates) or Dismiss.

### Date Handling

Dates are stored as `TEXT` in `YYYY-MM-DD` format. This sorts lexicographically correctly in SQLite and avoids timezone issues (the date is a calendar date, not a timestamp). A separate `created_at` ISO timestamp records server insertion time.

## Trade-offs Due to Timebox

| Decision | Rationale |
|----------|-----------|
| No auth / multi-user | Single-user scope; adding auth would not demonstrate the core correctness requirements |
| No pagination | Acceptable for the expected data volume; all filtering/sorting happens in one query |
| `id` is auto-increment INTEGER, not UUID | Simpler with SQLite; the idempotency key serves as external identifier |
| Schema created on startup (not migration runner) | Single table; no need for migration tooling yet |
| Minimal CSS (no framework) | Focus on correctness over aesthetics |
| Category is free-form text | No predefined categories; dropdown auto-populates from existing data |

## API Documentation

### GET /health

Health check endpoint.

```
GET /health
→ 200 { "status": "ok" }
```

### POST /expenses

Create a new expense. Idempotent via `Idempotency-Key` header.

**Request:**
```
POST /expenses
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "amount": "199.50",
  "category": "Food",
  "description": "Lunch",
  "date": "2025-03-15"
}
```

**Response (201 Created / 200 Idempotent Replay):**
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

**Validation errors (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "amount": "amount must be a non-negative decimal with up to 2 decimal places",
      "date": "date must be in YYYY-MM-DD format"
    }
  }
}
```

**Validation rules:**
- `amount` — required, non-negative decimal string, up to 2 decimal places
- `category` — required, non-empty after trim, max 50 characters
- `date` — required, valid `YYYY-MM-DD` calendar date
- `description` — optional, max 200 characters

### GET /expenses

List expenses with optional filtering and sorting.

**Query parameters:**
| Param | Example | Default |
|-------|---------|---------|
| `category` | `?category=Food` | all categories |
| `sort` | `?sort=date_asc` | `date_desc` (newest first) |

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "amount_paise": 19950,
      "category": "Food",
      "description": "Lunch",
      "date": "2025-03-15",
      "created_at": "2025-03-15T10:30:00.123Z"
    }
  ],
  "count": 1,
  "total_paise": 19950
}
```

`total_paise` is computed server-side with the same filter applied, ensuring consistency.

## Database Schema

```sql
CREATE TABLE expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_paise    INTEGER NOT NULL CHECK(amount_paise >= 0),
  category        TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  date            TEXT    NOT NULL,
  created_at      TEXT    NOT NULL,
  idempotency_key TEXT    NOT NULL UNIQUE
);

CREATE INDEX expenses_date_idx     ON expenses(date DESC);
CREATE INDEX expenses_category_idx ON expenses(category);
```

## Testing

```bash
cd backend && npm test   # 20 integration tests
```

Tests cover:
- POST idempotency (duplicate key → same row, 200 replay)
- Validation (missing fields, negative amount, invalid date, impossible date)
- GET filtering by category
- GET sorting (date_desc, date_asc)
- Total computation (matches sum of filtered items)
- Empty state handling
