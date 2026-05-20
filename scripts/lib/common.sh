#!/usr/bin/env bash
# =============================================================================
# scripts/lib/common.sh — Shared helpers for all LMS platform scripts
# Source this file; do not execute it directly.
# =============================================================================

# Guard against double-sourcing
[ -n "${_LMS_COMMON_LOADED:-}" ] && return 0
_LMS_COMMON_LOADED=1

# ---------------------------------------------------------------------------
# ANSI color codes
# ---------------------------------------------------------------------------
_C_RESET='\033[0m'
_C_BOLD='\033[1m'
_C_RED='\033[0;31m'
_C_GREEN='\033[0;32m'
_C_YELLOW='\033[1;33m'
_C_CYAN='\033[0;36m'
_C_BLUE='\033[0;34m'

# ---------------------------------------------------------------------------
# Logging functions
# ---------------------------------------------------------------------------
log_info()    { printf "${_C_CYAN}▶${_C_RESET}  %s\n" "$*"; }
log_success() { printf "${_C_GREEN}✓${_C_RESET}  %s\n" "$*"; }
log_warn()    { printf "${_C_YELLOW}⚠${_C_RESET}  %s\n" "$*"; }
log_error()   { printf "${_C_RED}✗${_C_RESET}  %s\n" "$*" >&2; }
log_step()    { printf "\n${_C_BOLD}${_C_BLUE}══${_C_RESET} %s\n" "$*"; }

# ---------------------------------------------------------------------------
# require_docker — exits 1 if Docker daemon is not reachable
# ---------------------------------------------------------------------------
require_docker() {
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Start Docker and try again."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# load_env — sources ROOT_DIR/.env with CRLF stripping (WSL2 safe)
# Requires ROOT_DIR to be set by the calling script.
# ---------------------------------------------------------------------------
load_env() {
  local env_file="${ROOT_DIR}/.env"
  if [ ! -f "$env_file" ]; then
    log_error ".env not found at $env_file — copy .env.example and fill in values."
    exit 1
  fi
  # tr -d '\r' handles Windows CRLF line endings from git checkout on WSL2
  # shellcheck disable=SC1090
  source <(tr -d '\r' < "$env_file")
}

# ---------------------------------------------------------------------------
# find_node — sets NODE_BIN to a working node executable
# Search order: PATH → NVM → VSCode Server → VSCode Remote Containers
# ---------------------------------------------------------------------------
find_node() {
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
    return 0
  fi

  # NVM
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    # shellcheck disable=SC1090
    source "${NVM_DIR:-$HOME/.nvm}/nvm.sh" --no-use
    if command -v node >/dev/null 2>&1; then
      NODE_BIN="$(command -v node)"
      return 0
    fi
  fi

  # VSCode Server embedded node (WSL2 remote)
  local vscode_server_bin
  vscode_server_bin="$(find "$HOME/.vscode-server/bin" -name "node" -type f 2>/dev/null | sort -r | head -1)"
  if [ -n "$vscode_server_bin" ]; then
    NODE_BIN="$vscode_server_bin"
    return 0
  fi

  # VSCode Remote Containers embedded node
  local vscode_rc_bin
  vscode_rc_bin="$(find "$HOME/.vscode-remote-containers" -name "node" -type f 2>/dev/null | sort -r | head -1)"
  if [ -n "$vscode_rc_bin" ]; then
    NODE_BIN="$vscode_rc_bin"
    return 0
  fi

  log_error "node not found. Install Node.js >= 20 or ensure NVM is configured."
  exit 1
}

# ---------------------------------------------------------------------------
# confirm_destructive — prompts user to type "yes" before a risky operation
# Usage: confirm_destructive "message describing what will be destroyed"
# ---------------------------------------------------------------------------
confirm_destructive() {
  local msg="${1:-This operation is irreversible.}"
  log_warn "$msg"
  printf "${_C_YELLOW}Type 'yes' to continue, anything else to abort:${_C_RESET} "
  read -r answer
  if [ "$answer" != "yes" ]; then
    log_info "Aborted."
    exit 0
  fi
}

# ---------------------------------------------------------------------------
# Docker Compose helpers
# ALL_PROFILES — all non-default profiles, used for "stop everything"
# ---------------------------------------------------------------------------
ALL_PROFILES="--profile core --profile learn --profile finance --profile ops --profile frontend --profile ai"

compose_up() {
  log_info "Starting containers: $*"
  # shellcheck disable=SC2068
  docker compose $@ up -d
}

compose_down() {
  log_info "Stopping all containers..."
  # shellcheck disable=SC2086
  docker compose $ALL_PROFILES down "$@"
}
