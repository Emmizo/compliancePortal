# BNR Compliance Portal

I built this as Spring Boot+ MySql + React: licensing workflows (drafts, reviewer queue, approver decisions, uploads, audit trail). Below is how I run it and where I cut corners on purpose.

## How I run it

Everything below is enough to bring the system up with **Docker Compose** or **without Docker**.

### Docker Compose (what I use day to day)

1. Copy env and start the stack:

   ```bash
   cp .env.example .env    # JWT + DB defaults are throwaway until I rotate them
   docker compose up --build
   ```

2. Open the app: http://localhost:3000 (`FRONTEND_HOST_PORT`; same port Vite uses, so don’t run `npm run dev` on **3000** alongside this unless I remap the port).

3. API docs (pick the **Server** dropdown in Swagger so the base URL is `:3000`, `:8088`, or `:8080` — not bare `http://localhost/`, port 80):  
   http://localhost:3000/swagger-ui.html  
   OpenAPI JSON: http://localhost:3000/v3/api-docs

4. Sign in with a seeded account (password `Password123!` until I change it) — full list under [Seed data](#seed-data).

**What that command does:** it **builds images** (backend JAR, frontend static bundle), starts **db → backend → frontend nginx**, waits for MySQL healthy, then boots Spring. **Flyway** runs migrations on startup. If **`SEED_ENABLED` is true** (Docker default: `${SEED_ENABLED:-true}` in `docker-compose.yml`), **`DataInitializer`** seeds users and two sample applications once the app is up — idempotent, so restarts don’t duplicate rows. Set **`SEED_ENABLED=false`** in `.env` for a clean DB without demo accounts.

| What | URL / port |
|------|------------|
| App UI (nginx) | http://localhost:3000 |
| Swagger UI | http://localhost:3000/swagger-ui.html |
| OpenAPI JSON | http://localhost:3000/v3/api-docs |
| Spring directly on host | http://localhost:8088 (host **8088** → container **8080**) |

`./mvnw spring-boot:run` without Compose usually listens on **8080**; Compose publishes the JVM on **8088** so it doesn’t clash with something already on 8080.

**Services in Compose**

- **db** — `mysql:8.4`; **3306** is internal only (not published to the host).
- **backend** — `8088:8080`.
- **frontend** — nginx serves `dist/` and proxies **`/api`** and **`/ws`** so the browser has one origin and CORS stays simple.

**Volumes**

`docker compose down` keeps data. `docker compose down -v` wipes:

- `compliance_mysql_data`
- `compliance_documents` (uploads under `/var/compliance/documents` in the backend container)

**Compose commands I repeat**

- Full rebuild: `docker compose up --build`
- Backend image only: `docker compose build backend && docker compose up -d backend`
- Logs: `docker compose logs -f backend`
- Shell in backend: `docker compose exec backend bash`
- MySQL CLI (match user/db to `.env`): `docker compose exec db mysql -uportal -p compliance_portal`

**Smoke test (login on published API port)**

```bash
curl -s http://localhost:8088/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"applicant@bnr.rw","password":"Password123!"}'
```

**Before I’d call a Docker deploy “prod”**

- Rotate **`JWT_SECRET`** (e.g. `openssl rand -base64 48`).
- Strong DB passwords in `.env`.
- **`SEED_ENABLED=false`** — no known logins.
- Consider not publishing **8088** if everything should go through nginx only.
- TLS somewhere — sample nginx is plain HTTP.
- Back up the MySQL volume and the documents volume.

**When Compose misbehaves**

- **DB connection errors on boot** — MySQL still warming; healthcheck usually covers it; retry or `docker compose logs db`.
- **Port 3000 in use** — often my own Vite; stop it or change **`FRONTEND_HOST_PORT`**.
- **Missing tables** — Flyway; `docker compose logs backend | grep -i flyway`. Worst case: `docker compose down -v` and rebuild.

### No Docker

1. Run **MySQL 8.x** where `application.properties` expects (`DB_*` env overrides if needed).
2. Backend: `./mvnw spring-boot:run` (typically **8080**).
3. Frontend:

   ```bash
   cd frontend && npm install && npm run dev
   ```

   Vite proxies **`/api`** and **`/ws`**. Default proxy target is **`127.0.0.1:8088`** to match Compose; if Spring is on **8080**, set **`COMPLIANCE_API_PROXY=http://127.0.0.1:8080`**.

The **Frontend** section below lists scripts and where code lives.

### Run automated tests

From the **repo root** (backend uses embedded **H2** in tests — no MySQL required). **`java.version`** in `pom.xml` is **21**; `./mvnw` needs at least that JDK (`java -version`).

```bash
./mvnw test
```

Frontend (**Vitest**):

```bash
cd frontend && npm test
```

Watch mode while editing UI:

```bash
cd frontend && npm run test:watch
```

**Using Docker for the same tests** (handy when my host JDK/Node version doesn’t match the project): see [Tests — With Docker](#with-docker).

## Frontend (`frontend/`)

React + Vite + TypeScript. Bearer JWT JSON to the Spring API.

```bash
cd frontend
npm install
npm run dev  
```

Default proxy target is `http://127.0.0.1:8088`; for API on 8080: `COMPLIANCE_API_PROXY=http://127.0.0.1:8080`.

**npm scripts**

- `npm run dev` — Vite + proxies  
- `npm run build` — `tsc -b`, then `vite build` → `dist/` (what nginx Docker image uses)  
- `npm run preview` — serve `dist/` locally  
- `npm test` / `npm run test:watch` — Vitest  

**Where I put things**

- `src/api/` — Axios per domain; JWT + 401/403 interceptors.  
- `src/contexts/AuthContext.tsx` — token in memory + **sessionStorage**; boot calls `/auth/me`.  
- `src/routes/` — `ProtectedRoute`, `RoleRoute`.  
- `src/components/RoleGate.tsx` — I hide children instead of disabling mystery buttons when the role’s wrong.  
- `src/lib/application-actions.ts` — which actions appear; server still rejects bad transitions.  
- `src/lib/schemas.ts` — Zod + react-hook-form.  
- `src/lib/file-validation.ts` — 5 MB / MIME guards (matched to backend).  
- `src/pages/` — routed screens.  

**Tokens** — I use **sessionStorage**, not `localStorage`. httpOnly cookies would mean backend/CORS rework.

**Tests** — `*.test.ts(x)` under `src/`: JWT role parsing, protected routes, role gates, action matrix vs state, Zod / file validation.

## Gotchas I’ve hit

- Compose pins **mysql:8.4** — I stay on MySQL 8-ish locally; MariaDB isn’t something I test against.
-  First admin comes from **`SEED_ENABLED=true`** seeds or ops; prod should flip seeds off and use **`POST /api/v1/admin/users`** behind an admin JWT.
- **STOMP `/ws`** has to traverse nginx in prod. I added a `/ws` block in `frontend/nginx.conf`; if I strip that, realtime and TanStack refresh look dead while REST still works.
- The SPA keeps JWT in **sessionStorage** — good enough for my dev ergonomics; XSS can still steal it. httpOnly cookies would be me admitting I need another round of backend work.

## Trade-offs I stand by

**JWT vs server sessions.** I wanted a stateless API so I could scale sideways without sticky cookies or Redis sessions on day one. Downside is weak instant revocation unless I bolt on Redis denylists or painfully short TTLs + refresh plumbing. Incident playbook I use in my head: rotate `JWT_SECRET` and accept that everyone logs in again.

**Flyway.** I ship numbered SQL migrations in-repo; Hibernate runs with `ddl-auto=validate` so drift bites in CI instead of silently in prod. Liquibase would’ve been fine; Hibernate-only DDL wouldn’t fly for how I reason about audit and workflow tables.

## API notes

Payloads under `/api/v1/...`. Errors return my `ApiError` envelope (`status`, `error`, `message`, optional `details`, `timestamp`). Stack traces stay server-side (`server.error.*`). I skim logs.

Status codes — how I mentally map responses:

- **401** — bad or missing JWT.
- **403** — logged in but not allowed (`@PreAuthorize`, or domain guards like applicant scope).
- **404** — actually missing resource; I don’t mask forbidden behind 404.
- **409** — optimistic locking / constraint noise surfaced safely.
- **422** — state machine or business rule said no.
- **500** — my bug; client gets a bland message.

No public register. Admins create users via **`POST /api/v1/admin/users`**. Code I grep when I forget: `GlobalExceptionHandler`, `ApiError`, `RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`, `OpenApiConfig`.

## Seed data

On when **`SEED_ENABLED=true`** (Docker/`.env.example` default unless I change it). `DataInitializer` is idempotent — fine to leave on in dev.

### Seeded credentials (dev — change or disable for anything real)

**Password for every seeded user:** `Password123!` (wired as `app.seed.default-password` in `application.properties` unless you add an env hook later).

Sign-in at http://localhost:3000:

- **admin@bnr.rw** / `Password123!` → ADMIN  
- **reviewer@bnr.rw** / `Password123!` → REVIEWER  
- **approver@bnr.rw** / `Password123!` → APPROVER  
- **applicant@bnr.rw** / `Password123!` → APPLICANT  

**Sample apps** seeded for workflow demos: Acme Microfinance Ltd → **SUBMITTED** (reviewer queue); Beta Commercial Bank Ltd → **REVIEWED** (approver queue).

Disable seeding entirely: **`SEED_ENABLED=false`** in `.env`.

## Tests

**Backend** (JUnit; `src/test/` — embedded H2):

```bash
./mvnw test
```

**Frontend** (Vitest):

```bash
cd frontend
npm install   # once
npm test
```

**Frontend watch mode** (`npm run test:watch`): re-runs tests on save.

### With Docker

The **runtime** Compose images don’t ship Maven or the test runner: `Dockerfile` builds the backend JAR with **`./mvnw -DskipTests package`**, so **`docker compose up --build` never runs unit tests**. To run tests in containers anyway:

**Backend** (needs only the repo root bind-mounted; uses **Java 21** like `Dockerfile`, matching `java.version` in `pom.xml`):

```bash
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  eclipse-temurin:21-jdk \
  bash -lc 'chmod +x ./mvnw && ./mvnw -B -ntp test'
```

**Frontend** (same major Node as `frontend/Dockerfile`):

```bash
docker run --rm \
  -v "$(pwd)/frontend:/app" \
  -w /app \
  node:22-alpine \
  sh -lc 'npm ci && npm test'
```

After a backend container run, **`target/`** may be owned by **root** on Linux; remove or `chown` if that gets in the way.

**Manual / integration checks** against the real stack: start Compose as in [Docker Compose](#docker-compose-what-i-use-day-to-day), then use the UI at http://localhost:3000 or the [smoke-test `curl`](#docker-compose-what-i-use-day-to-day) against http://localhost:8088 — that exercises MySQL + Flyway + the running app, not the JUnit suite.

Things I didn’t build but would reach for on a longer contract:

- **Redis** — rate limit login, optional JWT blocklist, shared STOMP broker if I ever run >1 API pod (today the broker is in-memory).
- **Heavier BNR validation** — institution fields, document taxonomies, stricter license-type rules than my generic catalog.
- **Real file pipeline** — scan, S3-style object store, retention; local disk under `/var/compliance/documents` is a dev convenience.
- **Refresh tokens + httpOnly** if a security review says my sessionStorage approach is too cute.
- **Tracing/metrics** — correlation IDs on audit rows, proper dashboards.

## Further reading

- Diagram: `docs/diagrams/`
Simple you can use these three steps following 

-run: docker compose up --build
then in URL use localhost:3000
then use these 
- **admin@bnr.rw** / `Password123!` → ADMIN  
- **reviewer@bnr.rw** / `Password123!` → REVIEWER  
- **approver@bnr.rw** / `Password123!` → APPROVER  
- **applicant@bnr.rw** / `Password123!` → APPLICANT 
to access API documentation use  http://localhost:3000/swagger-ui.html
