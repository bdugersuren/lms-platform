#!/usr/bin/env bash
# =============================================================================
# scripts/dev/stop.sh — Stop all running containers (volumes preserved)
# Usage: pnpm dev:stop
#        bash scripts/dev/stop.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker

log_step "Stopping all containers"
cd "$ROOT_DIR"
compose_down

log_success "All containers stopped. Volumes and data are preserved."
log_info "Run 'pnpm dev:core' or 'pnpm dev:infra' to restart."
