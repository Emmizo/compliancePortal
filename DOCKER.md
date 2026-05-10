# Running the BNR Compliance Portal in Docker

Three containers, one command:

```bash
cp .env.example .env       # adjust secrets if you like
docker compose up --build
```

Then open <http://localhost:3000> (default `FRONTEND_HOST_PORT`). Once the stack is up:

| URL                                         | what                                  |
| ------------------------------------------- | ------------------------------------- |
| <http://localhost:3000>                     | React UI                              |
| <http://localhost:3000/swagger-ui.html>     | OpenAPI / Swagger interactive API docs |
| <http://localhost:3000/v3/api-docs>         | Raw OpenAPI 3.1 JSON                  |
| <http://localhost:8088/api/v1/auth/login>   | Direct backend access (curl/postman)  |

The seed data gives you four users (one per role) sharing the password from
`.env` (`Password123!` by default):

| Email                | Role      |
| -------------------- | --------- |
| `applicant@bnr.rw`   | APPLICANT |
| `reviewer@bnr.rw`    | REVIEWER  |
| `approver@bnr.rw`    | APPROVER  |
| `admin@bnr.rw`       | ADMIN     |

## What's running where

| service    | image                            | host port | container | purpose                                    |
| ---------- | -------------------------------- | --------- | --------- | ------------------------------------------ |
| `db`       | `mysql:8.4`                      | (none)    | 3306      | application database, only on docker net   |
| `backend`  | built from `./Dockerfile`        | `8088`    | 8080      | Spring Boot fat-jar (direct API access)    |
| `frontend` | built from `./frontend/Dockerfile` | `3000`    | 80        | nginx serving React + reverse-proxying API |

The frontend nginx forwards `/api/*` to the backend over the internal bridge
network, so the browser only ever sees one origin and CORS isn't needed in this
configuration.

## Volumes (data survives `docker compose down`)

- `compliance_mysql_data` — MySQL data directory.
- `compliance_documents` — uploaded application documents (mirrors what the
  backend writes to `/var/compliance/documents`).

To wipe and start fresh:

```bash
docker compose down -v
```

## Common workflows

| goal                                         | command                                          |
| -------------------------------------------- | ------------------------------------------------ |
| Rebuild after code change                    | `docker compose up --build`                      |
| Rebuild only the backend                     | `docker compose build backend && docker compose up -d backend` |
| Stream logs                                  | `docker compose logs -f backend`                 |
| Open a shell in the backend                  | `docker compose exec backend bash`               |
| Run a one-off SQL query                      | `docker compose exec db mysql -uportal -p compliance_portal` |
| Hit the API directly (bypass the UI)         | `curl http://localhost:8088/api/v1/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"applicant@bnr.rw","password":"Password123!"}'` |

## Production notes

- **Replace `JWT_SECRET`.** The default is a placeholder; generate one with
  `openssl rand -base64 48` and keep it out of version control.
- **Replace `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`.** Same story.
- **Drop `SEED_ENABLED=false`** for any real deployment so you don't ship test
  accounts with a known password.
- **Don't expose port 8088.** Comment out the `ports:` mapping under `backend`
  in `docker-compose.yml` so the API is only reachable through the nginx
  reverse proxy.
- **Run behind TLS.** Either terminate TLS at the nginx container (volume in
  certificates and update `nginx.conf`) or front the stack with a managed
  load-balancer.
- **Back up the volumes.** `compliance_mysql_data` is the system of record for
  the audit log; `compliance_documents` holds the regulatory paper trail.

## Local development without Docker

Docker is the recommended path, but the local-dev workflow still works:

```bash
# backend
./mvnw spring-boot:run        # needs MySQL on :3306 with creds in application.properties

# frontend (in a second terminal)
cd frontend && npm run dev    # http://localhost:3000, proxies /api -> localhost:8088 by default when API is Docker (see vite.config.ts)
```

## Troubleshooting

- **Backend exits with `Communications link failure`.**  The DB container is
  still booting. Compose's `service_healthy` gate normally prevents this; if
  you see it, give it a few seconds and Spring Boot's connection pool will
  retry on the next request.
- **`Bind for 0.0.0.0:3000 failed: port is already allocated`.**  Another
  process is using port 3000 (often `npm run dev` conflicting with the
  frontend container). Stop one of them, or set `FRONTEND_HOST_PORT=3000`
  (or any free port) in `.env` and re-run.
- **Schema validation: missing table.**  Means Flyway didn't run. Confirm with
  `docker compose logs backend | grep -i flyway`. A `docker compose down -v`
  followed by `up` will rebuild from scratch.
