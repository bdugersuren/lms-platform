#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Reset & Migration Script
# Бүх өгөгдлийг устгаад migration-уудыг дахин ажиллуулна.
# (prisma migrate reset --force --skip-seed)
#
# ⚠️  БҮРТГЭЛИЙН МЭДЭЭЛЭЛ УСТГАГДАНА — зөвхөн development орчинд ашиглах!
#
# Хэрэглээ:
#   bash scripts/docker-migrate.sh          # баталгаажуулалт асуух
#   bash scripts/docker-migrate.sh --force  # баталгаажуулалтгүй (CI/CD)
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
for arg in "$@"; do
  [ "$arg" = "--force" ] && FORCE=1
done

# ── .env шалгах ───────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "✗ .env файл олдсонгүй. Ажиллуулах: cp .env.example .env"
  exit 1
fi
set -a; source .env; set +a

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-lms_secret_change_me}"
PG_PORT="${POSTGRES_PORT:-5432}"

# ── PostgreSQL шалгах ─────────────────────────────────────────────────────────
if ! docker compose exec postgres pg_isready -U "$PG_USER" -q 2>/dev/null; then
  echo "✗ PostgreSQL ажиллахгүй байна. Ажиллуулах: docker compose up -d postgres"
  exit 1
fi

# ── Баталгаажуулалт ───────────────────────────────────────────────────────────
if [ "$FORCE" -eq 0 ]; then
  echo ""
  echo "  ⚠️  АНХААРУУЛГА: БҮРТГЭЛИЙН МЭДЭЭЛЭЛ УСТГАГДАНА (migrate reset --force)"
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

reset_migrate_service() {
  local SVC="$1"
  local WORKDIR="$2"
  local DB_NAME="$3"

  if [ ! -f "$ROOT_DIR/$WORKDIR/prisma/schema.prisma" ]; then
    return
  fi

  echo "▶ Resetting $SVC (db: $DB_NAME) ..."

  local RUN_OK=0

  # ── Strategy 1: local prisma binary ─────────────────────────────────────────
  local LOCAL_PRISMA="$ROOT_DIR/$WORKDIR/node_modules/.bin/prisma"
  if [ -f "$LOCAL_PRISMA" ]; then
    local LOCAL_DB_URL="postgresql://$PG_USER:$PG_PASS@localhost:$PG_PORT/$DB_NAME"
    DATABASE_URL="$LOCAL_DB_URL" "$LOCAL_PRISMA" migrate reset --force --skip-seed \
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
  local MIGRATE_CMD="cd /app/$WORKDIR && npx prisma migrate reset --force --skip-seed"

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

reset_migrate_service "auth-service"         "services/auth-service"         "auth_db"
reset_migrate_service "user-service"         "services/user-service"         "user_db"
reset_migrate_service "course-service"       "services/course-service"       "course_db"
reset_migrate_service "enrollment-service"   "services/enrollment-service"   "enrollment_db"
reset_migrate_service "quiz-service"         "services/quiz-service"         "quiz_db"
reset_migrate_service "assignment-service"   "services/assignment-service"   "assignment_db"
reset_migrate_service "wallet-service"       "services/wallet-service"       "wallet_db"
reset_migrate_service "payment-service"      "services/payment-service"      "payment_db"
reset_migrate_service "notification-service" "services/notification-service" "notification_db"
reset_migrate_service "certificate-service"  "services/certificate-service"  "certificate_db"
reset_migrate_service "analytics-service"    "services/analytics-service"    "analytics_db"
reset_migrate_service "ai-service"           "services/ai-service"           "ai_db"
reset_migrate_service "media-service"        "services/media-service"        "media_db"

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "✗ Амжилтгүй болсон сервисүүд:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "✓ $MIGRATED сервисийн reset & migration дууслаа."
echo ""
echo "  Seed data оруулах: bash scripts/docker-seed.sh"
