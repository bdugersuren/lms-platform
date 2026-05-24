# LMS Platform — API Reference

> **Base URL (local):** `http://localhost/api`
> **Swagger UI (gateway):** `http://localhost:3000/docs` *(development only, disabled in production)*
> **Content-Type:** `application/json` for all requests and responses

---

## Documents in this folder

| File | Owner | Description |
|---|---|---|
| [openapi.json](openapi.json) | Generated | OpenAPI 3.0 specification — import into Postman, generate SDKs, run contract tests |
| [reference.md](reference.md) | Generated | Full endpoint reference with code samples — rendered by widdershins from openapi.json |

Both files are generated from **auth-service** NestJS controller decorators and verified in CI.
Run `pnpm docs` to regenerate them locally after changing a controller or DTO.

> **Scope:** `openapi.json` and `reference.md` cover **auth-service only** (`/api/auth/*` endpoints).
> This is intentional — `scripts/generate-openapi.js` imports only `AuthController` to keep
> generation fast (no DB / Redis / RabbitMQ connections needed). See "Adding a new service" below
> to extend coverage to other services.

---

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <accessToken>
```

Obtain a token from `POST /api/auth/login`.
Refresh an expired token via `POST /api/auth/refresh`.

---

## Per-service Swagger UIs (development only)

Each NestJS service exposes its own Swagger UI at `/api/docs` on its container port.
These are accessible **directly on the service port** (not through nginx/gateway), so the
host port must be published in docker-compose.

| Service | URL | Notes |
|---------|-----|-------|
| auth-service | `http://localhost:3001/api/docs` | covered by `openapi.json` |
| user-service | `http://localhost:3014/api/docs` | |
| tenant-service | `http://localhost:3016/api/docs` | |
| course-service | `http://localhost:3003/api/docs` | |
| enrollment-service | `http://localhost:3004/api/docs` | |
| quiz-service | `http://localhost:3005/api/docs` | `learn` profile |
| assignment-service | `http://localhost:3006/api/docs` | `learn` profile |
| wallet-service | `http://localhost:3007/api/docs` | `finance` profile |
| payment-service | `http://localhost:3008/api/docs` | `finance` profile |
| ai-service | `http://localhost:3009/api/docs` | `ai` profile |
| notification-service | `http://localhost:3010/api/docs` | `ops` profile |
| media-service | `http://localhost:3011/api/docs` | `ops` profile |
| certificate-service | `http://localhost:3012/api/docs` | `ops` profile |
| analytics-service | `http://localhost:3013/api/docs` | `ops` profile |
| audit-service | `http://localhost:3015/api/docs` | `ops` profile |

See [`docs/generated/current-architecture.md`](../generated/current-architecture.md) for the
compose profile matrix and full service inventory.

---

## Adding a new service to the API docs

1. Add `@ApiTags`, `@ApiOperation`, `@ApiResponse`, and `@ApiProperty` decorators to the new service's controllers and DTOs.
2. Register the controller in `scripts/generate-openapi.js` (see the `OpenApiAuthModule` pattern there).
3. Run `pnpm docs` and commit the updated `openapi.json` and `reference.md`.
