# Engineering Roadmap

**Priority:** `High` = production blocker or data-loss risk · `Normal` = important, not blocking
**Status:** `DONE` shipped & verified · `IN PROGRESS` actively worked · `TODO` queued

Full per-section analysis: [`docs/roadmap/analysis.md`](analysis.md) — sections 1–15 map to ENG-001–ENG-015.

---

## Tracker

| ID | Topic | Priority | Status | Notes |
|---|---|---|---|---|
| ENG-001 | Service metadata centralization | Normal | DONE | `config/services.yml`, generated docs pipeline |
| ENG-002 | user-service: profile service | Normal | DONE | port 3014, `user_db`, auth.user.registered consumer |
| ENG-003 | Enrollment/progress single source of truth | Normal | DONE | enrollment-service sole owner, CUTOVER flag |
| ENG-004 | Event contracts + outbox pattern | Normal | DONE | `shared-types` EventTypes, outbox table per service |
| ENG-005 | Wallet top-up, QPay, payment hardening | High | TODO | WALLET_TOPUP purpose, mock endpoint guard |
| ENG-006 | Course → enrollment → certificate flow | High | TODO | completion event single emitter, recipient name |
| ENG-007 | Frontend UX: role navigation, learning journey | Normal | TODO | student dashboard, lesson player, certificate page |
| ENG-008 | Auth & security hardening | High | TODO | JWT secret validation, role guards, session limits |
| ENG-009 | Gateway: API versioning, route consistency | Normal | TODO | prefix audit, swagger aggregation |
| ENG-010 | Analytics, notification, audit logs | Normal | TODO | event consumers, admin dashboards |
| ENG-011 | Media, AI guardrails, quiz/assignment integration | Normal | TODO | Ollama model guard, adaptive quiz |
| ENG-012 | Multi-tenant data model | High | TODO | tenantId schema coverage across all services |
| ENG-013 | DevOps: Docker profiles, build reliability | Normal | DONE | `dev-usecase.sh`, mem_limit tuned, `health-check.sh` |
| ENG-014 | Testing strategy: unit, contract, E2E, smoke | Normal | DONE | 10 spec files + contract tests + smoke-test.sh |
| ENG-015 | Documentation cleanup | Normal | DONE | ports fixed, API README updated, tracker expanded |

---

## ENG-001 — Service metadata centralization

Analysis: `analysis.md` § 1

**Problem:** Service configuration was distributed across docker-compose, env files, and service code. Naming conventions existed implicitly but were not formally defined.

**Deliverables shipped:**
- `config/services.yml` — centralized service registry
- `docs/generated/current-architecture.md` — auto-generated from services.yml + docker-compose
- `scripts/generate-docs.js`, `verify-services.js`, `verify-docs.js`
- Service matrix documentation with port, profile, database, dependency graph

---

## ENG-002 — user-service

Analysis: `analysis.md` § 2

**Problem:** `user-service` was referenced in gateway routes and docs but did not exist. Certificate service fell back to `'Student'` for recipient name. Auth service had no profile data beyond email/role.

**Deliverables shipped:**
- `services/user-service/` — port 3014, `user_db`
- `UserProfile` schema (displayName, avatar, bio, locale, timezone)
- `auth.user.registered` consumer auto-creates profile
- REST endpoints: `GET /users/me`, `PATCH /users/me`, `GET /users/:id`
- Unit tests: `user.service.spec.ts`, `event-listener.service.spec.ts`

---

## ENG-003 — Enrollment/progress single source of truth

Analysis: `analysis.md` § 3

**Problem:** `course-service` and `enrollment-service` both had `CourseEnrollment` and `LessonProgress` models, causing potential divergence in progress state, certificate triggers, and revenue distribution.

**Deliverables shipped:**
- `enrollment-service` is the sole owner of enrollment and progress state
- `ENROLLMENT_CUTOVER_ENABLED` flag disables course-service writes
- Gateway smart routing added
- course-service enrollment endpoints marked deprecated

---

## ENG-004 — Event contracts + outbox pattern

Analysis: `analysis.md` § 4

**Problem:** Event names were scattered string literals across services. No outbox pattern meant events could be lost if RabbitMQ publish failed after DB commit.

**Deliverables shipped:**
- `packages/shared-types/src/events/event-types.ts` — `EventTypes` const object
- Typed payload interfaces per event in `packages/shared-types/src/events/payloads/`
- `outbox_events` table + `OutboxService` in: auth, enrollment, wallet, payment, certificate services
- Dead-letter queue config in `infra/rabbitmq/definitions.json`

---

## ENG-005 — Wallet top-up, QPay, payment hardening

Analysis: `analysis.md` § 5

**Problem:** No production wallet top-up flow. Payment ownership checks missing. Mock/dev endpoints exposed in production. Transaction type granularity insufficient.

**Key deliverables (TODO):**
- `PaymentPurpose` enum: `COURSE_PURCHASE` / `WALLET_TOPUP`
- `courseId` optional for top-up; `walletOwnerId` for credit target
- Frontend wallet page: preset amounts, QPay/SocialPay QR modal
- `payment.confirmed` → wallet credit when `purpose === WALLET_TOPUP`
- Mock endpoint guarded by `NODE_ENV !== 'production'`
- Granular `TransactionType`: `WALLET_TOPUP`, `COURSE_PURCHASE`, `REFUND`, `ADMIN_ADJUSTMENT`

---

## ENG-006 — Course → enrollment → certificate flow reliability

Analysis: `analysis.md` § 6

**Problem:** Certificate generation depends on `enrollment.completed` but the emitter was ambiguous when course-service also had enrollment logic. Recipient name falls back to `'Student'` when user-service is unavailable. No idempotency guard on `(userId, courseId)` certificate pair.

**Key deliverables (TODO):**
- Single completion event emitter: enrollment-service only
- `certificate.findFirst({ userId, courseId, status: ISSUED })` idempotency (partially done)
- Recipient name fetched from user-service profile at issue time
- Completion policy gates: `requireQuizPass`, `requireAssignmentPass`, `minimumScorePercent`

---

## ENG-007 — Frontend UX: role navigation, learning journey

Analysis: `analysis.md` § 7

**Problem:** Student dashboard lacks a lesson player, progress bar, and certificate download. Role-based navigation is inconsistent. No onboarding flow for new users.

**Key deliverables (TODO):**
- Student dashboard: enrolled courses with progress ring
- Lesson player: video + interactive blocks + quiz embed
- Certificate page with QR verification
- Instructor dashboard: course builder, submission grading
- Role-aware sidebar navigation
- Onboarding wizard (profile completion %)

---

## ENG-008 — Auth & security hardening

Analysis: `analysis.md` § 8

**Problem:** JWT secrets have no minimum entropy check at startup. Session concurrency limits not enforced. Role guard inconsistency across services (some use `RolesGuard`, some inline checks).

**Key deliverables (TODO):**
- `JWT_SECRET` / `JWT_REFRESH_SECRET` minimum 32-char validation in Joi schema (partially done)
- `@Roles()` + `RolesGuard` standardized from `shared-auth` across all services
- Max concurrent sessions per user (configurable, default 5)
- Refresh token family tracking to detect reuse attacks

---

## ENG-009 — Gateway: API versioning, route consistency

Analysis: `analysis.md` § 9

**Problem:** Service routes registered in gateway use inconsistent prefixes. No version prefix (`/v1/`) enforced. Swagger aggregation at gateway level covers auth only.

**Key deliverables (TODO):**
- Audit all proxy routes in `gateway/src/proxy/`
- Standardize prefix: `/api/{service}/{resource}`
- URI versioning: `/api/v1/auth/login`
- Gateway-level Swagger aggregation (merge per-service specs)

---

## ENG-010 — Analytics, notification, audit logs

Analysis: `analysis.md` § 10

**Problem:** `analytics-service` and `audit-service` exist but have minimal event consumers. Notification templates are hard-coded. No admin UI for viewing analytics or replaying failed events.

**Key deliverables (TODO):**
- Analytics consumers: `enrollment.completed`, `payment.confirmed`, `quiz.attempt.submitted`
- Notification templates for: enrollment confirmation, certificate issued, payment receipt
- Audit consumer for all admin actions
- Admin dashboard: KPI widgets, failed event replay

---

## ENG-011 — Media, AI guardrails, quiz/assignment integration

Analysis: `analysis.md` § 11

**Problem:** Media transcoding job status not surfaced to frontend. Ollama model not validated at startup. Quiz attempts not linked to enrollment progress gates.

**Key deliverables (TODO):**
- Media upload progress polling via `media.transcode.completed` event
- Ollama model health check at ai-service startup
- Quiz `passed` field consumed by enrollment completion calculator
- Assignment grade consumed by enrollment completion calculator

---

## ENG-012 — Multi-tenant data model

Analysis: `analysis.md` § 12

**Problem:** `tenantId` is present in auth/enrollment but missing or defaulted to `'demo'` in quiz, assignment, wallet, payment, media, notification schemas.

**Key deliverables (TODO):**
- Add `tenantId String @default("demo")` to all service schemas missing it
- Prisma migrations for each affected service
- Gateway header `x-tenant-id` forwarding verified end-to-end
- Tenant isolation tests

---

## ENG-013 — DevOps: Docker profiles, build reliability, resource limits

Analysis: `analysis.md` § 13

**Problem:** No use-case launcher script. BuildKit cache mounts inconsistent. Memory limits not set on most services causing OOM kills. No container health diagnostic tool.

**Deliverables shipped:**
- `scripts/dev-usecase.sh` — 5 use-case profiles (learner-core, paid-course, full-learning, etc.)
- `scripts/health-check.sh` — container health diagnostic with `--watch` mode
- `docker-compose.yml` memory limits tuned: NestJS services 256 MB, heavy services 384 MB
- `mem_reservation` added to all services

---

## ENG-014 — Testing strategy: unit, contract, E2E, smoke

Analysis: `analysis.md` § 14

**Problem:** Only 5 test files existed across 20+ services. No contract tests for event payloads. No E2E tests. No smoke test script.

**Deliverables shipped:**
- `scripts/smoke-test.sh` — curl-based health + auth flow validation
- Jest infrastructure added to: auth, enrollment, wallet, payment, certificate services
- Unit tests: `auth.service.spec.ts`, `token.service.spec.ts`, `wallet.service.spec.ts`, `payment.service.spec.ts`, `certificate.service.spec.ts`, `progress.service.spec.ts`
- Contract tests: `packages/shared-types/src/events/__tests__/payloads.contract.spec.ts`
- E2E tests: `auth-service/test/auth.e2e-spec.ts`, `enrollment-service/test/enrollment.e2e-spec.ts`

---

## ENG-015 — Documentation cleanup

Analysis: `analysis.md` § 15

**Problem:** `docs/developer-guide/README.md` had stale port numbers (3002/3004/3005 swapped, tenant-service and audit-service missing). `docs/api/README.md` claimed full service coverage but was auth-only. `docs/roadmap/need.md` tracked only 5 of 15 engineering items.

**Deliverables shipped:**
- `docs/developer-guide/README.md`: 16-service inventory table, corrected ports, ENV block, DB count 13→15, ASCII diagram
- `docs/api/README.md`: scope note (auth-only), per-service Swagger URL table, correct gateway Swagger URL
- `docs/roadmap/need.md`: expanded 5→15 rows, priority/status legend, prose blocks for all items
