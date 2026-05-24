#!/usr/bin/env bash
# =============================================================================
# scripts/dev/start-core.sh — Start infrastructure + core backend services
# Usage: pnpm dev:core
#        bash scripts/dev/start-core.sh
#
# Starts: postgres, redis, rabbitmq, minio, nginx, gateway,
#         auth-service, user-service, tenant-service, course-service, enrollment-service
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

require_docker

log_step "Starting core stack"
cd "$ROOT_DIR"
compose_up --profile core

log_success "Core stack is up."
printf "\n"
log_info "API gateway:  http://localhost:3000/api"
log_info "Swagger UI:   http://localhost:3001/api/docs  (auth-service)"
log_info "              http://localhost:3014/api/docs  (user-service)"
log_info "              http://localhost:3016/api/docs  (tenant-service)"
