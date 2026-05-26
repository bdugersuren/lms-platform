#!/usr/bin/env bash
# =============================================================================
# setup-dmoj.sh — DMOJ online-judge source code clone хийх
#
# Ажиллуулах: bash scripts/setup-dmoj.sh
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/infra/dmoj/repo"
DMOJ_REPO="https://github.com/DMOJ/online-judge.git"

echo "═══════════════════════════════════════════════════════"
echo " DMOJ source code тохируулж байна..."
echo "═══════════════════════════════════════════════════════"

# ── Clone буюу update ──────────────────────────────────────────────────────
if [ -d "$REPO_DIR/.git" ]; then
  echo "▶ Аль хэдийн clone хийсэн байна — update хийж байна..."
  git -C "$REPO_DIR" pull --ff-only
  echo "✓ DMOJ repo updated"
else
  echo "▶ DMOJ online-judge repo clone хийж байна..."
  git clone --depth=1 "$DMOJ_REPO" "$REPO_DIR"
  echo "✓ Clone дууслаа → $REPO_DIR"
fi

# ── local_settings.py холбох ──────────────────────────────────────────────
SETTINGS_SRC="$(dirname "$REPO_DIR")/local_settings.py"
SETTINGS_DST="$REPO_DIR/dmoj/local_settings.py"

if [ -f "$SETTINGS_SRC" ] && [ ! -f "$SETTINGS_DST" ]; then
  ln -sf "$SETTINGS_SRC" "$SETTINGS_DST"
  echo "✓ local_settings.py холбосон"
fi

# ── Environment файлуудыг шалгах ─────────────────────────────────────────
ENV_DIR="$(dirname "$REPO_DIR")/environment"
MISSING=0

for f in mysql.env mysql-admin.env site.env; do
  if [ ! -f "$ENV_DIR/$f" ]; then
    echo "⚠  Дутуу: infra/dmoj/environment/$f"
    echo "   → cp infra/dmoj/environment/$f.example infra/dmoj/environment/$f"
    MISSING=1
  fi
done

if [ ! -f "$(pwd)/.env.dmoj" ]; then
  echo "⚠  Дутуу: .env.dmoj"
  echo "   → cp .env.dmoj.example .env.dmoj"
  MISSING=1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
if [ $MISSING -eq 1 ]; then
  echo " ⚠  Дутуу файлуудыг бэлтгээд дахин ажиллуулна уу"
else
  echo " ✓ Бүх файлууд бэлэн — build хийж болно:"
  echo ""
  echo "   docker compose -f docker-compose.dmoj.yml \\"
  echo "     --env-file .env.dmoj build"
  echo ""
  echo "   docker compose up -d    # lms-net үүсгэх"
  echo "   docker compose -f docker-compose.dmoj.yml \\"
  echo "     --env-file .env.dmoj up -d"
fi
echo "═══════════════════════════════════════════════════════"
