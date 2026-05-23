#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Docker Seed Script
# Runs seed.ts for every service that has a Prisma schema, using each service
# container's Node/pnpm toolchain and the Docker network PostgreSQL hostname.
#
# Requirements:
#   - docker compose up -d postgres
#   - service images built with docker compose build, or allowed to build on run
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "✗ .env file not found. Run: cp .env.example .env"
  exit 1
fi
set -a; source .env; set +a

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-lms_secret_change_me}"
PG_HOST="postgres"
PG_PORT="${POSTGRES_PORT:-5432}"

# ── Verify postgres is reachable ─────────────────────────────────────────────
if ! docker compose exec postgres pg_isready -U "$PG_USER" -q 2>/dev/null; then
  echo "✗ PostgreSQL is not reachable. Start it with: docker compose up -d postgres"
  exit 1
fi

# Service → database mapping (seed дарааллаар)
declare -A SVC_DB=(
  ["services/auth-service"]="auth_db"
  ["services/user-service"]="user_db"
  ["services/course-service"]="course_db"
  ["services/enrollment-service"]="enrollment_db"
  ["services/quiz-service"]="quiz_db"
  ["services/assignment-service"]="assignment_db"
  ["services/wallet-service"]="wallet_db"
  ["services/payment-service"]="payment_db"
  ["services/notification-service"]="notification_db"
  ["services/certificate-service"]="certificate_db"
  ["services/analytics-service"]="analytics_db"
  ["services/ai-service"]="ai_db"
  ["services/media-service"]="media_db"
)

SEEDED=0
FAILED=()

for SERVICE in \
  "services/auth-service" \
  "services/user-service" \
  "services/course-service" \
  "services/enrollment-service" \
  "services/quiz-service" \
  "services/assignment-service" \
  "services/wallet-service" \
  "services/payment-service" \
  "services/notification-service" \
  "services/certificate-service" \
  "services/analytics-service" \
  "services/ai-service" \
  "services/media-service"
do
  SCHEMA="$ROOT_DIR/$SERVICE/prisma/schema.prisma"
  SEED_FILE="$ROOT_DIR/$SERVICE/prisma/seed.ts"

  if [ ! -f "$SCHEMA" ] || [ ! -f "$SEED_FILE" ]; then
    continue
  fi

  DB_NAME="${SVC_DB[$SERVICE]}"
  DB_URL="postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME"
  SVC_NAME="${SERVICE#services/}"
  WORKDIR="/app/$SERVICE"
  SEED_CMD="cd $WORKDIR && pnpm exec ts-node prisma/seed.ts"

  echo "▶ Seeding $SERVICE (db: $DB_NAME) ..."
  RUN_OK=0
  if docker compose ps --status running --services 2>/dev/null | grep -qx "$SVC_NAME"; then
    docker compose exec -e DATABASE_URL="$DB_URL" "$SVC_NAME" sh -c "$SEED_CMD" || RUN_OK=$?
  else
    docker compose run --rm --no-deps -e DATABASE_URL="$DB_URL" "$SVC_NAME" sh -c "$SEED_CMD" || RUN_OK=$?
  fi

  if [ "$RUN_OK" -eq 0 ]; then
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
