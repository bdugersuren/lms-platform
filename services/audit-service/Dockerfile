# syntax=docker/dockerfile:1.4
# =============================================================================
# audit-service — Port 3015 | @lms/audit-service
#
# Stage graph:
#   base ──► deps ──► shared-build ──┬──► deploy   (pnpm deploy + prisma gen)
#                                    └──► svc-build (prisma gen + tsc)
#   runner ◄── /deploy/{node_modules,package.json}
#          ◄── /svc-build/services/audit-service/{dist,prisma}
# =============================================================================

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.15.9

# ── Base: pnpm + OpenSSL ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate && \
    apk add --no-cache openssl curl

# ── Deps: workspace manifests + install ───────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json  packages/shared-types/
COPY packages/shared-utils/package.json  packages/shared-utils/
COPY packages/shared-auth/package.json   packages/shared-auth/
COPY packages/shared-config/package.json packages/shared-config/
COPY services/audit-service/package.json  services/audit-service/
COPY services/audit-service/prisma        services/audit-service/prisma/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# ── Shared-build: compile workspace packages ──────────────────────────────────
FROM deps AS shared-build
COPY packages/ packages/
RUN pnpm --filter @lms/shared-types  run build && \
    pnpm --filter @lms/shared-utils  run build && \
    pnpm --filter @lms/shared-auth   run build && \
    pnpm --filter @lms/shared-config run build

# ── Deploy: production node_modules ──────────────────────────────────────────
FROM shared-build AS deploy
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --filter @lms/audit-service --prod /deploy
RUN cd /deploy && node_modules/.bin/prisma generate

# ── Svc-build: compile service TypeScript ─────────────────────────────────────
FROM shared-build AS svc-build
COPY services/audit-service/src               services/audit-service/src/
COPY services/audit-service/tsconfig.json     services/audit-service/
COPY services/audit-service/tsconfig.build.json services/audit-service/
RUN pnpm --filter @lms/audit-service exec prisma generate && \
    pnpm --filter @lms/audit-service run build

# ── Runner: minimal production image ─────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl curl && \
    addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deploy    --chown=lms:lms /deploy/node_modules                   ./node_modules
COPY --from=deploy    --chown=lms:lms /deploy/package.json                   ./
COPY --from=svc-build --chown=lms:lms /app/services/audit-service/dist      ./dist
COPY --from=svc-build --chown=lms:lms /app/services/audit-service/prisma    ./prisma

USER lms
EXPOSE 3015

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3015/api/health || exit 1

CMD ["node", "dist/main.js"]
