#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Bootstrap Script
# Installs all dependencies and generates Prisma clients for every service.
# Run this once after cloning the repo on a new machine.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "▶ Installing dependencies..."
pnpm install

echo "▶ Generating Prisma clients..."
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

for SERVICE in "${SERVICES[@]}"; do
  if [ -f "$ROOT_DIR/$SERVICE/prisma/schema.prisma" ]; then
    echo "  → $SERVICE"
    (cd "$ROOT_DIR/$SERVICE" && pnpm exec prisma generate)
  fi
done

echo "✓ Bootstrap complete. Next: bash scripts/migrate.sh"
