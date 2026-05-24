# syntax=docker/dockerfile:1.4
# =============================================================================
# web — Port 3002 | Next.js multi-tenant frontend (SSR / SSG)
#
# Stage graph:
#   base ──► deps  (pnpm install with cache mount)
#        ──► build (next build with standalone output)
#   runner ◄── .next/standalone  +  .next/static  +  public/
#
# Requires next.config.mjs:  output: 'standalone'
#
# Cache contract:
#   • Source-only change      → deps CACHED; build re-runs
#   • package.json change     → deps + build re-run
#   • NEXT_PUBLIC_API_URL arg → build re-runs (baked into bundle at build time)
# =============================================================================

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.15.9

# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ── Deps: install Next.js dependencies ───────────────────────────────────────
# web is a standalone package — not a workspace consumer — so no
# pnpm-workspace.yaml is needed here. pnpm treats it as a plain install.
FROM base AS deps
WORKDIR /app
COPY web/package.json ./

RUN --mount=type=cache,id=pnpm-store-web,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# ── Build: Next.js production build ──────────────────────────────────────────
# Inherits base (has pnpm) not deps (would carry stale layer ordering).
# node_modules brought in via explicit COPY for clean layer separation.
FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY web/package.json              ./

# Copy source last — most frequently changed.
COPY web/src     ./src
COPY web/public  ./public
COPY web/next.config.mjs           ./
COPY web/tailwind.config.ts        ./
COPY web/tsconfig.json             ./
COPY web/postcss.config.mjs        ./

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# The browser talks to nginx (port 80); nginx routes /api → gateway.
# Same-origin routing → no CORS, no absolute URL needed.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_DEV_TOOLS=false
ENV NEXT_PUBLIC_DEV_TOOLS=$NEXT_PUBLIC_DEV_TOOLS

RUN pnpm run build

# ── Runner: Next.js standalone server ────────────────────────────────────────
# The standalone output is self-contained — it includes its own minimal
# node server and only the node_modules it actually uses. No pnpm needed.
FROM node:${NODE_VERSION} AS runner
RUN addgroup -S lms && adduser -S lms -G lms
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=lms:lms /app/.next/standalone ./
COPY --from=build --chown=lms:lms /app/.next/static     ./.next/static
COPY --from=build --chown=lms:lms /app/public           ./public

USER lms
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/ || exit 1

CMD ["node", "server.js"]
