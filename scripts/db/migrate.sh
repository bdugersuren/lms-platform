#!/usr/bin/env bash
# =============================================================================
# scripts/db/migrate.sh — Run Prisma migrations for all services
# Usage: pnpm db:migrate
#        bash scripts/db/migrate.sh
#
# Fixes:
#   - user-service was missing from the original scripts/migrate.sh
#   - DATABASE_URL was not constructed correctly (sourcing prefixed vars)
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

# Ordered list — declare -A is unordered in bash, so keep the canonical order here
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
  "services/coding-service:coding_db"
)

FAILED=()

log_step "Running Prisma migrations"

for entry in "${SERVICES[@]}"; do
  svc_path="${entry%%:*}"
  db_name="${entry##*:}"
  svc_dir="$ROOT_DIR/$svc_path"

  if [ ! -d "$svc_dir/prisma" ]; then
    log_warn "$svc_path — no prisma/ directory, skipping"
    continue
  fi

  log_info "$svc_path → $db_name"

  db_url="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${db_name}"

  # Subshell scopes DATABASE_URL to this service — no cross-contamination
  if (
    export DATABASE_URL="$db_url"
    cd "$svc_dir"
    pnpm exec prisma migrate deploy 2>&1
  ); then
    log_success "$svc_path migrated"
  else
    log_error "$svc_path migration failed"
    FAILED+=("$svc_path")
  fi
done

log_step "Migration summary"

if [ ${#FAILED[@]} -eq 0 ]; then
  log_success "All migrations completed successfully."
else
  log_error "Failed services (${#FAILED[@]}):"
  for f in "${FAILED[@]}"; do
    log_error "  • $f"
  done
  exit 1
fi
