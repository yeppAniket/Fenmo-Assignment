# Expense Tracker

Minimal full-stack expense tracker built for **production-like correctness** under retries, refreshes, and slow networks.

## Stack

- **Backend:** Node.js + Fastify + SQLite (via better-sqlite3)
- **Frontend:** React + Vite + TypeScript
- **Monorepo:** `backend/` and `frontend/`

## Key Design Decisions

- Money stored as **integer paise** (no floats) to avoid rounding bugs
- `POST /expenses` is **idempotent** via `Idempotency-Key` header + UNIQUE constraint
- `GET /expenses` supports category filter + date sort
- UI prevents double-submits and supports retry with the same idempotency key

## Phases

| Phase | Goal |
|-------|------|
| 0 | Repo structure + tooling |
| 1 | Backend: DB schema, POST /expenses (idempotent), GET /expenses |
| 2 | Frontend: form, list, filter, sort, total |
| 3 | Reliability: retry UX, loading states, error handling |
| 4 | Tests + polish |

## Getting Started

```bash
# Backend
cd backend
npm install
npm run dev      # starts on :3001

# Frontend
cd frontend
npm install
npm run dev      # starts on :5173
```

## Scripts

Each package supports: `dev`, `build`, `lint`, `test`
