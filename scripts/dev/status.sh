#!/usr/bin/env bash
# =============================================================================
# scripts/dev/status.sh — Show running container status
# Usage: pnpm dev:status          — show container states
#        pnpm dev:status --stats  — also show live resource usage
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker
cd "$ROOT_DIR"

log_step "Container status"
docker compose ps

if [ "${1:-}" = "--stats" ]; then
  log_step "Resource usage (one snapshot)"
  docker stats --no-stream
fi
