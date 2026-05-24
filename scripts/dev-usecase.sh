#!/usr/bin/env bash
# =============================================================================
# scripts/dev-usecase.sh — Use-case based Docker Compose launcher
#
# Starts the right set of profiles for a given development scenario,
# so you don't have to memorise which --profile flags go together.
#
# Usage:
#   bash scripts/dev-usecase.sh <use-case> [command] [options]
#
# Use-cases:
#   learner-core    core + frontend        (~2.5 GB)  Basic learning flow
#   paid-course     core + finance + frontend (~2.9 GB)  Payments + wallet
#   certificate     core + ops + frontend  (~4.3 GB)  Certs, media, analytics
#   full-learning   core + learn + finance + ops + frontend  (~4.7 GB)
#   dev-all         all profiles incl. AI  (~9.2 GB)
#
# Commands  (default: up):
#   up      docker compose up -d   (default)
#   down    docker compose down
#   logs    docker compose logs -f
#   ps      docker compose ps
#   build   docker compose build (then up)
#
# Options:
#   --build   Force rebuild images before up
#   --help    Show this help
#
# Examples:
#   bash scripts/dev-usecase.sh learner-core
#   bash scripts/dev-usecase.sh paid-course --build
#   bash scripts/dev-usecase.sh full-learning down
#   bash scripts/dev-usecase.sh dev-all logs
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/common.sh
source scripts/lib/common.sh

# ── Use-case → profile mapping ───────────────────────────────────────────────

declare -A USECASE_PROFILES
USECASE_PROFILES["learner-core"]="core frontend"
USECASE_PROFILES["paid-course"]="core finance frontend"
USECASE_PROFILES["certificate"]="core ops frontend"
USECASE_PROFILES["full-learning"]="core learn finance ops frontend"
USECASE_PROFILES["dev-all"]="core learn finance ops frontend ai"

declare -A USECASE_DESC
USECASE_DESC["learner-core"]="Basic learning flow (auth, courses, enrollment, web)"
USECASE_DESC["paid-course"]="Paid courses (+ wallet, payment)"
USECASE_DESC["certificate"]="Certificates + media + analytics (+ ops)"
USECASE_DESC["full-learning"]="Full platform without AI (+ quiz, assignment, finance, ops)"
USECASE_DESC["dev-all"]="Everything including AI/Ollama (~9 GB RAM)"

# ── Helpers ───────────────────────────────────────────────────────────────────

show_help() {
  cat <<EOF

$(printf '\033[1m')dev-usecase.sh$(printf '\033[0m') — Use-case based Docker Compose launcher

$(printf '\033[1m')USAGE$(printf '\033[0m')
  bash scripts/dev-usecase.sh <use-case> [command] [--build] [--help]

$(printf '\033[1m')USE-CASES$(printf '\033[0m')
  learner-core    ${USECASE_DESC["learner-core"]}
  paid-course     ${USECASE_DESC["paid-course"]}
  certificate     ${USECASE_DESC["certificate"]}
  full-learning   ${USECASE_DESC["full-learning"]}
  dev-all         ${USECASE_DESC["dev-all"]}

$(printf '\033[1m')COMMANDS$(printf '\033[0m') (default: up)
  up      Start containers in background
  down    Stop and remove containers
  logs    Follow logs
  ps      Show running containers
  build   Build images then start

$(printf '\033[1m')OPTIONS$(printf '\033[0m')
  --build   Rebuild images before starting (applies to 'up' command)
  --help    Show this help message

$(printf '\033[1m')EXAMPLES$(printf '\033[0m')
  bash scripts/dev-usecase.sh learner-core
  bash scripts/dev-usecase.sh paid-course --build
  bash scripts/dev-usecase.sh full-learning down
  bash scripts/dev-usecase.sh dev-all logs

EOF
}

profiles_to_flags() {
  local flags=""
  for p in $1; do
    flags="$flags --profile $p"
  done
  echo "$flags"
}

# ── Argument parsing ──────────────────────────────────────────────────────────

USECASE=""
COMMAND="up"
BUILD_FLAG=""

for arg in "$@"; do
  case "$arg" in
    --help|-h)
      show_help
      exit 0
      ;;
    --build)
      BUILD_FLAG="--build"
      ;;
    up|down|logs|ps|build)
      COMMAND="$arg"
      ;;
    *)
      if [[ -z "$USECASE" ]]; then
        USECASE="$arg"
      else
        log_error "Unknown argument: $arg"
        show_help
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$USECASE" ]]; then
  log_error "Use-case is required."
  show_help
  exit 1
fi

if [[ -z "${USECASE_PROFILES[$USECASE]+x}" ]]; then
  log_error "Unknown use-case: '$USECASE'"
  printf "\nAvailable use-cases:\n"
  for uc in "${!USECASE_PROFILES[@]}"; do
    printf "  %-20s %s\n" "$uc" "${USECASE_DESC[$uc]}"
  done
  echo ""
  exit 1
fi

PROFILES="${USECASE_PROFILES[$USECASE]}"
PROFILE_FLAGS="$(profiles_to_flags "$PROFILES")"

# ── Pre-flight checks ─────────────────────────────────────────────────────────

require_docker
load_env

# ── Execute ───────────────────────────────────────────────────────────────────

log_step "Use-case: $USECASE"
log_info "${USECASE_DESC[$USECASE]}"
log_info "Profiles: $PROFILES"
echo ""

case "$COMMAND" in
  up)
    # shellcheck disable=SC2086
    docker compose $PROFILE_FLAGS up -d $BUILD_FLAG
    echo ""
    log_success "Started. Run 'docker compose ps' to verify containers."
    log_info "Logs: docker compose $PROFILE_FLAGS logs -f"
    ;;
  down)
    # shellcheck disable=SC2086
    docker compose $PROFILE_FLAGS down
    echo ""
    log_success "Stopped."
    ;;
  logs)
    log_info "Streaming logs (Ctrl+C to stop)..."
    # shellcheck disable=SC2086
    docker compose $PROFILE_FLAGS logs -f
    ;;
  ps)
    # shellcheck disable=SC2086
    docker compose $PROFILE_FLAGS ps
    ;;
  build)
    log_info "Building images..."
    # shellcheck disable=SC2086
    docker compose $PROFILE_FLAGS build
    echo ""
    log_info "Starting containers..."
    # shellcheck disable=SC2086
    docker compose $PROFILE_FLAGS up -d
    echo ""
    log_success "Built and started."
    ;;
esac
