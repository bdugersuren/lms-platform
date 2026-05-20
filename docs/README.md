# LMS Platform — Documentation

This folder is the documentation root. Use the table below to find what you need.

## Map

| Folder / File | Who writes it | What it contains |
|---|---|---|
| [api/README.md](api/README.md) | Human | API entry point: base URL, auth, how to add a service |
| [api/openapi.json](api/openapi.json) | **Generated** | Machine-readable OpenAPI 3.0 spec — import into Postman, generate SDKs |
| [api/reference.md](api/reference.md) | **Generated** | Full endpoint reference with code samples |
| [architecture/README.md](architecture/README.md) | Human | Architecture narrative, design principles, service overview |
| [architecture/decisions/](architecture/decisions/) | Human | Architecture Decision Records — why the system is built the way it is |
| [generated/current-architecture.md](generated/current-architecture.md) | **Generated** | Service inventory, ports, profiles, dependencies from docker-compose.yml |
| [developer-guide/README.md](developer-guide/README.md) | Human | Setup, daily workflow, adding services, coding standards, troubleshooting |
| [developer-guide/instructions.md](developer-guide/instructions.md) | Human | Server installation guide (Mongolian) |
| [developer-guide/WSL2-OPTIMIZATION.md](developer-guide/WSL2-OPTIMIZATION.md) | Human | Windows WSL2 performance tips |
| [admin-guide/README.md](admin-guide/README.md) | Human | Platform administration guide |
| [teacher-guide/README.md](teacher-guide/README.md) | Human | Instructor workflow guide |
| [user-guide/README.md](user-guide/README.md) | Human | Student user guide |
| [roadmap/README.md](roadmap/need.md) | Human | Platform needs, improvement priorities |
| [roadmap/analysis.md](roadmap/analysis.md) | Human | Detailed gap analysis and improvement backlog |

## The two kinds of documentation

**Human-written** files contain narrative, decisions, guides, and context that cannot be derived from source code. Edit them directly.

**Generated** files are produced by scripts from source code (controllers, docker-compose.yml, config/system.yml). Do not edit them by hand — your changes will be overwritten and CI will fail.

## Regenerating all generated docs

```bash
pnpm docs          # generate everything
pnpm docs:verify   # check that committed files match source
```

Individual generators:

```bash
pnpm docs:arch     # docs/generated/current-architecture.md
pnpm docs:openapi  # docs/api/openapi.json
pnpm docs:markdown # docs/api/reference.md
```

## Source of truth for generated content

| Generated file | Source of truth |
|---|---|
| `docs/generated/current-architecture.md` | `docker-compose.yml` + `config/system.yml` |
| `docs/api/openapi.json` | NestJS controller + DTO decorators |
| `docs/api/reference.md` | `docs/api/openapi.json` |

When these sources change, regenerate and commit the output. CI enforces this automatically on every pull request.
