#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$project_dir/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$project_dir/.env"
  set +a
fi

mode="${1:-start}"
export API_PORT="${API_PORT:-${BACKEND_PORT:-}}"
export UI_PORT="${UI_PORT:-${FRONTEND_PORT:-}}"
required() { [[ -n "${!1:-}" ]] || { echo "$1 is required" >&2; exit 1; }; }
configuration() {
  required DATABASE_URL
  required AUTH_SECRET
  required AUTH_ISSUER
  required AUTH_AUDIENCE
  required PRIOR_AUTH_DATA_KEYS_JSON
  required PRIOR_AUTH_ACTIVE_KEY_VERSION
  required OPENROUTER_API_KEY
  required OPENROUTER_MODEL
  required OPENROUTER_BASE_URL
  required API_PORT
  required UI_PORT
  [[ "$API_PORT" != "$UI_PORT" ]] || { echo 'API_PORT and UI_PORT must differ' >&2; exit 1; }
  [[ ${#AUTH_SECRET} -ge 32 ]] || { echo 'AUTH_SECRET must be at least 32 characters' >&2; exit 1; }
  node -e 'const keys=JSON.parse(process.env.PRIOR_AUTH_DATA_KEYS_JSON);const key=keys[process.env.PRIOR_AUTH_ACTIVE_KEY_VERSION];if(!/^[0-9a-f]{64}$/i.test(key||""))throw new Error("active prior authorization data key must be 32-byte hex")'
}
migrate() {
  [[ "${ALLOW_SCHEMA_MIGRATION:-}" == 1 || "${ALLOW_SCHEMA_MIGRATION:-}" == true ]] || { echo 'Set ALLOW_SCHEMA_MIGRATION=true after approval' >&2; exit 1; }
  for migration in "$project_dir"/frontend/migrations/*.sql; do
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  done
}
start_services() {
  migrate
  BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin node "$project_dir/backend/scripts/create-admin.mjs"
  cleanup() {
    trap - INT TERM EXIT
    [[ -z "${proxy_pid:-}" ]] || kill "$proxy_pid" 2>/dev/null || true
    [[ -z "${app_pid:-}" ]] || kill "$app_pid" 2>/dev/null || true
    [[ -z "${proxy_pid:-}" ]] || wait "$proxy_pid" 2>/dev/null || true
    [[ -z "${app_pid:-}" ]] || wait "$app_pid" 2>/dev/null || true
  }
  trap cleanup INT TERM EXIT
  npm --prefix "$project_dir/frontend" run start -- -H 127.0.0.1 -p "$API_PORT" &
  app_pid=$!
  API_PORT="$API_PORT" UI_PORT="$UI_PORT" node "$project_dir/frontend/scripts/runtime-proxy.mjs" &
  proxy_pid=$!
  wait "$app_pid" "$proxy_pid"
}

case "$mode" in
  check) npm --prefix "$project_dir/frontend" run check && NODE_ENV=production npm --prefix "$project_dir/frontend" run build ;;
  migrate) configuration; migrate ;;
  start) configuration; start_services ;;
  *) echo 'usage: ./start.sh [check|migrate|start]' >&2; exit 2 ;;
esac
