#!/usr/bin/env bash
# =============================================================================
# scripts/docs/verify.sh — Run all documentation verifiers
# Usage: pnpm docs:check
#        bash scripts/docs/verify.sh
#
# Runs all three verify scripts and reports total failures.
# All checks run even if one fails (does not short-circuit on first error).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

find_node

FAILURES=0

run_verifier() {
  local label="$1"
  local script="$2"
  log_info "Checking: $label..."
  if "$NODE_BIN" "$ROOT_DIR/scripts/$script" 2>&1; then
    log_success "$label OK"
  else
    log_error "$label FAILED"
    FAILURES=$(( FAILURES + 1 ))
  fi
}

log_step "Verifying documentation"

run_verifier "Service registry vs docker-compose" "verify-services.js"
run_verifier "Docker Compose structure"            "verify-compose.js"
run_verifier "Generated docs are up to date"      "verify-docs.js"

log_step "Verification summary"

if [ "$FAILURES" -eq 0 ]; then
  log_success "All checks passed."
else
  log_error "$FAILURES check(s) failed. Run 'pnpm docs:all' to regenerate docs."
  exit 1
fi
