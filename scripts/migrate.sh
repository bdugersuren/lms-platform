#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Migration Script
# Runs `prisma migrate deploy` for every service that has a Prisma schema.
# Safe to run multiple times (idempotent).
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
  "services/coding-service"
)

FAILED=()

for SERVICE in "${SERVICES[@]}"; do
  SCHEMA="$ROOT_DIR/$SERVICE/prisma/schema.prisma"
  ENV_FILE="$ROOT_DIR/$SERVICE/.env"

  if [ ! -f "$SCHEMA" ]; then
    echo "  ⚠ No schema: $SERVICE — skipping"
    continue
  fi

  echo "▶ Migrating $SERVICE..."

  if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
  fi

  if (cd "$ROOT_DIR/$SERVICE" && pnpm exec prisma migrate deploy); then
    echo "  ✓ $SERVICE"
  else
    echo "  ✗ $SERVICE FAILED"
    FAILED+=("$SERVICE")
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "✗ Failed migrations:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "✓ All migrations complete."
