#!/usr/bin/env bash
set -euo pipefail

DEFAULT_ROOT="${HOME}/apps/swiss-jass-app"
APP_ROOT="${1:-$DEFAULT_ROOT}"
REPO_URL="${2:-https://github.com/JRudyRay/swiss-jass-app.git}"
BRANCH="${3:-main}"

if [[ ! -d "${APP_ROOT}" ]]; then
  echo "Creating application directory at ${APP_ROOT}"
  mkdir -p "${APP_ROOT}"
fi

if [[ ! -d "${APP_ROOT}/.git" ]]; then
  echo "Repository not found at ${APP_ROOT}; cloning ${REPO_URL}"
  git clone "${REPO_URL}" "${APP_ROOT}"
fi

cd "${APP_ROOT}"

echo "Updating repository to ${BRANCH}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "Installing backend dependencies"
cd backend
npm ci

echo "Building backend"
npm run build

if command -v pm2 >/dev/null 2>&1; then
  echo "Restarting backend with pm2"
  pm2 describe swiss-jass-backend >/dev/null 2>&1 \
    && pm2 restart swiss-jass-backend --update-env \
    || pm2 start dist/index.js --name swiss-jass-backend --update-env
else
  echo "pm2 not found; starting backend directly (blocking)"
  node dist/index.js
fi
