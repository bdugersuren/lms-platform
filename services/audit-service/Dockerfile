FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY services/audit-service/package.json ./services/audit-service/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY packages ./packages
COPY services/audit-service ./services/audit-service
COPY tsconfig.base.json ./
WORKDIR /app/services/audit-service
RUN pnpm prisma:generate && pnpm build

FROM base AS runner
WORKDIR /app/services/audit-service
COPY --from=builder /app/services/audit-service/dist ./dist
COPY --from=builder /app/services/audit-service/node_modules ./node_modules
COPY --from=builder /app/services/audit-service/prisma ./prisma
EXPOSE 3015
CMD ["node", "dist/main.js"]
