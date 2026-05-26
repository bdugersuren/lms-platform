#!/usr/bin/env bash
# =============================================================================
# scripts/db/reset.sh — DESTRUCTIVE: drop and recreate all service databases
# Usage: pnpm db:reset
#        bash scripts/db/reset.sh
#
# Does NOT stop containers. Requires postgres container to be running.
# Automatically runs db:migrate and db:seed after recreating databases.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

# Confirm before doing anything — user can abort without Docker needing to be up
confirm_destructive "This will DROP and recreate all service databases — ALL data will be lost."

require_docker
load_env

PG_USER="${POSTGRES_USER:-lms}"

DATABASES=(
  auth_db
  user_db
  course_db
  enrollment_db
  quiz_db
  assignment_db
  wallet_db
  payment_db
  ai_db
  notification_db
  media_db
  certificate_db
  analytics_db
  coding_db
)

log_step "Dropping and recreating databases"

for db in "${DATABASES[@]}"; do
  log_info "Resetting $db..."
  # -T = no TTY allocation; required for non-interactive exec
  docker compose exec -T postgres psql -U "$PG_USER" -c \
    "DROP DATABASE IF EXISTS $db; CREATE DATABASE $db; GRANT ALL PRIVILEGES ON DATABASE $db TO $PG_USER;" \
    2>&1
  log_success "$db reset"
done

log_step "Running migrations"
bash "$SCRIPT_DIR/migrate.sh"

log_step "Running seeds"
bash "$SCRIPT_DIR/seed.sh"

log_success "Database reset complete."
