# Bank Licensing & Compliance Portal (BNR)

End-to-end portal replacing manual email/spreadsheet licensing workflows: Spring Boot (JWT, RBAC, Flyway, optimistic locking, append-only audit) plus a React SPA.

## Run with Docker (recommended)

```bash
cp .env.example .env   # edit secrets for anything beyond local dev
docker compose up --build
```

- **UI (Docker nginx):** http://localhost:3000 (`FRONTEND_HOST_PORT`; matches Vite’s default dev port — only run one of Docker UI vs `npm run dev` at a time, or remap a port.)
- **API (direct):** http://localhost:8088
- **OpenAPI 3.1 JSON:** http://localhost:3000/v3/api-docs (same origin as the UI; nginx proxies to the backend)
- **Swagger UI:** http://localhost:3000/swagger-ui.html — use the **Servers** dropdown so requests target **:3000**, **:8088**, or **:8080** (never bare `http://localhost` on port **80**, which nothing serves by default). **Authorize:** paste `Bearer <token>` from `POST /api/v1/auth/login`.

Hitting the backend directly (e.g. curl/Postman against the mapped port): same paths on **http://localhost:8088** (`/v3/api-docs`, `/swagger-ui.html`, `/api/v1/...`). Local `./mvnw spring-boot:run` defaults to **http://localhost:8080**.

**Postman / Insomnia:** import from OpenAPI — **File → Import → Link** with `http://localhost:8088/v3/api-docs` (or `:3000` / `:8080` depending on how you run the stack).

Details, volumes, and troubleshooting: [DOCKER.md](DOCKER.md).

## Run without Docker

- **Backend:** JDK 25+, MySQL 8.x, `./mvnw spring-boot:run` (see `src/main/resources/application.properties` for `DB_*` and `JWT_SECRET`).
- **Frontend:** `cd frontend && npm install && npm run dev` — proxies `/api` to the backend.

Frontend scripts and stack: [frontend/README.md](frontend/README.md).

## HTTP API (contract for reviewers)

- **User accounts:** There is **no public self-registration**. Only **`ROLE_ADMIN`** may create users (`POST /api/v1/admin/users`). When `SEED_ENABLED=true`, the stack also provisions demo users (see **Seed data** below).
- **Shape:** JSON under `/api/v1/...`. Successful responses are resource DTOs; failures use a single envelope `ApiError` (`status`, `error`, `message`, optional `details`, `timestamp`) from `GlobalExceptionHandler` and the security entry-point handlers.
- **No stack traces:** Spring Boot’s error page is configured with `server.error.include-stacktrace=never` (and related flags off in `application.properties`). Handlers log full exceptions server-side only; clients never see traces.

**Status codes (authorization is never hidden as “not found”):**

| Code | When |
| ---- | ---- |
| **401** | Missing or invalid JWT (`RestAuthenticationEntryPoint`). |
| **403** | Authenticated but not allowed: `@PreAuthorize` / `AccessDeniedException` (`RestAccessDeniedHandler`), or domain `UnauthorizedActionException` (e.g. wrong role for a transition, applicant opening another applicant’s case). |
| **404** | Truly missing resource (`ResourceNotFoundException`, unknown route). Not used to mask a forbidden action on an existing row. |
| **409** | Optimistic locking conflict or data integrity clash — safe message, no raw DB text. |
| **422** | Invalid workflow transition or other business rule (`IllegalStateTransitionException`, `BusinessRuleViolationException`). |
| **500** | Unexpected bugs only — generic message, no exception detail (`GlobalExceptionHandler` fallback). |

Implementation references: `GlobalExceptionHandler`, `ApiError`, `RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`, `OpenApiConfig` (springdoc).

## Design & assessment mapping

Architecture, trade-offs (JWT vs sessions, optimistic locking, audit enforcement), full state machine and role boundaries: **[docs/DESIGN.md](docs/DESIGN.md)** — **Word:** [docs/Design-Document.docx](docs/Design-Document.docx).

## Tests

```bash
./mvnw test              # backend: state machine, RBAC, reviewer/approver split, concurrency
cd frontend && npm test  # frontend: auth hooks, role gates, action matrix, validation
```

## Seed data (no manual SQL; when `app.seed.enabled=true`)

On startup, `DataInitializer` runs **idempotent** seeds (Docker default: `SEED_ENABLED=true` in compose). Reviewers can log in immediately after `docker compose up --build`.

**Users (one per role)** — shared password **`Password123!`** in dev (change outside local):

| Email | Role |
| ----- | ---- |
| applicant@bnr.rw | APPLICANT |
| reviewer@bnr.rw | REVIEWER |
| approver@bnr.rw | APPROVER |
| admin@bnr.rw | ADMIN |

**Applications (two different workflow states):**

| Institution (seed) | Status after seed | Purpose |
| ------------------ | ----------------- | ------- |
| Acme Microfinance Ltd | **SUBMITTED** | Reviewer queue / begin review |
| Beta Commercial Bank Ltd | **REVIEWED** | Approver queue / final decision |

Disable seeding when needed: `SEED_ENABLED=false` (see `.env.example`).
