<!--
Do not hand-edit files in this folder.
Update config/services.yml or docker-compose.yml, then run: pnpm docs:generate
-->

# Generated Documentation

Files in this folder are produced by scripts and committed to the repository.
**Do not edit them by hand.** Edit the source and regenerate.

## Generated files

| File | Generator script | Source files |
|---|---|---|
| [current-architecture.md](current-architecture.md) | `scripts/generate-docs.js` | `config/services.yml`, `docker-compose.yml` |
| [docker-architecture.md](docker-architecture.md) | `scripts/generate-compose-docs.js` | `docker-compose.yml`, `config/services.yml` |

## API documentation (generated, lives in docs/api/)

| File | Generator script | Source files |
|---|---|---|
| [docs/api/openapi.json](../api/openapi.json) | `scripts/generate-openapi.js` | NestJS controllers + DTOs |
| [docs/api/reference.md](../api/reference.md) | `scripts/generate-api-markdown.js` | `docs/api/openapi.json` via widdershins |

## Regenerating

```bash
pnpm docs:generate         # service registry docs (config/services.yml → current-architecture.md)
pnpm docs:compose          # compose convention docs (docker-compose.yml → docker-architecture.md)
pnpm docs                  # regenerate everything
pnpm verify:compose        # validate compose conventions (ports, healthchecks, naming)
pnpm docs:verify:services  # validate services.yml ↔ docker-compose.yml
pnpm docs:verify           # services check + docs drift check
```

---

## How the metadata system works

### Single source of truth: `config/services.yml`

Every service has one authoritative definition in `config/services.yml`. This file records:

- The service name (which also becomes its Docker DNS hostname)
- The container name (`lms-{name}`)
- The internal port
- The compose profile it belongs to
- Its database name
- Its environment variable prefix
- Which upstream services it calls via REST (`upstream`)
- A human-readable description

`docker-compose.yml` remains the **runtime source of truth** — it controls what actually starts and how. `config/services.yml` is the **documentation source of truth** — it is what scripts read to understand the platform topology.

The two files are kept in sync by `scripts/verify-services.js`.

### Metadata-driven documentation

`scripts/generate-docs.js` reads both `config/services.yml` and `docker-compose.yml`, merges them, and writes `docs/generated/current-architecture.md`. The merge works like this:

- Runtime facts (ports, dependencies, profiles, environment variables) come from `docker-compose.yml`.
- Human-readable metadata (descriptions, kind, database name) comes from `config/services.yml`.
- Services marked `status: reserved` in `config/services.yml` but not yet in `docker-compose.yml` are shown in the service matrix with a note.

### Reserved services

When a new service is designed but not yet deployed, add it to `config/services.yml` with `status: reserved`. This:

- Reserves its port so nothing else takes it.
- Documents the intended metadata before implementation starts.
- Keeps the verify script from flagging it as a mismatch.

`user-service` is the current example: planned for port `3014` (moved from `3002` which conflicts with the web frontend).

### Verify: two separate checks

| Script | What it checks |
|--------|---------------|
| `scripts/verify-services.js` | Semantic: does `services.yml` match `docker-compose.yml`? Port, profile, container name. |
| `scripts/verify-docs.js` | Drift: are the committed generated files still up to date? |

Both run under `pnpm docs:verify`. Both exit `1` on failure so they can block CI.

---

## Adding a new service

1. Add an entry to `config/services.yml` (set `status: reserved` if compose is not ready yet).
2. Run `pnpm docs:generate` and commit the updated `current-architecture.md`.
3. When the service is added to `docker-compose.yml`, remove `status: reserved`.
4. Run `pnpm docs:verify` to confirm everything is consistent.
