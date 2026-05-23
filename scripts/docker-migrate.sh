#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Migration Script
#
# Горим 1 (default): migrate reset --force --skip-seed
#   Бүх өгөгдлийг устгаад бүх migration-уудыг эхнээс ажиллуулна.
#   ⚠️  БҮРТГЭЛИЙН МЭДЭЭЛЭЛ УСТГАГДАНА — зөвхөн development орчинд!
#
# Горим 2: --deploy
#   Шинэ (pending) migration-уудыг reset хийлгүй apply хийнэ.
#   Аюулгүй — production болон development дэх incremental update-д тохиромжтой.
#
# Хэрэглээ:
#   bash scripts/docker-migrate.sh                   # reset + migrate (баталгаа асуух)
#   bash scripts/docker-migrate.sh --force           # reset + migrate (баталгаагүй)
#   bash scripts/docker-migrate.sh --deploy          # зөвхөн pending migrations
#   bash scripts/docker-migrate.sh --deploy --force  # баталгаагүй deploy
#
# Strategy (дараалал):
#   1. Local prisma binary  → хамгийн хурдан (node_modules байх ёстой)
#   2. docker compose exec  → ажиллаж байгаа container
#   3. docker compose run   → зогссон container
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FORCE=0
DEPLOY=0
for arg in "$@"; do
  [ "$arg" = "--force" ]  && FORCE=1
  [ "$arg" = "--deploy" ] && DEPLOY=1
done

# ── .env шалгах ────────────────��──────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "✗ .env файл олдсонгүй. Ажиллуулах: cp .env.example .env"
  exit 1
fi
set -a; source .env; set +a

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-lms_secret_change_me}"
PG_PORT="${POSTGRES_PORT:-5432}"

# ── PostgreSQL шалгах ────────────────��────────────────────────────────────────
if ! docker compose exec postgres pg_isready -U "$PG_USER" -q 2>/dev/null; then
  echo "✗ PostgreSQL ажиллахгүй байна. Ажиллуулах: docker compose up -d postgres"
  exit 1
fi

# ── Баталгаажуулалт ───────────���────────────────────────────���──────────────────
if [ "$FORCE" -eq 0 ]; then
  echo ""
  if [ "$DEPLOY" -eq 1 ]; then
    echo "  ℹ️  Горим: migrate deploy — зөвхөн шинэ migration-уудыг apply хийнэ"
  else
    echo "  ⚠️  АНХААРУУЛГА: БҮРТГЭЛИЙН МЭДЭЭЛЭЛ УСТГАГДАНА (migrate reset --force)"
  fi
  echo "  Үргэлжлүүлэх үү? Тийм бол 'yes' бичнэ үү:"
  read -r CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "  Цуцаллаа."
    exit 0
  fi
  echo ""
fi

MIGRATED=0
FAILED=()

run_migration() {
  local SVC="$1"
  local WORKDIR="$2"
  local DB_NAME="$3"

  if [ ! -f "$ROOT_DIR/$WORKDIR/prisma/schema.prisma" ]; then
    return
  fi

  if [ "$DEPLOY" -eq 1 ]; then
    echo "▶ Deploy $SVC (db: $DB_NAME) ..."
    local PRISMA_CMD="migrate deploy"
  else
    echo "▶ Reset $SVC (db: $DB_NAME) ..."
    local PRISMA_CMD="migrate reset --force --skip-seed"
  fi

  local RUN_OK=0

  # ── Strategy 1: local prisma binary ────────────���────────────────────────────
  local LOCAL_PRISMA="$ROOT_DIR/$WORKDIR/node_modules/.bin/prisma"
  if [ -f "$LOCAL_PRISMA" ]; then
    local LOCAL_DB_URL="postgresql://$PG_USER:$PG_PASS@localhost:$PG_PORT/$DB_NAME"
    DATABASE_URL="$LOCAL_DB_URL" "$LOCAL_PRISMA" $PRISMA_CMD \
      --schema "$ROOT_DIR/$WORKDIR/prisma/schema.prisma" 2>&1 || RUN_OK=$?

    if [ "$RUN_OK" -eq 0 ]; then
      echo "  ✓ $SVC"
      MIGRATED=$((MIGRATED + 1))
      return
    fi

    echo "  ! local prisma амжилтгүй ($SVC, exit $RUN_OK) — container ашиглана ..."
    RUN_OK=0
  fi

  # ── Strategy 2/3: Docker container ──────────────────────────────────────────
  local DOCKER_DB_URL="postgresql://$PG_USER:$PG_PASS@postgres:$PG_PORT/$DB_NAME"
  local MIGRATE_CMD="cd /app/$WORKDIR && npx prisma $PRISMA_CMD"

  local IS_RUNNING
  IS_RUNNING=$(docker compose ps --status running --services 2>/dev/null | grep -x "$SVC" || true)

  if [ -n "$IS_RUNNING" ]; then
    docker compose exec -e DATABASE_URL="$DOCKER_DB_URL" "$SVC" sh -c "$MIGRATE_CMD" 2>&1 || RUN_OK=$?
  else
    docker compose run --rm --no-deps -e DATABASE_URL="$DOCKER_DB_URL" "$SVC" sh -c "$MIGRATE_CMD" 2>&1 || RUN_OK=$?
  fi

  if [ "$RUN_OK" -eq 0 ]; then
    echo "  ✓ $SVC"
    MIGRATED=$((MIGRATED + 1))
  else
    echo "  ✗ $SVC АМЖИЛТГҮЙ"
    FAILED+=("$SVC")
  fi
}

# Дараалал: хамааралтай сервисүүдийг нь өмнө нь ажиллуулна
run_migration "auth-service"         "services/auth-service"         "auth_db"
run_migration "user-service"         "services/user-service"         "user_db"
run_migration "course-service"       "services/course-service"       "course_db"
run_migration "enrollment-service"   "services/enrollment-service"   "enrollment_db"
run_migration "quiz-service"         "services/quiz-service"         "quiz_db"
run_migration "assignment-service"   "services/assignment-service"   "assignment_db"
run_migration "wallet-service"       "services/wallet-service"       "wallet_db"
run_migration "payment-service"      "services/payment-service"      "payment_db"
run_migration "certificate-service"  "services/certificate-service"  "certificate_db"
run_migration "notification-service" "services/notification-service" "notification_db"
run_migration "analytics-service"    "services/analytics-service"    "analytics_db"
run_migration "audit-service"        "services/audit-service"        "audit_db"
run_migration "ai-service"           "services/ai-service"           "ai_db"
run_migration "media-service"        "services/media-service"        "media_db"

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "✗ Амжилтгүй болсон сервисүүд:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

if [ "$DEPLOY" -eq 1 ]; then
  echo "✓ $MIGRATED сервисийн migration deploy дууслаа."
else
  echo "✓ $MIGRATED сервисийн reset & migration дууслаа."
  echo ""
  echo "  Seed data оруулах: bash scripts/docker-seed.sh"
fi
