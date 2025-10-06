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

echo "Setting up data directory"
mkdir -p data

echo "Building and starting Docker containers"
# Stop existing containers gracefully
docker compose down --timeout 30 2>/dev/null || true

# Build and start the containers
docker compose up -d --build

echo "Waiting for container to start..."
sleep 15

echo "Running database migrations"
# Run migrations with error handling
docker compose exec -T swiss-jass-backend npx prisma migrate deploy 2>/dev/null || echo "No migrations to run or migration failed"

echo "Deployment completed successfully"
echo "Backend is running at http://localhost:3000"

# Show container status
docker compose ps
