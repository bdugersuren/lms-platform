#!/usr/bin/env bash
# =============================================================================
# scripts/dev/start-infra.sh — Start infrastructure services only
# Usage: pnpm dev:infra
#        bash scripts/dev/start-infra.sh
#
# Starts: postgres, redis, rabbitmq, minio (no --profile = infra only)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker

log_step "Starting infrastructure"
cd "$ROOT_DIR"
docker compose up -d

log_success "Infrastructure is up."
printf "\n"
log_info "RabbitMQ management: http://localhost:15672  (guest / guest)"
log_info "MinIO console:       http://localhost:9001"
log_info "PostgreSQL:          localhost:5432"
log_info "Redis:               localhost:6379"
