#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Docker Migration Script
# Runs `prisma migrate deploy` for every service that has a schema.
# • Running container  → docker compose exec
# • Stopped container  → docker compose run --rm --no-deps
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load .env
if [ ! -f ".env" ]; then
  echo "✗ .env file not found. Run: cp .env.example .env"
  exit 1
fi
set -a; source .env; set +a

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-lms_secret_change_me}"
PG_HOST="postgres"
PG_PORT="${POSTGRES_PORT:-5432}"

# Verify postgres is reachable
if ! docker compose exec postgres pg_isready -U "$PG_USER" -q 2>/dev/null; then
  echo "✗ PostgreSQL is not reachable. Start it with: docker compose up -d postgres"
  exit 1
fi

FAILED=()

migrate_service() {
  local SVC="$1"
  local WORKDIR="$2"
  local DB_NAME="$3"

  # Skip if no schema
  if [ ! -f "$ROOT_DIR/$WORKDIR/prisma/schema.prisma" ]; then
    return
  fi

  local DB_URL="postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME"
  local MIGRATE_CMD="cd /app/$WORKDIR && npx prisma migrate deploy"

  echo "▶ Migrating $SVC ..."

  local IS_RUNNING
  IS_RUNNING=$(docker compose ps --status running --services 2>/dev/null | grep -x "$SVC" || true)

  local RUN_OK=0
  if [ -n "$IS_RUNNING" ]; then
    docker compose exec -e DATABASE_URL="$DB_URL" "$SVC" sh -c "$MIGRATE_CMD" || RUN_OK=$?
  else
    docker compose run --rm --no-deps -e DATABASE_URL="$DB_URL" "$SVC" sh -c "$MIGRATE_CMD" || RUN_OK=$?
  fi

  if [ "$RUN_OK" -eq 0 ]; then
    echo "  ✓ $SVC"
  else
    echo "  ✗ $SVC FAILED"
    FAILED+=("$SVC")
  fi
}

migrate_service "auth-service"         "services/auth-service"         "auth_db"
migrate_service "user-service"         "services/user-service"         "user_db"
migrate_service "course-service"       "services/course-service"       "course_db"
migrate_service "enrollment-service"   "services/enrollment-service"   "enrollment_db"
migrate_service "quiz-service"         "services/quiz-service"         "quiz_db"
migrate_service "assignment-service"   "services/assignment-service"   "assignment_db"
migrate_service "wallet-service"       "services/wallet-service"       "wallet_db"
migrate_service "payment-service"      "services/payment-service"      "payment_db"
migrate_service "ai-service"           "services/ai-service"           "ai_db"
migrate_service "notification-service" "services/notification-service" "notification_db"
migrate_service "media-service"        "services/media-service"        "media_db"
migrate_service "certificate-service"  "services/certificate-service"  "certificate_db"
migrate_service "analytics-service"    "services/analytics-service"    "analytics_db"

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "✗ Failed migrations:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "✓ All container migrations complete."
