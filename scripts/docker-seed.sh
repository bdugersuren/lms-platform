#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Seed Script
# Prisma schema бүхий сервис бүрийн seed.ts-г ажиллуулна.
#
# Хэрэглээ:
#   bash scripts/docker-seed.sh                   # бүх сервис seed хийх
#   bash scripts/docker-seed.sh auth-service       # зөвхөн нэг сервис
#   bash scripts/docker-seed.sh auth-service user-service  # хэд хэдэн сервис
#
# Урьдчилсан нөхцөл:
#   - docker compose up -d postgres
#   - bash scripts/docker-migrate.sh (эсвэл --deploy)
#
# Strategy (дараалал):
#   1. Local prisma binary  → хамгийн хурдан (node_modules байх ёстой)
#   2. docker compose exec  → ажиллаж байгаа container
#   3. docker compose run   → зогссон container
#
# Seed дараалал (хамааралтай тул дагаж мөрдөх):
#   auth → user → course → enrollment → quiz → assignment
#   → wallet → payment → certificate → notification → analytics → ai → media
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── .env шалгах ───────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "✗ .env файл олдсонгү��. Ажиллуулах: cp .env.example .env"
  exit 1
fi
set -a; source .env; set +a

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-lms_secret_change_me}"
PG_PORT="${POSTGRES_PORT:-5432}"

# ── PostgreSQL шалгах ───────────────────────────────────��─────────────────────
if ! docker compose exec postgres pg_isready -U "$PG_USER" -q 2>/dev/null; then
  echo "✗ PostgreSQL ажиллахгүй ��айна. Ажиллуулах: docker compose up -d postgres"
  exit 1
fi

# ── Сервис → database нэр ─────────────────────────────────────────────────────
declare -A SVC_DB=(
  ["auth-service"]="auth_db"
  ["user-service"]="user_db"
  ["course-service"]="course_db"
  ["enrollment-service"]="enrollment_db"
  ["quiz-service"]="quiz_db"
  ["assignment-service"]="assignment_db"
  ["wallet-service"]="wallet_db"
  ["payment-service"]="payment_db"
  ["certificate-service"]="certificate_db"
  ["notification-service"]="notification_db"
  ["analytics-service"]="analytics_db"
  ["audit-service"]="audit_db"
  ["ai-service"]="ai_db"
  ["media-service"]="media_db"
)

# Хамааралтай дараалал
ORDERED_SERVICES=(
  "auth-service"
  "user-service"
  "course-service"
  "enrollment-service"
  "quiz-service"
  "assignment-service"
  "wallet-service"
  "payment-service"
  "certificate-service"
  "notification-service"
  "analytics-service"
  "ai-service"
  "media-service"
)

SEEDED=0
FAILED=()

seed_service() {
  local SVC="$1"
  local WORKDIR="services/$SVC"
  local DB_NAME="${SVC_DB[$SVC]:-}"

  if [ -z "$DB_NAME" ]; then
    echo "  ! $SVC: database нэр олдсонгүй — алгасав"
    return
  fi

  if [ ! -f "$ROOT_DIR/$WORKDIR/prisma/schema.prisma" ] || \
     [ ! -f "$ROOT_DIR/$WORKDIR/prisma/seed.ts" ]; then
    return
  fi

  echo "▶ Seeding $SVC (db: $DB_NAME) ..."
  local RUN_OK=0

  # ── Strategy 1: local prisma binary ───────────────────────────────────���─────
  local LOCAL_PRISMA="$ROOT_DIR/$WORKDIR/node_modules/.bin/prisma"
  if [ -f "$LOCAL_PRISMA" ]; then
    local LOCAL_DB_URL="postgresql://$PG_USER:$PG_PASS@localhost:$PG_PORT/$DB_NAME"
    (
      cd "$ROOT_DIR/$WORKDIR"
      DATABASE_URL="$LOCAL_DB_URL" "$LOCAL_PRISMA" db seed 2>&1
    ) || RUN_OK=$?

    if [ "$RUN_OK" -eq 0 ]; then
      echo "  ✓ $SVC"
      SEEDED=$((SEEDED + 1))
      return
    fi

    echo "  ! local prisma амжилтгүй ($SVC, exit $RUN_OK) — container ашиглана ..."
    RUN_OK=0
  fi

  # ── Strategy 2/3: Docker container ──────────────────────────────────────────
  local DOCKER_DB_URL="postgresql://$PG_USER:$PG_PASS@postgres:$PG_PORT/$DB_NAME"
  local SEED_CMD="cd /app/$WORKDIR && npx prisma db seed"

  local IS_RUNNING
  IS_RUNNING=$(docker compose ps --status running --services 2>/dev/null | grep -x "$SVC" || true)

  if [ -n "$IS_RUNNING" ]; then
    docker compose exec -e DATABASE_URL="$DOCKER_DB_URL" "$SVC" sh -c "$SEED_CMD" 2>&1 || RUN_OK=$?
  else
    docker compose run --rm --no-deps -e DATABASE_URL="$DOCKER_DB_URL" "$SVC" sh -c "$SEED_CMD" 2>&1 || RUN_OK=$?
  fi

  if [ "$RUN_OK" -eq 0 ]; then
    echo "  ✓ $SVC"
    SEEDED=$((SEEDED + 1))
  else
    echo "  ✗ $SVC АМЖИЛТГҮЙ"
    FAILED+=("$SVC")
  fi
}

# ── Аль сервисүүдийг ажиллуулах шийдэх ───────────────────────────────────────
if [ "$#" -gt 0 ]; then
  # Тодорхой сервисүүд заасан үед — дараалал хадгалж тэдгээрийг шүүнэ
  TARGET_SVCS=("$@")
  for SVC in "${ORDERED_SERVICES[@]}"; do
    for TARGET in "${TARGET_SVCS[@]}"; do
      if [ "$SVC" = "$TARGET" ]; then
        seed_service "$SVC"
        break
      fi
    done
  done
else
  # Бүгдийг дарааллаар ажиллуулна
  for SVC in "${ORDERED_SERVICES[@]}"; do
    seed_service "$SVC"
  done
fi

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "✗ Амж��лтгүй болсон сервисүүд:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "✓ $SEEDED сервисийн seed дууслаа."
