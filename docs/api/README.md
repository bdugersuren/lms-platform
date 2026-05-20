# LMS Platform — API Reference

> **Base URL (local):** `http://localhost/api`
> **Swagger UI:** `http://localhost:300x/api/docs` on any running service *(development only)*
> **Content-Type:** `application/json` for all requests and responses

---

## Documents in this folder

| File | Owner | Description |
|---|---|---|
| [openapi.json](openapi.json) | Generated | OpenAPI 3.0 specification — import into Postman, generate SDKs, run contract tests |
| [reference.md](reference.md) | Generated | Full endpoint reference with code samples — rendered by widdershins from openapi.json |

Both files are generated from NestJS controller decorators and verified in CI.
Run `pnpm docs` to regenerate them locally after changing a controller or DTO.

---

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <accessToken>
```

Obtain a token from `POST /api/auth/login`.
Refresh an expired token via `POST /api/auth/refresh`.

---

## Adding a new service to the API docs

1. Add `@ApiTags`, `@ApiOperation`, `@ApiResponse`, and `@ApiProperty` decorators to the new service's controllers and DTOs.
2. Register the controller in `scripts/generate-openapi.js` (see the `OpenApiAuthModule` pattern there).
3. Run `pnpm docs` and commit the updated `openapi.json` and `reference.md`.
