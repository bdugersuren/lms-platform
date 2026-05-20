#!/usr/bin/env bash
# =============================================================================
# scripts/dev/start-full.sh — Start all non-AI domain services
# Usage: pnpm dev:full
#        bash scripts/dev/start-full.sh
#
# Starts: core + learn + finance + ops profiles (~3.7 GB RAM)
# Note: does NOT start AI/Ollama (use dev:ai-stack for that)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker

log_warn "Starting full stack — requires ~3.7 GB free RAM."
log_step "Starting full stack (core + learn + finance + ops)"
cd "$ROOT_DIR"
compose_up --profile core --profile learn --profile finance --profile ops

log_success "Full stack is up."
printf "\n"
log_info "API gateway: http://localhost:3000/api"
log_info "Run 'pnpm dev:logs' to tail all service logs."
