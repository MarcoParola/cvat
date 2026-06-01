#!/bin/bash
#
# CVAT Development - Rebuild UI
# Rebuilds the cvat_ui Docker image and recreates the UI container.
# Use this after changing UI source files under cvat-ui/src/.
#
# Usage: ./scripts/dev-rebuild-ui.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "CVAT Development - Rebuild UI"
echo "========================================="
echo ""

echo "[1/3] Building cvat_ui image..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              build cvat_ui

echo "✓ UI image built"
echo ""

echo "[2/3] Recreating cvat_ui container..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              up -d --force-recreate cvat_ui

echo "✓ UI container recreated"
echo ""

echo "[3/3] Waiting for UI service to restart..."
sleep 5

echo ""
echo "========================================="
echo "✓ UI rebuild complete"
echo "========================================="
echo ""
echo "Visit http://localhost and hard-refresh the page if needed."
