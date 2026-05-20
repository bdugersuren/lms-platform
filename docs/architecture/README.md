<!--
Purpose:
This is the human-written architecture entry point.
Keep explanations, diagrams, and architectural decisions here. Put generated inventories in docs/generated.
-->

# Architecture

This folder contains human-written architecture documentation.

Generated architecture summaries should not be edited here. They should be generated into `docs/generated` from real sources such as:

- `config/system.yml`
- Docker Compose configuration
- NestJS controllers
- OpenAPI output
- Prisma schemas

## Recommended Documentation Split

| Location | Owner | Purpose |
|---|---|---|
| `docs/architecture` | Humans | Architecture narrative, diagrams, decisions, tradeoffs |
| `docs/api` | Humans plus generated references | API usage guides and links to generated API references |
| `docs/roadmap` | Humans | Needs, plans, priorities, and implementation roadmap |
| `docs/generated` | Scripts | Generated service tables, ports, routes, schemas, and profile summaries |
| `config/system.yml` | Humans | Small source-of-truth config for generated documentation |
| `scripts` | Humans | Documentation generation scripts and maintenance commands |

## Starter Architecture Summary

The platform is a Docker Compose based LMS with:

- Next.js frontend
- NestJS API gateway
- NestJS backend services
- PostgreSQL databases per service
- RabbitMQ for asynchronous events
- Redis for cache/session support
- MinIO for media and certificate assets
- Optional Ollama-backed AI service

## Architecture Decision Records

Significant technical decisions are recorded in [`decisions/`](decisions/).
Each ADR explains the context, the choice made, its trade-offs, and the
alternatives that were considered and rejected.

| # | Decision | Status |
|---|---|---|
| [ADR-0001](decisions/0001-use-docker-compose.md) | Use Docker Compose for local and CI environments | Accepted |
| [ADR-0002](decisions/0002-use-openapi-for-api-contracts.md) | Use OpenAPI 3.0 as the API contract | Accepted |
| [ADR-0003](decisions/0003-generate-and-commit-docs.md) | Generate documentation from source and commit the output | Accepted |

See [decisions/README.md](decisions/README.md) for an explanation of the ADR format and how to add a new record.

---

## Documentation Rule

Do not copy service ports, seed users, or Docker profiles into many markdown files by hand.

Instead:

1. Update `config/system.yml`.
2. Regenerate files in `docs/generated`.
3. Link to generated files from human-written docs.
