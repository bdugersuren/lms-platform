# ADR-0002: Use OpenAPI 3.0 (generated from NestJS) as the API contract

- **Date:** 2025-05-19
- **Status:** Accepted
- **Deciders:** Platform team

---

## Context

The platform exposes HTTP APIs consumed by at least three different clients:

1. **Next.js web app** — server-side and browser JavaScript
2. **Flutter mobile app** — Dart, entirely separate type system
3. **Future third-party integrations** — unknown languages, built by external teams

Without a machine-readable contract:

- Each client team has to read the server code or hand-maintained prose docs to
  understand how to call an endpoint.
- When an endpoint changes, every client team must be notified manually.
- There is no way to verify that a client call and a server implementation agree
  on field names, types, required fields, and error codes.
- Testing requires either a running server or manually constructed mocks that
  can drift from reality.

We also needed the contract to stay accurate as the codebase evolves.
A separately maintained contract document (a YAML file edited by hand) would
require discipline to keep in sync — discipline that tends to erode under
delivery pressure.

---

## Decision

We use **OpenAPI 3.0** as the canonical description of every HTTP endpoint
exposed by the platform.

The spec is **generated automatically** from NestJS controller code using
`@nestjs/swagger`. Decorators (`@ApiOperation`, `@ApiBody`, `@ApiResponse`,
`@ApiProperty`, `@ApiBearerAuth`, etc.) annotate controllers and DTOs.
`SwaggerModule.createDocument()` reads those decorators at build time and
produces `docs/api/openapi.json`.

`docs/api/openapi.json` is committed to the repository and verified in CI
(see ADR-0003). It is the single source of truth for API consumers.

Swagger UI is mounted at `/docs` in development mode so developers can
explore and test endpoints interactively without a separate tool.

---

## Consequences

+ **Client SDK generation** — any client (Dart, TypeScript, Python, …) can
  generate a typed SDK from `openapi.json` using tools like
  `openapi-generator-cli` or `swagger-typescript-api`. No manual wrapping.
+ **Interactive docs** — Swagger UI provides a built-in test console that
  works without Postman or curl knowledge. Useful for onboarding and QA.
+ **Contract testing** — the committed spec can be used to drive
  contract tests that verify the server still honours the spec after changes.
+ **Single source of truth** — the spec lives next to the code that implements
  it. Changing a DTO without updating its `@ApiProperty` decorators is
  immediately visible in the generated diff.
+ **Portability** — `openapi.json` can be imported into Postman, Insomnia,
  Stoplight, and API gateways (AWS API Gateway, Kong, …) without conversion.
− `@nestjs/swagger` decorators add boilerplate to every DTO field. A DTO
  that would otherwise be 10 lines becomes 30 lines when fully annotated.
  This is unavoidable with the code-first approach.
− Complex polymorphic schemas (`oneOf`, `anyOf`, discriminators) are awkward
  to express via decorators. These cases require manual `@ApiExtraModels` and
  `@ApiBody({ schema: { ... } })` overrides.
− The generated spec reflects only what the NestJS decorator system can
  express. Side-effects, event emissions, and asynchronous behaviour (e.g.
  RabbitMQ messages triggered by an endpoint) are invisible in OpenAPI.

---

## Alternatives considered

### Option: GraphQL

Rejected because: our data model is resource-centric and REST maps to it
naturally. GraphQL's main strength (flexible queries over a graph) is not
a current requirement. The Flutter mobile client has mature REST support but
limited production-grade GraphQL tooling at the time of this decision.
We may revisit for the AI service if it develops a complex query API.

### Option: gRPC / Protocol Buffers for all services

Rejected because: browser clients cannot call gRPC directly without a
gRPC-Web proxy. Adding a translation layer (Envoy or similar) increases
infrastructure complexity beyond what is justified at this stage.
gRPC is kept as a candidate for internal service-to-service communication
where performance demands it.

### Option: Hand-maintained OpenAPI YAML

Rejected because: hand-maintained specs drift from implementation. The generate-
from-code approach makes the spec incorrect-at-compile-time rather than
incorrect-at-runtime. Drift that would be discovered by a surprised client is
instead discovered by a failing CI step.

### Option: No formal contract (prose documentation only)

Rejected because: prose cannot be validated, versioned, or used to generate
client code. Onboarding a new client team with prose docs is slow and error-prone.

---

## Links

- [scripts/generate-openapi.js](../../../scripts/generate-openapi.js)
- [docs/api/openapi.json](../../api/openapi.json)
- [ADR-0003](0003-generate-and-commit-docs.md) — why generated files are committed
