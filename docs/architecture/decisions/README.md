# Architecture Decision Records

## What is an ADR?

An **Architecture Decision Record** is a short document that answers one question:

> *Why did we build it this way?*

Every non-trivial technical choice leaves behind a question that future team members will ask.
"Why Docker Compose and not Kubernetes?"
"Why OpenAPI and not GraphQL?"
"Why generated docs and not a wiki?"

Without ADRs, the only way to answer those questions is to find the person who made the decision — if they are still on the team, and if they remember.
ADRs write the answer down once, in the same repo as the code.

---

## Why ADRs matter

### The problem they solve

Technical decisions look obvious when you make them.
Six months later, the context has faded.
A year later, a new developer joins and re-opens the same debate from scratch, not knowing the decision was already made and why.

This is called **context loss**.
ADRs prevent it.

### What they are not

ADRs are **not** design specs, RFCs, or long architecture documents.
They are short (~one page) records of a decision that was already made.
They describe the context that existed at the time, what was decided, and what the trade-offs are.

They are **not** meant to be perfect.
A rough ADR written in ten minutes is worth far more than a polished document that never gets written.

### Immutability — the most important rule

Once an ADR is accepted, **do not edit its content**.
If the decision changes, write a new ADR that supersedes the old one.
The old ADR stays in place so future readers can see the full history.

This is what makes ADRs trustworthy.
If you can silently edit the past, the records become unreliable.

---

## How teams use ADRs

| Stage | What happens |
|---|---|
| **Proposal** | Someone opens a PR with a new ADR in `Proposed` status |
| **Discussion** | The team reviews the context and trade-offs in the PR comments |
| **Decision** | Status changes to `Accepted` and the PR is merged |
| **Superseded** | If the decision changes later, a new ADR is created and the old one's status is updated to `Superseded by ADR-XXXX` |
| **Deprecated** | If a technology is removed without a replacement, status becomes `Deprecated` |

### Practical tips

- **Write while the context is fresh** — immediately after a decision is made, not three months later.
- **Link from code** — if a piece of code exists because of a specific ADR, add a comment: `# See ADR-0002`.
- **Keep them short** — Context, Decision, Consequences, and Alternatives. One page is enough.
- **Number them sequentially** — never reuse a number, even after a decision is superseded.

---

## ADR Index

| # | Title | Status |
|---|---|---|
| [ADR-0001](0001-use-docker-compose.md) | Use Docker Compose for local and CI environments | Accepted |
| [ADR-0002](0002-use-openapi-for-api-contracts.md) | Use OpenAPI 3.0 (generated from NestJS) as the API contract | Accepted |
| [ADR-0003](0003-generate-and-commit-docs.md) | Generate documentation from source and commit the output | Accepted |

---

## How to add a new ADR

1. Copy [template.md](template.md) into this folder.
2. Name it `NNNN-short-title-in-kebab-case.md` where `NNNN` is the next available number.
3. Fill in every section. Leave nothing blank — if you genuinely cannot fill a section, write "N/A" and a one-sentence reason.
4. Set the status to `Proposed`.
5. Open a pull request.
6. After team discussion and approval, change the status to `Accepted` and merge.
7. Add the entry to the index table above.
