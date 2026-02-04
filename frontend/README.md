# Expense Tracker Frontend

React + TypeScript + Vite frontend for the monorepo in this repository.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies API requests to the backend:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Proxy config: `vite.config.ts`

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | (empty) | Backend API base URL. When empty in dev, requests go to `/expenses` and are handled by the Vite proxy. Set this in production builds. |

## Scripts

```bash
npm run dev     # start Vite dev server
npm run build   # typecheck + build production bundle
npm run lint    # ESLint
npm test        # Vitest (if tests exist)
```

## Code Layout

- `src/api.ts` — API client (`fetch` wrappers + types)
- `src/ExpensesPage.tsx` — top-level screen
- `src/components/` — UI components

## Upgrading from MVP

See `frontend/FRONTEND_UPGRADE.md` for a concrete roadmap and a copy/paste prompt for upgrading the UI/UX and frontend architecture.
