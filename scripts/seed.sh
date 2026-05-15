#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Seed Script
# Runs the `seed` npm script for every service that defines one.
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
)

SEEDED=0

for SERVICE in "${SERVICES[@]}"; do
  PKG="$ROOT_DIR/$SERVICE/package.json"

  if [ ! -f "$PKG" ]; then
    continue
  fi

  if jq -e '.scripts.seed' "$PKG" > /dev/null 2>&1; then
    echo "▶ Seeding $SERVICE..."
    (cd "$ROOT_DIR/$SERVICE" && pnpm run seed)
    echo "  ✓ $SERVICE seeded."
    SEEDED=$((SEEDED + 1))
  fi
done

if [ "$SEEDED" -eq 0 ]; then
  echo "⚠ No seed scripts found in any service."
else
  echo "✓ Seeded $SEEDED service(s)."
fi
