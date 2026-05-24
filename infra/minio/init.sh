#!/bin/sh
set -e

MC="mc --quiet"

$MC alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

BUCKET="${MINIO_BUCKET:-lms-media}"
$MC mb --ignore-existing "local/$BUCKET"

# Allow public read so presigned GET URLs work without extra auth headers
$MC anonymous set download "local/$BUCKET"

# CORS is handled at the nginx /minio-store/ proxy level — no per-bucket CORS needed.

echo "MinIO bucket '$BUCKET' initialized successfully"
