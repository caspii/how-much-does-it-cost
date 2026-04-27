#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -d venv ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export FLASK_APP=app.py
export FLASK_ENV=development
export FLASK_DEBUG=1
if [ -z "${PORT:-}" ]; then
  PORT=$(python -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()')
fi
export PORT
echo "Starting on http://localhost:$PORT"

exec flask run --host=0.0.0.0 --port="$PORT" --reload --debugger
