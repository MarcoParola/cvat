#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if ! command -v nuctl >/dev/null 2>&1; then
  echo "Installing nuctl..."
  sudo curl -fsSL \
    "https://github.com/nuclio/nuclio/releases/download/1.15.9/nuctl-1.15.9-linux-amd64" \
    -o /usr/local/bin/nuctl
  sudo chmod +x /usr/local/bin/nuctl
fi

nuctl version

echo "Ensuring Docker network 'cvat' exists..."
docker network create cvat 2>/dev/null || echo "Network already exists"

echo "Starting the Nuclio serverless stack..."
docker compose \
  -f "$PROJECT_ROOT/docker-compose.yml" \
  -f "$PROJECT_ROOT/docker-compose.dev.yml" \
  -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
  up -d

echo "Ensuring the local nuctl project exists..."
if ! nuctl get projects --platform local 2>/dev/null | grep -Eq "^[[:space:]]*cvat[[:space:]]"; then
  nuctl create project cvat --platform local
fi

echo "Deploying the SAM function..."
nuctl deploy \
  --project-name cvat \
  --path "$PROJECT_ROOT/serverless/pytorch/facebookresearch/sam/nuclio" \
  --platform local

echo "Nuclio and SAM setup completed."
echo "Check status with:"
echo "  nuctl get functions --platform local"
echo "  docker compose -f docker-compose.yml -f docker-compose.dev.yml -f components/serverless/docker-compose.serverless.yml ps"
