# syntax=docker/dockerfile:1.4
# =============================================================================
# gateway — Port 3000 | @lms/gateway
# Responsibilities: API aggregation, JWT validation, request forwarding,
#                   rate limiting.
#
# Stage graph:
#   base ──► deps ──► shared-build ──┬──► deploy   (pnpm deploy → /deploy)
#                                    └──► svc-build (tsc)
#   runner ◄── /deploy/{node_modules,package.json}
#          ◄── /svc-build/gateway/dist
#
# Cache contract:
#   • Source-only change  → deps/shared-build/deploy all CACHED; svc-build re-runs
#   • Shared pkg change   → shared-build/deploy/svc-build re-run; deps CACHED
#   • Dep change          → everything below deps re-runs
# =============================================================================

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.15.9

# ── Base: pnpm only — gateway has no Prisma so no openssl needed ──────────────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ── Deps: workspace manifests + full install ──────────────────────────────────
# ONLY package.json files here. No source code. Cache busts only when
# a dependency version changes, not when source files change.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json  packages/shared-types/
COPY packages/shared-utils/package.json  packages/shared-utils/
COPY packages/shared-auth/package.json   packages/shared-auth/
COPY packages/shared-config/package.json packages/shared-config/
COPY gateway/package.json                gateway/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# ── Shared-build: compile workspace packages ──────────────────────────────────
# Separated from svc-build so deploy can branch off here, independent of
# the gateway's own TypeScript compilation.
FROM deps AS shared-build
COPY packages/ packages/
RUN pnpm --filter @lms/shared-types  run build && \
    pnpm --filter @lms/shared-utils  run build && \
    pnpm --filter @lms/shared-auth   run build && \
    pnpm --filter @lms/shared-config run build

# ── Deploy: standalone production node_modules ───────────────────────────────
# Runs BEFORE gateway TypeScript compilation — this is the critical ordering.
# pnpm deploy produces /deploy with only prod deps, workspace packages bundled
# as real copies (no symlinks). dist/ is excluded because it is in .gitignore.
#
# Cache: this stage invalidates only when deps or shared package source change.
# A gateway source-only edit does NOT reach this stage.
FROM shared-build AS deploy
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --filter @lms/gateway --prod /deploy

# ── Svc-build: compile gateway TypeScript ─────────────────────────────────────
# Branches off shared-build independently of deploy. Invalidates on source
# changes; does not block or trigger the deploy stage.
FROM shared-build AS svc-build
COPY gateway/src                  gateway/src/
COPY gateway/tsconfig.json        gateway/
COPY gateway/tsconfig.build.json  gateway/
RUN pnpm --filter @lms/gateway run build

# ── Runner: minimal production image ─────────────────────────────────────────
# No pnpm, no corepack, no devDeps, no TypeScript source.
# wget is busybox built-in on alpine — available without extra packages.
FROM node:${NODE_VERSION} AS runner
RUN addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
ENV NODE_ENV=production

# Flat prod node_modules — no workspace symlinks, no src/ contamination.
COPY --from=deploy    --chown=lms:lms /deploy/node_modules ./node_modules
COPY --from=deploy    --chown=lms:lms /deploy/package.json ./
COPY --from=svc-build --chown=lms:lms /app/gateway/dist   ./dist

USER lms
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
