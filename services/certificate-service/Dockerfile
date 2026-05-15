# =============================================================================
# Certificate Service — Multi-stage Dockerfile
# =============================================================================

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

COPY packages/shared-types    ./packages/shared-types
COPY packages/shared-utils    ./packages/shared-utils
COPY packages/shared-auth     ./packages/shared-auth
COPY packages/shared-config   ./packages/shared-config

COPY services/certificate-service/package.json  ./services/certificate-service/package.json
COPY services/certificate-service/prisma        ./services/certificate-service/prisma

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @lms/shared-types  run build
RUN pnpm --filter @lms/shared-utils  run build
RUN pnpm --filter @lms/shared-auth   run build
RUN pnpm --filter @lms/shared-config run build

RUN (cd services/certificate-service && pnpm exec prisma generate)

COPY services/certificate-service/tsconfig.json       ./services/certificate-service/tsconfig.json
COPY services/certificate-service/tsconfig.build.json ./services/certificate-service/tsconfig.build.json
COPY services/certificate-service/src                 ./services/certificate-service/src

RUN pnpm --filter @lms/certificate-service run build

# ---------- Stage 2: runner ----------
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
RUN apk add --no-cache openssl curl
RUN addgroup -S lms && adduser -S lms -G lms

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared-types/package.json  ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist          ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/package.json  ./packages/shared-utils/package.json
COPY --from=builder /app/packages/shared-utils/dist          ./packages/shared-utils/dist
COPY --from=builder /app/packages/shared-auth/package.json   ./packages/shared-auth/package.json
COPY --from=builder /app/packages/shared-auth/dist           ./packages/shared-auth/dist
COPY --from=builder /app/packages/shared-config/package.json ./packages/shared-config/package.json
COPY --from=builder /app/packages/shared-config/dist         ./packages/shared-config/dist
COPY --from=builder /app/services/certificate-service/package.json ./services/certificate-service/package.json
COPY --from=builder /app/services/certificate-service/dist         ./services/certificate-service/dist
COPY --from=builder /app/services/certificate-service/prisma       ./services/certificate-service/prisma

RUN pnpm install --prod --no-frozen-lockfile
RUN (cd services/certificate-service && pnpm exec prisma generate)

RUN chown -R lms:lms /app
USER lms

EXPOSE 3012

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3012/api/health || exit 1

CMD ["node", "services/certificate-service/dist/main.js"]
