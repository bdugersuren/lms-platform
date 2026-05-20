# ADR-NNNN: Short title (imperative mood — "Use X", "Replace Y with Z", "Adopt X for Y")

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-XXXX](XXXX-title.md)
- **Deciders:** @handle1, @handle2 *(the people who made this call)*

---

## Context

<!--
Describe the situation that forced a decision.
Answer: What problem were we trying to solve?
        What constraints existed? (time, team size, existing stack, …)
        Why did the old approach stop working?

Write in past or present tense. Be factual. Avoid defending the decision here —
that belongs in the Decision section.

Good: "We have 12 services that each need to expose HTTP endpoints.
      Clients include a Next.js web app, a Flutter mobile app, and future
      third-party integrations. No single team member owns all services."

Bad: "We needed a great API solution so we picked OpenAPI."
-->

---

## Decision

<!--
State exactly what was decided.
One or two sentences max. Readers should be able to skim this section and
understand the choice without reading anything else.

Example: "We will use OpenAPI 3.0, generated automatically from NestJS
          @ApiOperation/@ApiProperty decorators via @nestjs/swagger, as the
          canonical description of every HTTP endpoint."
-->

---

## Consequences

<!--
List the real trade-offs — both positive and negative.
Do not only list positives. If you cannot think of a downside, you probably
have not thought hard enough.

Format as bullet points.

Positive consequences start with a "+".
Negative consequences (costs, risks, limitations) start with a "−".

Example:
+ Client teams can generate typed SDKs from the spec without manual effort.
+ Swagger UI provides a built-in test console during development.
− The spec only reflects what NestJS can express; some edge cases need manual annotation.
− @nestjs/swagger decorators add verbosity to controller code.
-->

---

## Alternatives considered

<!--
List every serious alternative you evaluated.
For each one: what it is, why it was rejected.
This section is critical — it prevents the team from revisiting already-closed
debates.

Format:

### Option: GraphQL
Rejected because: our primary client (Flutter mobile) has limited GraphQL
tooling support at the time of this decision, and REST fits our resource-centric
data model cleanly.

### Option: Hand-written OpenAPI YAML
Rejected because: hand-maintained specs drift from implementation. The
generate-from-code approach keeps spec and implementation in sync by definition.
-->

---

## Links

<!--
Optional. Link to relevant issues, PRs, Slack threads, or RFCs.
-->
