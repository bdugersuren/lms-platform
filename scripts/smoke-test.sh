#!/usr/bin/env bash
# =============================================================================
# scripts/smoke-test.sh — LMS stack smoke test
#
# Verifies that running containers are reachable and the core auth flow works.
# Requires the stack to already be running (docker compose ... up -d).
#
# Usage:
#   bash scripts/smoke-test.sh [BASE_URL]
#
# Default BASE_URL: http://localhost
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/common.sh
source scripts/lib/common.sh

BASE_URL="${1:-http://localhost}"
TIMEOUT=5
FAILED=0
PASSED=0

# ── Helpers ───────────────────────────────────────────────────────────────────

check_http() {
  local url="$1" label="$2"
  local status
  status=$(curl -o /dev/null -s -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [[ "$status" =~ ^2 ]]; then
    log_success "$label  ($status)"
    PASSED=$((PASSED + 1))
  else
    log_error  "$label  (HTTP $status)"
    FAILED=$((FAILED + 1))
  fi
}

check_auth_login() {
  local email="$1" password="$2" label="$3"
  local response token
  response=$(curl -s --max-time "$TIMEOUT" \
    -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" 2>/dev/null || echo '{}')
  token=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
  if [[ -n "$token" && "$token" != "null" ]]; then
    log_success "Login: $label"
    PASSED=$((PASSED + 1))
    echo "$token"
  else
    log_error "Login: $label  (no token — response: $(echo "$response" | head -c 120))"
    FAILED=$((FAILED + 1))
    echo ""
  fi
}

check_authed() {
  local url="$1" token="$2" label="$3"
  if [[ -z "$token" ]]; then
    log_warn "Skipped (no token): $label"
    return
  fi
  local status
  status=$(curl -o /dev/null -s -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $token" "$url" 2>/dev/null || echo "000")
  if [[ "$status" =~ ^2 ]]; then
    log_success "$label  ($status)"
    PASSED=$((PASSED + 1))
  else
    log_error  "$label  (HTTP $status)"
    FAILED=$((FAILED + 1))
  fi
}

# ── Checks ────────────────────────────────────────────────────────────────────

log_step "Health endpoints"
check_http "$BASE_URL/api/health"                "gateway"
check_http "$BASE_URL/api/auth/health"           "auth-service"
check_http "$BASE_URL/api/courses/health"        "course-service"
check_http "$BASE_URL/api/enrollments/health"    "enrollment-service"

log_step "Auth flow — seed credentials"
ADMIN_TOKEN=$(check_auth_login "admin@know.mn"    "Admin!1234"   "admin@know.mn")
STUDENT_TOKEN=$(check_auth_login "student1@know.mn" "Student!1234" "student1@know.mn")

log_step "Authenticated endpoints"
check_authed "$BASE_URL/api/auth/me"         "$ADMIN_TOKEN"   "GET /auth/me (admin)"
check_authed "$BASE_URL/api/auth/me"         "$STUDENT_TOKEN" "GET /auth/me (student)"
check_authed "$BASE_URL/api/courses"         "$STUDENT_TOKEN" "GET /courses"
check_authed "$BASE_URL/api/enrollments"     "$STUDENT_TOKEN" "GET /enrollments"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
printf '%s\n' "$(printf '─%.0s' {1..50})"
TOTAL=$((PASSED + FAILED))
if (( FAILED == 0 )); then
  log_success "All checks passed ($PASSED/$TOTAL)"
  exit 0
else
  log_error "$FAILED check(s) failed ($PASSED/$TOTAL passed)"
  log_info  "Is the stack running?  bash scripts/dev-usecase.sh learner-core"
  log_info  "Are databases seeded?  bash scripts/docker-seed.sh"
  exit 1
fi
