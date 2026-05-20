#!/usr/bin/env bash
# =============================================================================
# scripts/verify/services.sh — Verify config/services.yml vs docker-compose.yml
# Usage: pnpm verify:services
#        bash scripts/verify/services.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

find_node

log_info "Verifying service registry..."
"$NODE_BIN" "$ROOT_DIR/scripts/verify-services.js"
log_success "Service registry verification passed."
