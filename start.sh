#!/usr/bin/env bash
set -euo pipefail
PORT=5302

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti tcp:"$PORT" || true)"
  if [ -n "$PIDS" ]; then
    echo "Stopping existing process on port $PORT: $(echo "$PIDS" | tr '\n' ' ')"
    kill $PIDS || true
    sleep 1
    PIDS="$(lsof -ti tcp:"$PORT" || true)"
    if [ -n "$PIDS" ]; then
      echo "Force stopping process on port $PORT: $(echo "$PIDS" | tr '\n' ' ')"
      kill -9 $PIDS || true
    fi
  fi
fi

cd "$(dirname "$0")/frontend"
npm run dev -- -p "$PORT"
