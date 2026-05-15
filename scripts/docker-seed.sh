#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Docker Seed Script
# Runs seed.ts for every service that has one, connecting to PostgreSQL
# via localhost (the exposed port 5432). Runs on the HOST machine.
#
# Requirements:
#   - docker compose up -d (postgres container must be running)
#   - node >= 20 and pnpm >= 9 installed on the host
#   - pnpm install already run (bootstrap)
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
PG_HOST="localhost"
PG_PORT="${POSTGRES_PORT:-5432}"

# ── Verify postgres is reachable ─────────────────────────────────────────────
if ! docker compose exec postgres pg_isready -U "$PG_USER" -q 2>/dev/null; then
  echo "✗ PostgreSQL is not reachable. Start it with: docker compose up -d postgres"
  exit 1
fi

# ── Service → database name mapping ─────────────────────────────────────────
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

SEEDED=0
FAILED=()

for SERVICE in \
  "services/auth-service" \
  "services/course-service" \
  "services/enrollment-service" \
  "services/quiz-service" \
  "services/assignment-service" \
  "services/wallet-service" \
  "services/payment-service" \
  "services/ai-service" \
  "services/notification-service" \
  "services/media-service" \
  "services/certificate-service" \
  "services/analytics-service"
do
  PKG="$ROOT_DIR/$SERVICE/package.json"
  SEED_FILE="$ROOT_DIR/$SERVICE/prisma/seed.ts"

  if [ ! -f "$SEED_FILE" ]; then
    continue
  fi

  if ! jq -e '.scripts.seed' "$PKG" > /dev/null 2>&1; then
    continue
  fi

  DB_NAME="${SVC_DB[$SERVICE]}"
  DB_URL="postgresql://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$DB_NAME"

  echo "▶ Seeding $SERVICE (db: $DB_NAME) ..."
  if (
    export DATABASE_URL="$DB_URL"
    cd "$ROOT_DIR/$SERVICE"
    pnpm run seed
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
