FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

COPY packages/shared-types    ./packages/shared-types
COPY packages/shared-utils    ./packages/shared-utils
COPY packages/shared-auth     ./packages/shared-auth
COPY packages/shared-config   ./packages/shared-config

COPY services/enrollment-service/package.json  ./services/enrollment-service/package.json
COPY services/enrollment-service/prisma        ./services/enrollment-service/prisma

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @lms/shared-types  run build
RUN pnpm --filter @lms/shared-utils  run build
RUN pnpm --filter @lms/shared-auth   run build
RUN pnpm --filter @lms/shared-config run build

RUN (cd services/enrollment-service && pnpm exec prisma generate)

COPY services/enrollment-service/tsconfig.json       ./services/enrollment-service/tsconfig.json
COPY services/enrollment-service/tsconfig.build.json ./services/enrollment-service/tsconfig.build.json
COPY services/enrollment-service/src                 ./services/enrollment-service/src

RUN pnpm --filter @lms/enrollment-service run build

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
COPY --from=builder /app/services/enrollment-service/package.json  ./services/enrollment-service/package.json
COPY --from=builder /app/services/enrollment-service/dist          ./services/enrollment-service/dist
COPY --from=builder /app/services/enrollment-service/prisma        ./services/enrollment-service/prisma

RUN pnpm install --prod --no-frozen-lockfile
RUN (cd services/enrollment-service && pnpm exec prisma generate)

RUN chown -R lms:lms /app
USER lms

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3004/api/health || exit 1

CMD ["node", "services/enrollment-service/dist/main.js"]
