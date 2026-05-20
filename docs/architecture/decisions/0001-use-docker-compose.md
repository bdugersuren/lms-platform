# ADR-0001: Use Docker Compose for local and CI environments

- **Date:** 2025-05-19
- **Status:** Accepted
- **Deciders:** Platform team

---

## Context

The LMS platform is composed of roughly 15 services: an API gateway, 12+ domain
microservices, PostgreSQL (one database per service), Redis, RabbitMQ, MinIO,
and optional Ollama for local AI inference.

Every developer needs to run a representative subset of this stack locally to
work on any single service. Without orchestration, each developer would manage
container start order, network configuration, volume mounts, environment
variables, and health checks by hand. That is error-prone and impossible to
keep consistent across machines.

We evaluated our options at the beginning of the project, when:

- The team size was small (2–5 engineers).
- No production infrastructure existed yet.
- The primary goal was fast iteration, not production hardening.
- All developers run either macOS, Windows (WSL2), or Linux.

---

## Decision

We use **Docker Compose** (v2, with compose profiles) to orchestrate all
infrastructure for local development and CI.

Services are grouped into profiles (`core`, `learn`, `finance`, `ops`,
`frontend`, `ai`) so developers can start only the subset they need.

The platform is designed to be Kubernetes-ready in the future, but Docker Compose
remains the canonical local runtime. No service may assume it is running in
Kubernetes — all service configuration comes from environment variables.

---

## Consequences

+ Any developer can clone the repo and run `docker compose up -d` to get a
  working environment with no manual steps.
+ Profiles let a developer working on, say, the quiz service start only
  `core + learn` rather than all 15 services.
+ CI uses the same `docker-compose.yml` as local dev, eliminating
  "works on my machine" class failures.
+ The `docker-compose.yml` file is a living inventory of every service,
  its ports, its environment, and its dependencies — readable by anyone
  without running a command.
+ Health checks on every service prevent dependent containers from starting
  against an unready dependency.
− Local Docker Compose does not reproduce Kubernetes networking, rolling
  updates, horizontal scaling, or resource limits. Production behaviour
  must still be validated in a staging Kubernetes cluster.
− On machines with less than 16 GB RAM, running all profiles simultaneously
  is impractical. Profiles partially mitigate this but developers must choose
  which subset to run.
− Docker Compose does not manage secrets. Sensitive values go in `.env`
  files, which must be excluded from git and provisioned separately.

---

## Alternatives considered

### Option: Kubernetes locally (minikube / k3d / kind)

Rejected because: the operational overhead of running a local Kubernetes cluster
(cluster creation, image building, manifest authoring, RBAC) is disproportionate
for a team iterating on application logic. Boot times would increase from seconds
to minutes. We revisit this decision when the team scales beyond ~10 engineers
and a staging cluster becomes standard.

### Option: Raw `docker run` commands in a shell script

Rejected because: manual ordering, network creation, and volume management in a
shell script duplicates what Compose already handles declaratively. The result is
harder to read, harder to modify, and likely to diverge between team members.

### Option: Dev containers (VS Code / GitHub Codespaces)

Rejected because: while dev containers can wrap Docker Compose, the added layer
of complexity provides limited benefit for a team that already has consistent
local Docker environments. We may revisit for onboarding remote contributors.

---

## Links

- CLAUDE.md — Infrastructure section (Docker Compose, Kubernetes-ready requirement)
- Future ADR: Migration to Kubernetes (not yet written)
