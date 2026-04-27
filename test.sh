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

if ! python -c "import pytest" 2>/dev/null; then
  echo "Installing pytest..."
  pip install pytest
fi

exec python -m pytest tests/ -v "$@"
