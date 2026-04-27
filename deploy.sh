#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Digital Ocean App Platform auto-deploys from the main branch on push.
# This script runs tests, then pushes to main to trigger a deploy.

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "Refusing to deploy: current branch is '$BRANCH', not 'main'."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Refusing to deploy: working tree has uncommitted changes."
  git status --short
  exit 1
fi

echo "==> Running tests..."
./test.sh

echo "==> Pushing to origin/main (triggers Digital Ocean auto-deploy)..."
git push origin main

echo "==> Deploy triggered. Monitor with: doctl apps list && doctl apps logs <app-id> --follow"
