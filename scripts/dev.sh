#!/usr/bin/env bash
# Interactive local dev launcher.
# Starts infrastructure in Docker, then runs selected services locally
# with nodemon hot-reload (no container overhead for services).
#
# Usage:
#   bash scripts/dev.sh
#   bash scripts/dev.sh --infra-only   # just start docker infra and exit
#   bash scripts/dev.sh --all          # start all services (high RAM)
set -euo pipefail

cd "$(dirname "$0")/.."

# ── Helpers ──────────────────────────────────────────────────────────────────

bold() { printf '\033[1m%s\033[0m' "$*"; }
green() { printf '\033[32m%s\033[0m' "$*"; }
yellow() { printf '\033[33m%s\033[0m' "$*"; }
dim() { printf '\033[2m%s\033[0m' "$*"; }

# ── Service registry ─────────────────────────────────────────────────────────
# Format: "display-name:pnpm-filter:profile"
SERVICES=(
  "gateway          : @lms/gateway              : core"
  "auth-service     : @lms/auth-service         : core"
  "course-service   : @lms/course-service       : core"
  "enrollment-service: @lms/enrollment-service  : core"
  "quiz-service     : @lms/quiz-service         : learn"
  "assignment-service: @lms/assignment-service  : learn"
  "coding-service   : @lms/coding-service       : learn"
  "wallet-service   : @lms/wallet-service       : finance"
  "payment-service  : @lms/payment-service      : finance"
  "notification-service: @lms/notification-service: ops"
  "media-service    : @lms/media-service        : ops"
  "certificate-service: @lms/certificate-service: ops"
  "analytics-service: @lms/analytics-service    : ops"
  "ai-service       : @lms/ai-service           : ai"
)

get_name()   { echo "${1%%:*}" | xargs; }
get_filter() { local f="${1#*:}"; echo "${f%%:*}" | xargs; }
get_profile(){ echo "${1##*:}" | xargs; }

PIDS=()

stop_all() {
  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo ""
    yellow "Stopping services..."
    echo ""
    kill "${PIDS[@]}" 2>/dev/null || true
  fi
}

start_service() {
  local filter="$1"
  local name="$2"
  echo "  $(green '▶') Starting $(bold "$name")..."
  pnpm --filter "$filter" start:dev &
  PIDS+=($!)
}

# ── Parse flags ───────────────────────────────────────────────────────────────
INFRA_ONLY=false
START_ALL=false
for arg in "${@:-}"; do
  case "$arg" in
    --infra-only) INFRA_ONLY=true ;;
    --all)        START_ALL=true  ;;
  esac
done

# ── Start infrastructure ──────────────────────────────────────────────────────
echo ""
bold "LMS Platform — Local Dev Launcher"
echo ""
echo "Starting infrastructure (postgres, redis, rabbitmq, minio)..."
docker compose up -d 2>&1 | grep -E "Started|Running|healthy|Error" || true
echo "$(green '✔') Infrastructure ready"
echo ""

[[ "$INFRA_ONLY" == true ]] && echo "$(green 'Done.')  Infra running — exiting (--infra-only)." && exit 0

# ── Build shared packages ─────────────────────────────────────────────────────
echo "Building shared packages..."
pnpm --filter '@lms/shared-*' run build
echo "$(green '✔') Shared packages built"
echo ""

# ── Select services ───────────────────────────────────────────────────────────
if [[ "$START_ALL" == true ]]; then
  echo "Starting all services (--all)..."
  echo ""
  for entry in "${SERVICES[@]}"; do
    start_service "$(get_filter "$entry")" "$(get_name "$entry")"
  done
else
  bold "Available services:"
  echo ""
  for i in "${!SERVICES[@]}"; do
    entry="${SERVICES[$i]}"
    profile="$(get_profile "$entry")"
    printf "  $(bold '%2d')  %-26s $(dim '%s')\n" "$((i+1))" "$(get_name "$entry")" "[$profile]"
  done
  echo ""
  echo "Enter numbers to start (e.g. $(bold '1 2 4')), $(bold 'all'), or press Enter to exit:"
  read -r selection

  if [[ -z "$selection" ]]; then
    echo "No services selected — infrastructure is running."
    exit 0
  fi

  echo ""
  if [[ "$selection" == "all" ]]; then
    for entry in "${SERVICES[@]}"; do
      start_service "$(get_filter "$entry")" "$(get_name "$entry")"
    done
  else
    for token in $selection; do
      if [[ "$token" =~ ^[0-9]+$ ]]; then
        idx=$((token - 1))
        if [[ $idx -ge 0 && $idx -lt ${#SERVICES[@]} ]]; then
          entry="${SERVICES[$idx]}"
          start_service "$(get_filter "$entry")" "$(get_name "$entry")"
        else
          yellow "  ⚠  '$token' out of range — skipping"
        fi
      fi
    done
  fi
fi

# ── Wait ──────────────────────────────────────────────────────────────────────
if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "No services started."
  exit 0
fi

echo ""
echo "$(green '✔') Services running — press $(bold 'Ctrl+C') to stop all."
echo ""

trap stop_all INT TERM
wait "${PIDS[@]}" 2>/dev/null || true
