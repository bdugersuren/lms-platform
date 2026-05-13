# =============================================================================
# Auth Service — Multi-stage Dockerfile
# Stage 1: builder  — installs deps, generates Prisma client, compiles TS
# Stage 2: runner   — minimal production image
# =============================================================================

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace root manifests (better cache layering)
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

# Copy shared packages
COPY packages/shared-types    ./packages/shared-types
COPY packages/shared-utils    ./packages/shared-utils
COPY packages/shared-auth     ./packages/shared-auth
COPY packages/shared-config   ./packages/shared-config

# Copy service manifests + prisma schema
COPY services/auth-service/package.json  ./services/auth-service/package.json
COPY services/auth-service/prisma        ./services/auth-service/prisma

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Build shared packages
RUN pnpm --filter @lms/shared-types  run build
RUN pnpm --filter @lms/shared-utils  run build
RUN pnpm --filter @lms/shared-auth   run build
RUN pnpm --filter @lms/shared-config run build

# Generate Prisma client
RUN (cd services/auth-service && pnpm exec prisma generate)

# Copy source and build
COPY services/auth-service/tsconfig.json       ./services/auth-service/tsconfig.json
COPY services/auth-service/tsconfig.build.json ./services/auth-service/tsconfig.build.json
COPY services/auth-service/src                 ./services/auth-service/src
RUN pnpm --filter @lms/auth-service run build

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
COPY --from=builder /app/services/auth-service/package.json  ./services/auth-service/package.json
COPY --from=builder /app/services/auth-service/dist          ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/prisma        ./services/auth-service/prisma

# Reinstall production deps only
RUN pnpm install --prod --no-frozen-lockfile
RUN (cd services/auth-service && pnpm exec prisma generate)

RUN chown -R lms:lms /app
USER lms

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "services/auth-service/dist/main.js"]
