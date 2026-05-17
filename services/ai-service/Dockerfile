# syntax=docker/dockerfile:1.4
# =============================================================================
# ai-service — Port 3009 | @lms/ai-service
# IMPORTANT: All LLM inference MUST route through Ollama (http://ollama:11434).
#            Never call external inference APIs.
# Profile: ai  →  docker compose --profile ai up -d
#
# Stage graph:
#   base ──► deps ──► shared-build ──┬──► deploy   (pnpm deploy + prisma gen)
#                                    └──► svc-build (prisma gen + tsc)
#   runner ◄── /deploy/{node_modules,package.json}
#          ◄── /svc-build/services/ai-service/{dist,prisma}
# =============================================================================

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.15.9

FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate && \
    apk add --no-cache openssl curl

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json  packages/shared-types/
COPY packages/shared-utils/package.json  packages/shared-utils/
COPY packages/shared-auth/package.json   packages/shared-auth/
COPY packages/shared-config/package.json packages/shared-config/
COPY services/ai-service/package.json  services/ai-service/
COPY services/ai-service/prisma        services/ai-service/prisma/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

FROM deps AS shared-build
COPY packages/ packages/
RUN pnpm --filter @lms/shared-types  run build && \
    pnpm --filter @lms/shared-utils  run build && \
    pnpm --filter @lms/shared-auth   run build && \
    pnpm --filter @lms/shared-config run build

FROM shared-build AS deploy
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --filter @lms/ai-service --prod /deploy
RUN cd /deploy && node_modules/.bin/prisma generate

FROM shared-build AS svc-build
COPY services/ai-service/src                 services/ai-service/src/
COPY services/ai-service/tsconfig.json       services/ai-service/
COPY services/ai-service/tsconfig.build.json services/ai-service/
RUN pnpm --filter @lms/ai-service exec prisma generate && \
    pnpm --filter @lms/ai-service run build

FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl curl && \
    addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deploy    --chown=lms:lms /deploy/node_modules               ./node_modules
COPY --from=deploy    --chown=lms:lms /deploy/package.json               ./
COPY --from=svc-build --chown=lms:lms /app/services/ai-service/dist     ./dist
COPY --from=svc-build --chown=lms:lms /app/services/ai-service/prisma   ./prisma

USER lms
EXPOSE 3009

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3009/api/health || exit 1

CMD ["node", "dist/main.js"]
