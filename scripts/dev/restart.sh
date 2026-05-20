#!/usr/bin/env bash
# =============================================================================
# scripts/dev/restart.sh — Restart containers (smart: profile or service)
# Usage: pnpm dev:restart              — stop all, start core
#        pnpm dev:restart core         — stop all, start core profile
#        pnpm dev:restart learn        — stop all, start core + learn
#        pnpm dev:restart auth-service — restart single service container
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker

TARGET="${1:-}"
cd "$ROOT_DIR"

if [ -z "$TARGET" ] || [ "$TARGET" = "core" ]; then
  log_step "Restarting core stack"
  compose_down
  compose_up --profile core
  log_success "Core stack restarted."

elif [ "$TARGET" = "learn" ]; then
  log_step "Restarting core + learn"
  compose_down
  compose_up --profile core --profile learn
  log_success "Learn stack restarted."

elif [ "$TARGET" = "finance" ]; then
  log_step "Restarting core + finance"
  compose_down
  compose_up --profile core --profile finance
  log_success "Finance stack restarted."

elif [ "$TARGET" = "ops" ]; then
  log_step "Restarting core + ops"
  compose_down
  compose_up --profile core --profile ops
  log_success "Ops stack restarted."

elif [ "$TARGET" = "ai" ]; then
  log_step "Restarting core + AI"
  compose_down
  compose_up --profile core --profile ai
  log_success "AI stack restarted."

else
  # Treat as a single service name
  log_step "Restarting service: $TARGET"
  docker compose restart "$TARGET"
  log_success "$TARGET restarted."
fi
