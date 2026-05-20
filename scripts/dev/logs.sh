#!/usr/bin/env bash
# =============================================================================
# scripts/dev/logs.sh — Tail container logs
# Usage: pnpm dev:logs                  — tail all running containers
#        pnpm dev:logs auth-service     — tail specific service
#        bash scripts/dev/logs.sh auth-service user-service
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker
cd "$ROOT_DIR"

if [ $# -eq 0 ]; then
  log_info "Tailing all container logs (Ctrl+C to stop)..."
  docker compose logs -f
else
  log_info "Tailing logs for: $* (Ctrl+C to stop)..."
  docker compose logs -f "$@"
fi
