# ADR-0003: Generate documentation from source and commit the output

- **Date:** 2025-05-19
- **Status:** Accepted
- **Deciders:** Platform team

---

## Context

Several documentation artefacts in this repository are derived, not authored:

| Generated file | Source |
|---|---|
| `docs/api/openapi.json` | NestJS controller decorators |
| `docs/api/README.md` | `openapi.json` via widdershins |
| `docs/generated/current-architecture.md` | `docker-compose.yml` + `config/system.yml` |

Derived files must be kept in sync with their sources. When they fall out of
sync — what we call **docs drift** — the documentation becomes a liability
rather than an asset. A developer who follows a stale API reference may
spend hours debugging a 404 or a schema mismatch that the accurate spec would
have prevented immediately.

We considered three strategies for managing derived files:

1. **Never commit them** — generate on demand, never store in git.
2. **Commit them, rely on developer discipline** — generate and commit, but
   trust developers to remember.
3. **Commit them, enforce freshness in CI** — generate, commit, and
   automatically fail PRs when the committed files are stale.

We needed to choose one.

---

## Decision

We **generate all derived documentation from source and commit the output**
to the repository.

Freshness is enforced automatically: every pull request runs
`scripts/verify-docs.js`, which re-generates all derived files and uses
`git diff` to check whether the committed versions are still current.
A PR that contains controller changes without updated generated docs fails CI.

This is implemented in `.github/workflows/verify-docs.yml`.

The verification works in two steps:

1. **Run the generator** — overwrites the committed file with a freshly
   generated version.
2. **Run `git diff --name-only HEAD -- <file>`** — if the output is non-empty,
   the committed version and the freshly generated version differ, so the
   committed version was stale.

An untracked file (one that was never committed) is caught by a separate check:
`git ls-files --others --exclude-standard -- <file>`.

---

## Consequences

+ **Browsable on GitHub without running anything** — `openapi.json` and
  `docs/api/README.md` render correctly in the GitHub UI. A new team member
  can read the API reference before cloning the repo.
+ **CI catches drift** — a developer who changes a controller without
  regenerating docs sees a CI failure on their PR, not a confused client
  team six weeks later.
+ **Diffs are informative** — a PR that adds a new endpoint shows the
  `openapi.json` diff alongside the controller diff. Reviewers can verify
  the spec matches the implementation without running the service.
+ **Importable without a running server** — tools like Postman, Insomnia, and
  API gateway configurations can import the committed `openapi.json` without
  anyone needing to start the service first.
− Generated files add noise to PRs. A large DTO refactor may produce hundreds
  of changed lines in `openapi.json` and `docs/api/README.md` that reviewers
  must scroll past.
− Developers who forget to run `pnpm docs` before pushing will see a CI
  failure. This is intentional, but it adds a step to the contribution
  workflow that must be documented clearly.
− If two branches modify the same source and both update generated files,
  merging them produces a conflict in the generated file. The resolution is
  always: re-run `pnpm docs` after merging and commit the result.

---

## Alternatives considered

### Option: Never commit generated files (.gitignore them)

Rejected because: the generated files become invisible on GitHub and in code
review. Consumers of `openapi.json` (client teams, SDK generators, API gateway
configs) would need to run the generator locally before they could use the
spec. This creates a dependency on a running development environment and makes
the spec unavailable in CI pipelines that do not install the full stack.

### Option: Commit generated files but rely on developer discipline

Rejected because: discipline degrades under deadline pressure. In a growing
team, not every developer will know which commands to run or when. The drift
would accumulate silently until a client integration breaks. Automated
enforcement costs one CI step and eliminates the entire class of "forgot to
regenerate" errors.

### Option: Generate only in CI, publish to a separate docs site

Rejected because: it requires external infrastructure (a docs hosting service,
a deployment pipeline for docs), it separates the docs from the code review
process, and it makes the current spec invisible in the PR diff. The
complexity is not justified at this stage of the project.

---

## Links

- [scripts/verify-docs.js](../../../scripts/verify-docs.js)
- [.github/workflows/verify-docs.yml](../../../.github/workflows/verify-docs.yml)
- [ADR-0002](0002-use-openapi-for-api-contracts.md) — why we use OpenAPI
