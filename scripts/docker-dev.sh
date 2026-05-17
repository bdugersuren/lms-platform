#!/bin/sh
# Hot-reload entrypoint for containerized NestJS services (docker-compose.override.yml).
# Run from the service working directory (/app/services/<name> or /app/gateway).
# Uses ts-node --transpile-only for ~3s restarts — no type checking, just transpile.
set -e

export PATH="$(pwd)/node_modules/.bin:/app/node_modules/.bin:$PATH"

# Resolve path to packages/ relative to this service's working directory
if [ -d "../../packages" ]; then
  PKG_ROOT="../../packages"
elif [ -d "../packages" ]; then
  PKG_ROOT="../packages"
else
  echo "ERROR: cannot locate packages/ directory from $(pwd)" >&2
  exit 1
fi

exec nodemon \
  --watch src \
  --watch "$PKG_ROOT/shared-types/src" \
  --watch "$PKG_ROOT/shared-utils/src" \
  --watch "$PKG_ROOT/shared-auth/src" \
  --watch "$PKG_ROOT/shared-config/src" \
  --ext ts,json \
  --ignore '**/*.spec.ts' \
  --exec "ts-node --transpile-only -r tsconfig-paths/register src/main.ts"
