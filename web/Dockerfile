# syntax=docker/dockerfile:1
# ─── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy package manifest first (layer caching)
COPY web/package.json ./

RUN pnpm install --no-frozen-lockfile

# Copy all source files
COPY web/ ./

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# In Docker, the browser talks to nginx on port 80; nginx routes /api → gateway.
# So the API base URL is simply /api (same origin, no CORS needed).
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm run build

# ─── Stage 2: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S lms && adduser -S lms -G lms

WORKDIR /app

# Standalone output already contains the minimal node_modules needed.
COPY --from=builder --chown=lms:lms /app/.next/standalone ./
COPY --from=builder --chown=lms:lms /app/.next/static     ./.next/static
COPY --from=builder --chown=lms:lms /app/public           ./public

USER lms

ENV PORT=3002
ENV HOSTNAME=0.0.0.0

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/ || exit 1

CMD ["node", "server.js"]
