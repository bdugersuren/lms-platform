#!/usr/bin/env bash
# =============================================================================
# scripts/verify/compose.sh — Verify docker-compose.yml structure
# Usage: pnpm verify:compose
#        bash scripts/verify/compose.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

find_node

log_info "Verifying docker-compose.yml..."
"$NODE_BIN" "$ROOT_DIR/scripts/verify-compose.js"
log_success "Compose verification passed."
