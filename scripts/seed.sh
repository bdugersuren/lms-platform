#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Seed Script
# Runs seed.ts for every service that has a Prisma schema.
# Intended for host execution against the PostgreSQL port exposed by Docker.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "⚠ pnpm not found on host; delegating to Docker seed runner."
  exec bash "$ROOT_DIR/scripts/docker-seed.sh"
fi

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-lms_secret_change_me}"
PG_HOST="${SEED_DATABASE_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"

declare -A SVC_DB=(
  ["services/auth-service"]="auth_db"
  ["services/course-service"]="course_db"
  ["services/enrollment-service"]="enrollment_db"
  ["services/quiz-service"]="quiz_db"
  ["services/assignment-service"]="assignment_db"
  ["services/wallet-service"]="wallet_db"
  ["services/payment-service"]="payment_db"
  ["services/ai-service"]="ai_db"
  ["services/notification-service"]="notification_db"
  ["services/media-service"]="media_db"
  ["services/certificate-service"]="certificate_db"
  ["services/analytics-service"]="analytics_db"
)

SERVICES=(
  "services/auth-service"
  "services/course-service"
  "services/enrollment-service"
  "services/quiz-service"
  "services/assignment-service"
  "services/wallet-service"
  "services/payment-service"
  "services/ai-service"
  "services/notification-service"
  "services/media-service"
  "services/certificate-service"
  "services/analytics-service"
)

SEEDED=0
FAILED=()

for SERVICE in "${SERVICES[@]}"; do
  PKG="$ROOT_DIR/$SERVICE/package.json"
  SCHEMA="$ROOT_DIR/$SERVICE/prisma/schema.prisma"
  SEED_FILE="$ROOT_DIR/$SERVICE/prisma/seed.ts"

  if [ ! -f "$PKG" ] || [ ! -f "$SCHEMA" ] || [ ! -f "$SEED_FILE" ]; then
    continue
  fi

  DB_NAME="${SVC_DB[$SERVICE]}"
  DB_URL="postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME"

  echo "▶ Seeding $SERVICE (db: $DB_NAME) ..."
  if (
    export DATABASE_URL="$DB_URL"
    cd "$ROOT_DIR/$SERVICE"
    pnpm exec prisma db push --schema prisma/schema.prisma
    pnpm exec ts-node prisma/seed.ts
  ); then
    echo "  ✓ $SERVICE"
    SEEDED=$((SEEDED + 1))
  else
    echo "  ✗ $SERVICE FAILED"
    FAILED+=("$SERVICE")
  fi
done

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "✗ Failed seeds:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "✓ Seeded $SEEDED service(s)."
