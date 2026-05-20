#!/usr/bin/env bash
# =============================================================================
# scripts/dev/start-ai.sh — Start core + AI inference stack
# Usage: pnpm dev:ai-stack
#        bash scripts/dev/start-ai.sh
#
# Starts: core + ai profiles (ollama + ai-service, ~8.5 GB RAM with model loaded)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker

log_warn "Starting AI stack — Ollama requires ~8.5 GB RAM when a model is loaded."
log_step "Starting core + AI stack"
cd "$ROOT_DIR"
compose_up --profile core --profile ai

log_success "AI stack is up."
printf "\n"
log_info "Ollama API:  http://localhost:11434"
log_info "AI service:  http://localhost:3009/api"
log_info "Pull a model: docker exec lms-ollama ollama pull llama3.2"
