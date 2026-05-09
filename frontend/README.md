# BNR Compliance Portal — Frontend

React + TypeScript UI for the Bank Licensing & Compliance Portal. Talks to the
Spring Boot backend at `../` over JSON.

## Quick start

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000, proxies /api and /ws (default target http://localhost:8088 for dockerised API — override with COMPLIANCE_API_PROXY)
```

In a second terminal, start the backend (see the project root README / [`docs/DESIGN.md`](../docs/DESIGN.md)).

## Available scripts

| script               | what it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Vite dev server with /api proxy to Spring Boot  |
| `npm run build`      | Type-check then `vite build` (output in `dist/`) |
| `npm run preview`    | Serve the production build locally              |
| `npm test`           | Run vitest test suite once                      |
| `npm run test:watch` | Re-run tests on file change                     |

## Architecture

- `src/api/` — one module per backend domain (auth, applications, documents, users, audit). Axios instance with request interceptor (JWT) + response interceptor (401 -> redirect, 403 -> forbidden banner).
- `src/contexts/AuthContext.tsx` — JWT in memory plus **sessionStorage** so refresh keeps you logged in (tab close clears it). On boot it validates with `/api/v1/auth/me`.
- `src/routes/` — `ProtectedRoute` (auth gate) and `RoleRoute` (page-level role gate).
- `src/components/RoleGate.tsx` — inline role gate. **Renders nothing** when the role is not allowed; never disables.
- `src/lib/application-actions.ts` — derives the visible action set from `(role, status, currentUserId, application)`. Mirrors the backend state machine; the backend remains authoritative.
- `src/lib/schemas.ts` — Zod schemas used by every form via React Hook Form's `zodResolver`.
- `src/lib/file-validation.ts` — client-side document upload guard rails (5 MB, allowed MIME types).
- `src/pages/` — one component per route.

## Session persistence (refresh)

The access token is stored in **sessionStorage** as well as memory, so **reload / F5** in the same tab keeps you signed in. Closing the tab clears it—the token does **not** use `localStorage`, so a new tab or browser restart requires logging in again unless you change that policy.

XSS can still read `sessionStorage`; for stricter deployments you would move to **httpOnly cookies** and refresh tokens (backend change).

## Tests

Four test files cover the four categories the spec calls out:

| file                                | covers                                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| `jwt.test.ts`                       | `useAuth` hook test #1 — role parsing from JWT                      |
| `ProtectedRoute.test.tsx`           | `useAuth` hook test #2 — redirect on unauthenticated access         |
| `RoleGate.test.tsx`                 | Role-based rendering — wrong-role buttons are *not rendered at all* |
| `application-actions.test.ts`       | State-machine UI — the right buttons appear in the right states     |
| `schemas.test.ts`                   | Form validation — Zod rejects invalid inputs (incl. oversized file) |
