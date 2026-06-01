#!/bin/bash
#
# CVAT Development - Hot Reload Restart
# Use this when you've made a quick restart without rebuilding images.
# This is useful when the services are already built and you need a fresh container start.
#
# Usage: ./scripts/dev-hot-reload.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "CVAT Development - Hot Reload Restart"
echo "========================================="
echo ""

# Step 1: Stop services
echo "[1/3] Stopping services..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              stop

echo "✓ Services stopped"
echo ""

# Step 2: Start services again
echo "[2/3] Starting services..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              up -d

echo "✓ Services started"
echo ""

# Step 3: Wait for services
echo "[3/3] Waiting for services to be ready..."
sleep 5

echo ""
echo "========================================="
echo "✓ CVAT services restarted!"
echo "========================================="
echo ""
echo "This does not rebuild the UI image."
echo "For frontend code changes, use: ./scripts/dev-rebuild-ui.sh"
echo "For backend Python changes, use: ./scripts/dev-clean-start.sh"
echo ""
