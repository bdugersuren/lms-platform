# syntax=docker/dockerfile:1.4
# =============================================================================
# media-service — Port 3011 | @lms/media-service
# Responsibilities: video uploads, transcoding, subtitles, MinIO management.
#
# Stage graph:
#   base ──► deps ──► shared-build ──┬──► deploy   (pnpm deploy + prisma gen)
#                                    └──► svc-build (prisma gen + tsc)
#   runner ◄── /deploy/{node_modules,package.json}
#          ◄── /svc-build/services/media-service/{dist,prisma}
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
COPY services/media-service/package.json  services/media-service/
COPY services/media-service/prisma        services/media-service/prisma/

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
    pnpm deploy --filter @lms/media-service --prod /deploy
RUN cd /deploy && node_modules/.bin/prisma generate

FROM shared-build AS svc-build
COPY services/media-service/src                 services/media-service/src/
COPY services/media-service/tsconfig.json       services/media-service/
COPY services/media-service/tsconfig.build.json services/media-service/
RUN pnpm --filter @lms/media-service exec prisma generate && \
    pnpm --filter @lms/media-service run build

FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl curl ffmpeg && \
    addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deploy    --chown=lms:lms /deploy/node_modules                  ./node_modules
COPY --from=deploy    --chown=lms:lms /deploy/package.json                  ./
COPY --from=svc-build --chown=lms:lms /app/services/media-service/dist     ./dist
COPY --from=svc-build --chown=lms:lms /app/services/media-service/prisma   ./prisma

USER lms
EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3011/api/health || exit 1

CMD ["node", "dist/main.js"]
