#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/ccfa-paper-agent-backend"
FRONTEND="$ROOT/ccfa-paper-agent-frontend"
VENV="$BACKEND/.venv310"
PYTHON_BIN="$VENV/bin/python"
PIP_BIN="$VENV/bin/pip"
LOG_DIR="$ROOT/.agent/logs"

mkdir -p "$LOG_DIR"

find_python() {
  if command -v python3.10 >/dev/null 2>&1; then
    command -v python3.10
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    if python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      command -v python3
      return
    fi
  fi
  echo "Python 3.10 or newer is required." >&2
  exit 1
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  return 1
}

open_frontend() {
  local url="http://127.0.0.1:5173"
  if command -v open >/dev/null 2>&1; then
    open "$url"
    return
  fi
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm is required. Please install Node.js first." >&2
  exit 1
fi

if [ ! -x "$PYTHON_BIN" ]; then
  echo "Creating Python virtual environment..."
  "$(find_python)" -m venv "$VENV"
fi

if [ ! -f "$BACKEND/.env" ]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
fi

echo "Installing backend dependencies..."
"$PIP_BIN" install -r "$BACKEND/requirements.txt"

echo "Installing frontend dependencies..."
(cd "$FRONTEND" && npm install)

if port_in_use 8000; then
  echo "Backend port 8000 is already in use. Reusing existing service."
else
  echo "Starting backend at http://127.0.0.1:8000 ..."
  (
    cd "$BACKEND"
    nohup "$PYTHON_BIN" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 \
      > "$LOG_DIR/backend.log" 2>&1 &
  )
fi

if port_in_use 5173; then
  echo "Frontend port 5173 is already in use. Reusing existing service."
else
  echo "Starting frontend at http://127.0.0.1:5173 ..."
  (
    cd "$FRONTEND"
    nohup npm run dev -- --host 127.0.0.1 --port 5173 \
      > "$LOG_DIR/frontend.log" 2>&1 &
  )
fi

sleep 3
open_frontend

echo ""
echo "CCFA Paper Agent is starting."
echo "Frontend: http://127.0.0.1:5173"
echo "Backend:  http://127.0.0.1:8000"
echo "Logs:     $LOG_DIR"
echo "Configure API keys from the homepage settings panel."
