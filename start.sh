#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (Codex managed)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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
  PRIOR_AUTH_DATA_KEYS_JSON="$(node -e '
    const value = process.env.PRIOR_AUTH_DATA_KEYS_JSON || "";
    try { process.stdout.write(JSON.stringify(JSON.parse(value))); }
    catch {
      const match = value.match(/^\{([A-Za-z0-9._-]+):([0-9a-fA-F]{64})\}$/);
      if (!match) throw new Error("PRIOR_AUTH_DATA_KEYS_JSON must be a JSON object");
      process.stdout.write(JSON.stringify({ [match[1]]: match[2] }));
    }
  ')"
  export PRIOR_AUTH_DATA_KEYS_JSON
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
  if [[ "${NODE_ENV:-development}" != production && "${ALLOW_DEMO_SEED:-false}" == true ]]; then
    node "$project_dir/backend/scripts/provision-demo-data.mjs"
  fi
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
