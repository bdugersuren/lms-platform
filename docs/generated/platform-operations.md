# Platform Operations Guide

Reference for developer and CI/CD operations on the LMS platform.

---

## Quick Start

Get a working local backend from a fresh clone in five commands:

```bash
pnpm install
pnpm dev:infra        # start postgres, redis, rabbitmq, minio
pnpm db:migrate       # run Prisma migrations for all 13 services
pnpm db:seed          # load development seed data
pnpm dev:core         # start nginx, gateway, auth, user, course, enrollment
```

The API is available at `http://localhost:3000/api`.

---

## Profile Overview

| Profile | Services started | ~RAM | Command |
|---------|-----------------|------|---------|
| *(none)* | postgres, redis, rabbitmq, minio | 0.5 GB | `pnpm dev:infra` |
| `core` | + nginx, gateway, auth, user, course, enrollment | 1.5 GB | `pnpm dev:core` |
| `core` + `learn` | + quiz, assignment | 2.1 GB | `pnpm dev:full` (partial) |
| `core` + `finance` | + wallet, payment | 2.1 GB | `pnpm dev:full` (partial) |
| `core` + `ops` | + notification, media, certificate, analytics | 2.8 GB | `pnpm dev:full` (partial) |
| full (no AI) | all of the above | ~3.7 GB | `pnpm dev:full` |
| `core` + `ai` | + ollama, ai-service | ~8.5 GB | `pnpm dev:ai-stack` |

---

## All pnpm Commands

### Infrastructure & Docker

| Command | Description |
|---------|-------------|
| `pnpm dev:infra` | Start infrastructure only (postgres, redis, rabbitmq, minio) |
| `pnpm dev:core` | Start infrastructure + core backend services |
| `pnpm dev:full` | Start all services except AI/Ollama |
| `pnpm dev:ai-stack` | Start core + AI inference (ollama + ai-service) |
| `pnpm dev:stop` | Stop all containers (volumes preserved) |
| `pnpm dev:restart [target]` | Restart all (default), a profile name, or a single service |
| `pnpm dev:logs [service...]` | Tail logs for all containers or named services |
| `pnpm dev:status` | Show container states (`--stats` for resource usage) |
| `pnpm dev:reset` | **Destructive** — remove all containers and volumes |
| `pnpm docker:build` | Build all service images with BuildKit |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:migrate` | Run `prisma migrate deploy` for all 13 services |
| `pnpm db:seed` | Seed all services that have `prisma/seed.ts` |
| `pnpm db:reset` | **Destructive** — drop + recreate all databases, then migrate + seed |
| `pnpm migrate` | Legacy wrapper (missing user-service — prefer `db:migrate`) |
| `pnpm seed` | Legacy wrapper (missing user-service — prefer `db:seed`) |

### Documentation

| Command | Description |
|---------|-------------|
| `pnpm docs:all` | Run all four JS doc generators |
| `pnpm docs:check` | Run all three verifiers (services, compose, docs) |
| `pnpm docs:generate` | Generate architecture docs only |
| `pnpm docs:compose` | Generate compose docs only |
| `pnpm docs:openapi` | Generate OpenAPI spec only |
| `pnpm docs:markdown` | Generate API markdown reference only |
| `pnpm verify:services` | Verify config/services.yml matches docker-compose.yml |
| `pnpm verify:all` | Run services + compose verifiers |
| `pnpm verify:compose` | Verify docker-compose.yml structure |

### Per-service Dev Servers (NestJS nodemon)

| Command | Service |
|---------|---------|
| `pnpm dev:auth` | auth-service (port 3001) |
| `pnpm dev:user` | user-service (port 3014) |
| `pnpm dev:course` | course-service (port 3003) |
| `pnpm dev:enrollment` | enrollment-service (port 3004) |
| `pnpm dev:quiz` | quiz-service (port 3005) |
| `pnpm dev:assignment` | assignment-service (port 3006) |
| `pnpm dev:wallet` | wallet-service (port 3007) |
| `pnpm dev:payment` | payment-service (port 3008) |
| `pnpm dev:ai` | ai-service (port 3009) |
| `pnpm dev:notification` | notification-service (port 3010) |
| `pnpm dev:media` | media-service (port 3011) |
| `pnpm dev:certificate` | certificate-service (port 3012) |
| `pnpm dev:analytics` | analytics-service (port 3013) |

---

## Developer Onboarding Workflow

Fresh clone to working API:

1. `git clone <repo> && cd lms-platform`
2. `cp .env.example .env` — fill in JWT secrets
3. `pnpm install` — install all workspace dependencies
4. `pnpm dev:infra` — start postgres, redis, rabbitmq, minio
5. Wait ~15 seconds for postgres to finish initializing
6. `pnpm db:migrate` — create all schemas
7. `pnpm db:seed` — load development users and sample data
8. `pnpm dev:core` — start gateway and all core backend services
9. Visit `http://localhost:3000/api/health` to confirm the gateway is up
10. Swagger docs at `http://localhost:3001/api/docs` (auth), `http://localhost:3014/api/docs` (user)

Development seed credentials are in `config/services.yml` under `seed_credentials`.

---

## Startup Flows

### Incremental startup (recommended for day-to-day)

```bash
pnpm dev:infra        # infra first — fastest startup, keep running always
pnpm dev:core         # add core services when needed
```

### Add a domain layer

```bash
pnpm dev:restart learn        # stop all, restart core + learn
pnpm dev:restart finance      # stop all, restart core + finance
```

### Single-service hot reload

Start Docker containers for everything except the service you are actively developing, then run it locally:

```bash
pnpm dev:core                 # all services in containers
pnpm dev:auth                 # run auth-service locally with nodemon
```

---

## Recovery Workflows

### Crashed service

```bash
pnpm dev:restart auth-service   # restart one container
pnpm dev:logs auth-service      # check what went wrong
```

### Broken database (schema mismatch or failed migration)

```bash
pnpm db:migrate                 # re-run pending migrations
```

If migrations are in an unrecoverable state:

```bash
pnpm db:reset                   # drops + recreates all DBs, then migrates + seeds
```

### Nuclear reset (start completely fresh)

```bash
pnpm dev:reset                  # removes all containers and volumes
pnpm db:migrate
pnpm db:seed
pnpm dev:core
```

---

## CI/CD Integration

| CI step | Command |
|---------|---------|
| Install dependencies | `pnpm install --frozen-lockfile` |
| Type check | `pnpm build` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm test` |
| Start infra for integration tests | `pnpm dev:infra` |
| Run migrations | `pnpm db:migrate` |
| Seed test data | `pnpm db:seed` |
| Integration / e2e tests | `pnpm test:e2e` |
| Verify docs in sync | `pnpm docs:check` |
| Build images | `pnpm docker:build` |

---

## How to Add a New Service

1. Create `services/<name>/` with Dockerfile, package.json, tsconfig.json, .env.example, prisma/schema.prisma
2. Add the service to `docker-compose.yml` following the YAML anchor pattern (`x-nestjs-common`, `x-infra-depends`)
3. Add an entry to `config/services.yml` with all required fields
4. Add `<NAME>_PORT` and `<NAME>_DATABASE_URL` to `.env` and `.env.example`
5. Add `<name>_db` to `infra/postgres/init.sql`
6. Add the service path and database name to `scripts/db/migrate.sh` (SERVICES array)
7. Add the service path and database name to `scripts/db/seed.sh` (SERVICES array)
8. Add `<name>_db` to the DATABASES array in `scripts/db/reset.sh`
9. Add the service port to `config/services.yml` port allocation comment
10. Add the upstream URL to `gateway/src/proxy/services.config.ts`
11. Run `pnpm docs:all && pnpm docs:check` to regenerate and verify documentation
