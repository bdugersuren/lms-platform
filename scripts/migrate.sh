#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Migration Script
# Runs prisma migrate deploy for every service that has a prisma schema.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load root .env if present
if [ -f ".env" ]; then
  set -a
  # shellcheck source=.env
  source .env
  set +a
fi

SERVICES=(
  "services/auth-service"
)

for SERVICE in "${SERVICES[@]}"; do
  SCHEMA="$ROOT_DIR/$SERVICE/prisma/schema.prisma"
  ENV_FILE="$ROOT_DIR/$SERVICE/.env"

  if [ ! -f "$SCHEMA" ]; then
    echo "  ⚠ No schema found for $SERVICE, skipping."
    continue
  fi

  echo "▶ Migrating $SERVICE..."

  # Load service-specific .env if it exists
  if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
  fi

  (cd "$ROOT_DIR/$SERVICE" && pnpm exec prisma migrate deploy)

  echo "  ✓ $SERVICE migrated."
done

echo "✓ All migrations complete."
