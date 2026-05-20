#!/usr/bin/env bash
# =============================================================================
# scripts/docs/generate.sh — Run all documentation generators
# Usage: pnpm docs:all
#        bash scripts/docs/generate.sh
#
# Wraps the four JS generators in scripts/:
#   generate-docs.js, generate-compose-docs.js,
#   generate-openapi.js, generate-api-markdown.js
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

find_node

FAILED=()

run_generator() {
  local label="$1"
  local script="$2"
  log_info "$label..."
  if "$NODE_BIN" "$ROOT_DIR/scripts/$script" 2>&1; then
    log_success "$label done"
  else
    log_error "$label failed"
    FAILED+=("$script")
  fi
}

log_step "Generating documentation"

run_generator "Architecture docs"      "generate-docs.js"
run_generator "Compose docs"           "generate-compose-docs.js"
run_generator "OpenAPI spec"           "generate-openapi.js"
run_generator "API markdown reference" "generate-api-markdown.js"

log_step "Generation summary"

if [ ${#FAILED[@]} -eq 0 ]; then
  log_success "All docs generated. See docs/generated/"
else
  log_error "Failed generators (${#FAILED[@]}):"
  for f in "${FAILED[@]}"; do
    log_error "  • $f"
  done
  exit 1
fi
