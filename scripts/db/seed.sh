#!/usr/bin/env bash
# =============================================================================
# scripts/db/seed.sh — Seed all services with development data
# Usage: pnpm db:seed
#        bash scripts/db/seed.sh
#
# Run db:migrate first. Services without prisma/seed.ts are skipped silently.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker
load_env

PG_USER="${POSTGRES_USER:-lms}"
PG_PASS="${POSTGRES_PASSWORD:-}"
PG_HOST="${SEED_DATABASE_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"

SERVICES=(
  "services/auth-service:auth_db"
  "services/user-service:user_db"
  "services/course-service:course_db"
  "services/enrollment-service:enrollment_db"
  "services/quiz-service:quiz_db"
  "services/assignment-service:assignment_db"
  "services/wallet-service:wallet_db"
  "services/payment-service:payment_db"
  "services/ai-service:ai_db"
  "services/notification-service:notification_db"
  "services/media-service:media_db"
  "services/certificate-service:certificate_db"
  "services/analytics-service:analytics_db"
)

FAILED=()

log_step "Seeding databases"

for entry in "${SERVICES[@]}"; do
  svc_path="${entry%%:*}"
  db_name="${entry##*:}"
  svc_dir="$ROOT_DIR/$svc_path"

  if [ ! -f "$svc_dir/prisma/seed.ts" ]; then
    log_warn "$svc_path — no prisma/seed.ts, skipping"
    continue
  fi

  log_info "$svc_path → $db_name"

  db_url="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${db_name}"

  if (
    export DATABASE_URL="$db_url"
    cd "$svc_dir"
    pnpm exec ts-node prisma/seed.ts 2>&1
  ); then
    log_success "$svc_path seeded"
  else
    log_error "$svc_path seed failed"
    FAILED+=("$svc_path")
  fi
done

log_step "Seed summary"

if [ ${#FAILED[@]} -eq 0 ]; then
  log_success "All seeds completed successfully."
else
  log_error "Failed services (${#FAILED[@]}):"
  for f in "${FAILED[@]}"; do
    log_error "  • $f"
  done
  exit 1
fi
