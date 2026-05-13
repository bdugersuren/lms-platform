# =============================================================================
# Gateway — Multi-stage Dockerfile
# Stage 1: builder  — installs deps and compiles TypeScript
# Stage 2: runner   — production image with minimal footprint
# =============================================================================

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy workspace root manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

# Copy shared packages
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/shared-auth  ./packages/shared-auth
COPY packages/shared-config ./packages/shared-config

# Copy gateway manifests
COPY gateway/package.json ./gateway/package.json

# Install all dependencies (including devDeps for build)
RUN pnpm install --no-frozen-lockfile

# Build shared packages
RUN pnpm --filter @lms/shared-types run build
RUN pnpm --filter @lms/shared-utils run build
RUN pnpm --filter @lms/shared-auth  run build
RUN pnpm --filter @lms/shared-config run build

# Copy gateway source and build
COPY gateway ./gateway
RUN pnpm --filter @lms/gateway run build

# ---------- Stage 2: runner ----------
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
RUN addgroup -S lms && adduser -S lms -G lms

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist         ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY --from=builder /app/packages/shared-utils/dist         ./packages/shared-utils/dist
COPY --from=builder /app/packages/shared-auth/package.json  ./packages/shared-auth/package.json
COPY --from=builder /app/packages/shared-auth/dist          ./packages/shared-auth/dist
COPY --from=builder /app/packages/shared-config/package.json ./packages/shared-config/package.json
COPY --from=builder /app/packages/shared-config/dist        ./packages/shared-config/dist
COPY --from=builder /app/gateway/package.json               ./gateway/package.json
COPY --from=builder /app/gateway/dist                       ./gateway/dist

RUN pnpm install --prod --no-frozen-lockfile
RUN chown -R lms:lms /app

USER lms

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "gateway/dist/main.js"]
