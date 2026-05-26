#!/bin/sh
# DMOJ judge entrypoint — env vars-аас judge config үүсгэж ажиллуулна

JUDGE_KEY="${JUDGE_KEY:-lms-judge-01}"
JUDGE_SHARED_SECRET="${JUDGE_SHARED_SECRET:-lms-judge-secret}"
BRIDGE_HOST="${BRIDGE_HOST:-dmoj-bridged}"
BRIDGE_PORT="${BRIDGE_PORT:-9999}"

# Judge runtime config файл үүсгэх (~/.dmojrc)
mkdir -p ~/.config
cat > "${HOME}/.dmojrc" <<EOF
id: ${JUDGE_KEY}
key: ${JUDGE_SHARED_SECRET}
problem_storage_root: /problems
runtime: {}
EOF

echo "[judge] Starting DMOJ judge: ${JUDGE_KEY} → ${BRIDGE_HOST}:${BRIDGE_PORT}"

# Зөв syntax: dmoj <server_host> <judge_name> <judge_key> -p <port> -c <config>
exec dmoj "${BRIDGE_HOST}" "${JUDGE_KEY}" "${JUDGE_SHARED_SECRET}" \
    -p "${BRIDGE_PORT}" \
    -c "${HOME}/.dmojrc"
