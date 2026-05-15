#!/usr/bin/env bash
# =============================================================================
# LMS Platform — Docker Migration Script
# Runs `prisma migrate deploy` inside each running service container.
# Requirements: docker compose up -d (containers must be running)
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Service name → container working directory
declare -A SVC_WORKDIR=(
  [auth-service]="services/auth-service"
  [course-service]="services/course-service"
  [enrollment-service]="services/enrollment-service"
  [quiz-service]="services/quiz-service"
  [assignment-service]="services/assignment-service"
  [wallet-service]="services/wallet-service"
  [payment-service]="services/payment-service"
  [ai-service]="services/ai-service"
  [notification-service]="services/notification-service"
  [media-service]="services/media-service"
  [certificate-service]="services/certificate-service"
  [analytics-service]="services/analytics-service"
)

FAILED=()

for SVC in "${!SVC_WORKDIR[@]}"; do
  WORKDIR="${SVC_WORKDIR[$SVC]}"

  # Skip if container is not running
  STATUS=$(docker compose ps --status running --services 2>/dev/null | grep -x "$SVC" || true)
  if [ -z "$STATUS" ]; then
    echo "  ⚠ $SVC is not running — skipping"
    continue
  fi

  echo "▶ Migrating $SVC ..."
  if docker compose exec "$SVC" sh -c "cd /app/$WORKDIR && npx prisma migrate deploy"; then
    echo "  ✓ $SVC"
  else
    echo "  ✗ $SVC FAILED"
    FAILED+=("$SVC")
  fi
done

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "✗ Failed:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "✓ All container migrations complete."
