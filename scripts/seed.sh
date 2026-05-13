#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Seed Script
# Runs seed scripts for each service that has one.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

SERVICES=(
  "services/auth-service"
)

for SERVICE in "${SERVICES[@]}"; do
  PKG="$ROOT_DIR/$SERVICE/package.json"

  if [ ! -f "$PKG" ]; then
    continue
  fi

  if jq -e '.scripts.seed' "$PKG" > /dev/null 2>&1; then
    echo "▶ Seeding $SERVICE..."
    (cd "$ROOT_DIR/$SERVICE" && pnpm run seed)
    echo "  ✓ $SERVICE seeded."
  else
    echo "  ⚠ No seed script in $SERVICE, skipping."
  fi
done

echo "✓ All seeds complete."
