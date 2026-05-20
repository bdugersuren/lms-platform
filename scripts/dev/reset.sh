#!/usr/bin/env bash
# =============================================================================
# scripts/dev/reset.sh — DESTRUCTIVE: remove all containers and volumes
# Usage: pnpm dev:reset
#        bash scripts/dev/reset.sh
#
# This destroys ALL database data. Run db:migrate + db:seed afterward.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

confirm_destructive "This will remove ALL containers and volumes — ALL database data will be lost."

require_docker

log_step "Tearing down all containers and volumes"
cd "$ROOT_DIR"
compose_down -v

log_step "Starting infrastructure"
docker compose up -d

log_success "Containers and volumes removed. Infrastructure restarted."
printf "\n"
log_warn "Database data is gone. Run these next:"
log_info "  pnpm db:migrate"
log_info "  pnpm db:seed"
