#!/usr/bin/env bash
# Bootstraps the venv + frontend deps, then runs the FastAPI backend and the
# Vite dev server side by side. Ctrl+C tears both down.
#
#   ./run.sh            # default: backend on :8000, frontend on :5173
#   PORT=8001 ./run.sh  # override backend port

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BACKEND_PORT="${PORT:-8000}"
VENV="$ROOT/.venv"
FRONTEND="$ROOT/frontend"

echo "▸ history-315-skills :: dev launcher"
echo "  root:    $ROOT"
echo "  backend: http://127.0.0.1:$BACKEND_PORT"
echo "  ui:      http://127.0.0.1:5173"
echo

# --- 0. Kill existing processes ----------------------------------------------
echo "▸ killing old backend/frontend processes"

# Kill backend port if already running
kill -9 $(lsof -t -i:"$BACKEND_PORT") 2>/dev/null || true

# Kill common Vite ports
kill -9 $(lsof -t -i:5173) 2>/dev/null || true
kill -9 $(lsof -t -i:5174) 2>/dev/null || true
kill -9 $(lsof -t -i:5175) 2>/dev/null || true
kill -9 $(lsof -t -i:5176) 2>/dev/null || true

# Extra safety: kill lingering vite/node processes
pkill -f vite 2>/dev/null || true

sleep 1

# --- 1. Python venv -----------------------------------------------------------
if [ ! -d "$VENV" ]; then
  echo "▸ creating venv at $VENV"
  python3 -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

REQ="$ROOT/requirements.txt"
STAMP="$VENV/.requirements.sha"
NEW_SHA="$(sha1sum "$REQ" | awk '{print $1}')"
OLD_SHA="$(cat "$STAMP" 2>/dev/null || echo none)"

if [ "$NEW_SHA" != "$OLD_SHA" ]; then
  echo "▸ installing python deps"
  pip install --quiet --disable-pip-version-check -r "$REQ"
  echo "$NEW_SHA" > "$STAMP"
fi

# --- 2. Frontend deps ---------------------------------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "▸ installing frontend deps (this only happens once)"
  (cd "$FRONTEND" && npm install --silent)
fi

# --- 3. Run both processes ----------------------------------------------------
BACK_PID=""
FRONT_PID=""

cleanup() {
  echo
  echo "▸ shutting down"
  [ -n "$BACK_PID" ] && kill "$BACK_PID" 2>/dev/null || true
  [ -n "$FRONT_PID" ] && kill "$FRONT_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "▸ starting backend (uvicorn)"
"$VENV/bin/python" -m uvicorn app:app \
  --host 127.0.0.1 \
  --port "$BACKEND_PORT" \
  --log-level info \
  > "$ROOT/backend.log" 2>&1 &
BACK_PID=$!

# Wait until the backend answers /api/health (max ~10s).
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" > /dev/null; then
    break
  fi
  sleep 0.25
done

if ! curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" > /dev/null; then
  echo "✗ backend failed to start; tail of backend.log:"
  tail -n 30 "$ROOT/backend.log"
  exit 1
fi

echo "  ✓ backend healthy (logs: backend.log)"

echo "▸ starting frontend (vite)"
(cd "$FRONTEND" && npm run dev -- --host 127.0.0.1) &
FRONT_PID=$!

# Block on whichever child exits first.
wait -n "$BACK_PID" "$FRONT_PID"