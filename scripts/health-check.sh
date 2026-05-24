#!/usr/bin/env bash
# =============================================================================
# scripts/health-check.sh — Quick container health and restart diagnostic
#
# Prints status, health, restart count, and memory usage for all running
# LMS containers. Highlights unhealthy containers and high restart counts.
#
# Usage:
#   bash scripts/health-check.sh           # all lms-* containers
#   bash scripts/health-check.sh --watch   # refresh every 5s (like watch)
#   bash scripts/health-check.sh --help
#
# Exit codes:
#   0  All containers healthy
#   1  One or more containers unhealthy or restarting excessively
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/common.sh
source scripts/lib/common.sh

# ── Config ────────────────────────────────────────────────────────────────────

RESTART_WARN_THRESHOLD=3   # Warn if restarts >= this value
WATCH_INTERVAL=5

# ── Helpers ───────────────────────────────────────────────────────────────────

show_help() {
  cat <<EOF

$(printf '\033[1m')health-check.sh$(printf '\033[0m') — LMS container health diagnostic

$(printf '\033[1m')USAGE$(printf '\033[0m')
  bash scripts/health-check.sh [--watch] [--help]

$(printf '\033[1m')OPTIONS$(printf '\033[0m')
  --watch   Refresh every ${WATCH_INTERVAL}s until Ctrl+C
  --help    Show this help

$(printf '\033[1m')OUTPUT$(printf '\033[0m')
  SERVICE           STATUS    HEALTH       RESTARTS  MEM
  lms-gateway       running   healthy      0         87MB / 256MB
  lms-auth-service  running   unhealthy    3         ← highlighted in red

$(printf '\033[1m')EXIT CODES$(printf '\033[0m')
  0   All containers healthy
  1   One or more unhealthy or restart count >= ${RESTART_WARN_THRESHOLD}

EOF
}

# Colour helpers
red()    { printf '\033[31m%s\033[0m' "$*"; }
green()  { printf '\033[32m%s\033[0m' "$*"; }
yellow() { printf '\033[33m%s\033[0m' "$*"; }
bold()   { printf '\033[1m%s\033[0m' "$*"; }
dim()    { printf '\033[2m%s\033[0m' "$*"; }

# ── Core logic ────────────────────────────────────────────────────────────────

run_check() {
  require_docker

  # Collect all lms-* container IDs
  mapfile -t CONTAINER_IDS < <(docker ps -a --filter "name=lms-" --format "{{.ID}}" 2>/dev/null)

  if [[ ${#CONTAINER_IDS[@]} -eq 0 ]]; then
    log_warn "No lms-* containers found. Start containers first."
    return 0
  fi

  local has_problem=0

  # Header
  printf '\n'
  printf '%-30s %-10s %-12s %-10s %s\n' \
    "$(bold SERVICE)" "$(bold STATUS)" "$(bold HEALTH)" "$(bold RESTARTS)" "$(bold MEMORY)"
  printf '%s\n' "$(printf '─%.0s' {1..80})"

  for id in "${CONTAINER_IDS[@]}"; do
    # Fetch all needed fields in one inspect call
    local info
    info="$(docker inspect "$id" --format \
      '{{.Name}}|{{.State.Status}}|{{.State.Health.Status}}|{{.RestartCount}}' 2>/dev/null)" || continue

    local name status health restarts
    name="$(echo "$info" | cut -d'|' -f1 | sed 's|^/||')"
    status="$(echo "$info" | cut -d'|' -f2)"
    health="$(echo "$info" | cut -d'|' -f3)"
    restarts="$(echo "$info" | cut -d'|' -f4)"

    # Memory usage (best-effort — may be empty for stopped containers)
    local mem_usage mem_limit mem_display
    mem_usage="$(docker stats "$id" --no-stream --format "{{.MemUsage}}" 2>/dev/null)" || mem_usage="n/a"
    mem_display="${mem_usage:-n/a}"

    # Colour-code each column
    local status_col health_col restarts_col
    case "$status" in
      running)  status_col="$(green "$status")" ;;
      exited)   status_col="$(red "$status")"; has_problem=1 ;;
      *)        status_col="$(yellow "$status")" ;;
    esac

    case "$health" in
      healthy)   health_col="$(green healthy)" ;;
      unhealthy) health_col="$(red unhealthy)"; has_problem=1 ;;
      starting)  health_col="$(yellow starting)" ;;
      "")        health_col="$(dim "no check")" ;;
      *)         health_col="$(dim "$health")" ;;
    esac

    if [[ "$restarts" =~ ^[0-9]+$ ]] && (( restarts >= RESTART_WARN_THRESHOLD )); then
      restarts_col="$(red "$restarts  ← high")"
      has_problem=1
    else
      restarts_col="${restarts:-0}"
    fi

    printf '%-30s %-20s %-22s %-20s %s\n' \
      "$name" "$status_col" "$health_col" "$restarts_col" "$mem_display"
  done

  printf '\n'

  if (( has_problem )); then
    log_warn "One or more containers need attention."
    log_info "Inspect logs: docker compose logs -f <service>"
    log_info "Restart:      docker compose restart <service>"
    return 1
  else
    log_success "All containers look healthy."
    return 0
  fi
}

# ── Entry point ───────────────────────────────────────────────────────────────

WATCH=false

for arg in "$@"; do
  case "$arg" in
    --watch|-w) WATCH=true ;;
    --help|-h)  show_help; exit 0 ;;
    *)
      log_error "Unknown argument: $arg"
      show_help
      exit 1
      ;;
  esac
done

if $WATCH; then
  log_info "Watching (Ctrl+C to stop, refresh every ${WATCH_INTERVAL}s)..."
  while true; do
    clear
    run_check || true
    sleep "$WATCH_INTERVAL"
  done
else
  run_check
fi
