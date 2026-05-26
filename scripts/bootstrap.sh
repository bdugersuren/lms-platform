#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Bootstrap Script
# Run once after cloning, or after adding a new service.
#
# What this does:
#   1. Checks for pnpm-lock.yaml and generates it if missing
#   2. Installs all workspace dependencies
#   3. Generates Prisma clients for every service
#   4. Prints next steps
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Color helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}▶${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }

# ── Dependency check ──────────────────────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}✗${NC} pnpm not found. Install: npm install -g pnpm@9.4.0"
  exit 1
fi

PNPM_VERSION=$(pnpm --version)
info "Using pnpm v${PNPM_VERSION}"

# ── Lockfile setup ────────────────────────────────────────────────────────────
# pnpm-lock.yaml is currently gitignored. For production Docker builds,
# a committed lockfile dramatically speeds up `pnpm install`:
#   - enables --frozen-lockfile (reproducible, 2-3x faster)
#   - allows BuildKit to cache the install layer more precisely
#
# RECOMMENDATION: Remove 'pnpm-lock.yaml' from .gitignore and commit it.
# Then change all Dockerfile RUN pnpm install lines to --frozen-lockfile.

if [ ! -f "$ROOT_DIR/pnpm-lock.yaml" ]; then
  warn "No pnpm-lock.yaml found."
  warn "Generating lockfile now (first install may be slow)..."
  warn "RECOMMENDATION: Remove 'pnpm-lock.yaml' from .gitignore and commit it."
  warn "This will significantly speed up Docker builds via --frozen-lockfile."
fi

# ── Install dependencies ──────────────────────────────────────────────────────
info "Installing all workspace dependencies..."
pnpm install

success "Dependencies installed."

# ── Prisma client generation ──────────────────────────────────────────────────
info "Generating Prisma clients..."

SERVICES=(
  "services/auth-service"
  "services/course-service"
  "services/enrollment-service"
  "services/quiz-service"
  "services/assignment-service"
  "services/wallet-service"
  "services/payment-service"
  "services/ai-service"
  "services/notification-service"
  "services/media-service"
  "services/certificate-service"
  "services/analytics-service"
  "services/coding-service"
)

for SERVICE in "${SERVICES[@]}"; do
  if [ -f "$ROOT_DIR/$SERVICE/prisma/schema.prisma" ]; then
    echo "  → $SERVICE"
    (cd "$ROOT_DIR/$SERVICE" && pnpm exec prisma generate) 2>&1 | tail -1
  fi
done

success "Prisma clients generated."

# ── Build shared packages (enables workspace:* linking) ───────────────────────
info "Building shared packages..."
pnpm --filter "@lms/shared-*" run build 2>&1 | grep -E "(error|success|built|✓)" || true

success "Shared packages built."

echo ""
echo "================================================================"
echo "  Bootstrap complete!"
echo "================================================================"
echo ""
echo "  Next steps:"
echo "    1. Copy .env.example → .env and fill in values"
echo "    2. Start infrastructure:  bash scripts/migrate.sh"
echo "    3. Start services:        docker compose up -d"
echo "    4. Seed data:             bash scripts/seed.sh"
echo ""
echo "  Development (local, no Docker):"
echo "    docker compose up -d postgres redis rabbitmq minio"
echo "    pnpm dev  (requires turbo: npm i -g turbo)"
echo ""
