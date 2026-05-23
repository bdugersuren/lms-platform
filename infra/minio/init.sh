#!/bin/sh
set -e

MC="mc --quiet"

$MC alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

BUCKET="${MINIO_BUCKET:-lms-media}"
$MC mb --ignore-existing "local/$BUCKET"

# Allow public read so presigned GET URLs work without extra auth headers
$MC anonymous set download "local/$BUCKET"

# Configure CORS so browsers can PUT directly using presigned upload URLs.
# AllowedOrigins should be restricted to known domains in production.
cat > /tmp/cors.json <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

$MC cors set "local/$BUCKET" /tmp/cors.json

echo "MinIO bucket '$BUCKET' initialized with CORS"
