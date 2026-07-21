#!/bin/sh
set -eu
cd "$(dirname "$0")"
mode="${1:-check}"
if [ "${NODE_ENV:-}" = test ]; then
  export AUTH_SECRET="${AUTH_SECRET:-${JWT_SECRET:-}}"
  export AUTH_ISSUER="${AUTH_ISSUER:-prior-auth-runtime}"
  export AUTH_AUDIENCE="${AUTH_AUDIENCE:-prior-auth-runtime-client}"
  export PRIOR_AUTH_ACTIVE_KEY_VERSION="${PRIOR_AUTH_ACTIVE_KEY_VERSION:-runtime-v1}"
  if [ -z "${PRIOR_AUTH_DATA_KEYS_JSON:-}" ]; then
    PRIOR_AUTH_DATA_KEYS_JSON="$(node -e 'const crypto=require("node:crypto");const material=process.env.MEMORY_ENCRYPTION_KEY_BASE64||process.env.AUTH_SECRET;process.stdout.write(JSON.stringify({"runtime-v1":crypto.createHash("sha256").update(material).digest("hex")}))')"
    export PRIOR_AUTH_DATA_KEYS_JSON
  fi
fi
required() { eval "value=\${$1:-}"; [ -n "$value" ] || { echo "$1 is required" >&2; exit 1; }; }
configuration() {
  required DATABASE_URL
  required AUTH_SECRET
  required AUTH_ISSUER
  required AUTH_AUDIENCE
  required PRIOR_AUTH_DATA_KEYS_JSON
  required PRIOR_AUTH_ACTIVE_KEY_VERSION
  [ "${#AUTH_SECRET}" -ge 32 ] || { echo 'AUTH_SECRET must be at least 32 characters' >&2; exit 1; }
  node -e 'const keys=JSON.parse(process.env.PRIOR_AUTH_DATA_KEYS_JSON);const key=keys[process.env.PRIOR_AUTH_ACTIVE_KEY_VERSION];if(!/^[0-9a-f]{64}$/i.test(key||""))throw new Error("active prior authorization data key must be 32-byte hex")'
  if [ "${NODE_ENV:-}" = production ]; then
    required PAYER_API_BASE_URL
    required PAYER_API_ACCESS_TOKEN
    required PAYER_WEBHOOK_SECRET
    required PROVIDER_WORKER_SECRET
    [ "${#PAYER_WEBHOOK_SECRET}" -ge 32 ] || { echo 'PAYER_WEBHOOK_SECRET must be at least 32 characters' >&2; exit 1; }
    [ "${#PROVIDER_WORKER_SECRET}" -ge 32 ] || { echo 'PROVIDER_WORKER_SECRET must be at least 32 characters' >&2; exit 1; }
  fi
}
case "$mode" in
  check) (cd frontend && npm run check && npm run build) ;;
  migrate)
    configuration
    [ "${ALLOW_SCHEMA_MIGRATION:-}" = 1 ] || { echo 'Set ALLOW_SCHEMA_MIGRATION=1 after backup and change approval' >&2; exit 1; }
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f frontend/migrations/001_governed_prior_auth.sql
    ;;
  start) configuration; (cd frontend && npm run start -- -H 127.0.0.1 -p "${PORT:-5302}") ;;
  *) echo 'usage: ./start.sh check|migrate|start' >&2; exit 2 ;;
esac
