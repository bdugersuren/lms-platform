#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Bootstrap Script
# Installs all dependencies and generates Prisma clients.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "▶ Installing dependencies..."
pnpm install

echo "▶ Generating Prisma clients..."
SERVICES=(
  "services/auth-service"
)

for SERVICE in "${SERVICES[@]}"; do
  if [ -f "$SERVICE/prisma/schema.prisma" ]; then
    echo "  → Generating Prisma client for $SERVICE"
    (cd "$SERVICE" && pnpm exec prisma generate)
  fi
done

echo "▶ Running database migrations..."
bash "$ROOT_DIR/scripts/migrate.sh"

echo "✓ Bootstrap complete."
