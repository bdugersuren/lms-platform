# syntax=docker/dockerfile:1.4
# =============================================================================
# auth-service — Port 3001 | @lms/auth-service
#
# Stage graph:
#   base ──► deps ──► shared-build ──┬──► deploy   (pnpm deploy + prisma gen)
#                                    └──► svc-build (prisma gen + tsc)
#   runner ◄── /deploy/{node_modules,package.json}
#          ◄── /svc-build/services/auth-service/{dist,prisma}
#
# Cache contract:
#   • Source-only change → deps/shared-build/deploy all CACHED; svc-build re-runs
#   • Shared pkg change  → shared-build/deploy/svc-build re-run; deps CACHED
#   • Dep change         → everything below deps re-runs
# =============================================================================

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.15.9

# ── Base: pnpm + OpenSSL (Prisma requires openssl at generate and runtime) ────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate && \
    apk add --no-cache openssl curl

# ── Deps: workspace manifests + install ───────────────────────────────────────
# Only package.json files — no source. Cache busts only on dep changes.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json  packages/shared-types/
COPY packages/shared-utils/package.json  packages/shared-utils/
COPY packages/shared-auth/package.json   packages/shared-auth/
COPY packages/shared-config/package.json packages/shared-config/
COPY services/auth-service/package.json  services/auth-service/
COPY services/auth-service/prisma        services/auth-service/prisma/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# ── Shared-build: compile workspace packages ──────────────────────────────────
FROM deps AS shared-build
COPY packages/ packages/
RUN pnpm --filter @lms/shared-types  run build && \
    pnpm --filter @lms/shared-utils  run build && \
    pnpm --filter @lms/shared-auth   run build && \
    pnpm --filter @lms/shared-config run build

# ── Deploy: production node_modules — runs BEFORE svc-build ──────────────────
# Branching here means source changes in svc-build do NOT invalidate this
# stage. pnpm deploy creates /deploy with flat node_modules (prod only,
# workspace packages bundled as real copies, dist/ excluded by .gitignore).
# Prisma client is then generated directly inside /deploy/node_modules.
FROM shared-build AS deploy
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --filter @lms/auth-service --prod /deploy
# Generate Prisma query-engine binary inside the deployed node_modules so the
# runner has the correct binary without needing to run prisma generate at startup.
RUN cd /deploy && node_modules/.bin/prisma generate

# ── Svc-build: compile service TypeScript ─────────────────────────────────────
# Branches off shared-build, independent of deploy. Prisma generate here
# produces the TypeScript types needed by tsc — it targets the workspace
# node_modules, not /deploy.
FROM shared-build AS svc-build
COPY services/auth-service/src               services/auth-service/src/
COPY services/auth-service/tsconfig.json     services/auth-service/
COPY services/auth-service/tsconfig.build.json services/auth-service/
RUN pnpm --filter @lms/auth-service exec prisma generate && \
    pnpm --filter @lms/auth-service run build

# ── Runner: minimal production image ─────────────────────────────────────────
# Fresh base — no pnpm, no corepack, no devDeps, no TypeScript source.
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl curl && \
    addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
ENV NODE_ENV=production

# Flat prod node_modules from pnpm deploy (generated Prisma client included).
COPY --from=deploy    --chown=lms:lms /deploy/node_modules                  ./node_modules
COPY --from=deploy    --chown=lms:lms /deploy/package.json                  ./
# Compiled JS and Prisma schema (for runtime migrations via prisma migrate deploy).
COPY --from=svc-build --chown=lms:lms /app/services/auth-service/dist      ./dist
COPY --from=svc-build --chown=lms:lms /app/services/auth-service/prisma    ./prisma

USER lms
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "dist/main.js"]
