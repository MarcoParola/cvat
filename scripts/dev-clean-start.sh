#!/bin/bash
#
# CVAT Development - Full Clean Start
# Use this after significant code changes or when you suspect container stale state
# This completely removes all CVAT containers, networks, and images, then starts fresh
#
# Usage: ./scripts/dev-clean-start.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "CVAT Development - Full Clean Start"
echo "========================================="
echo ""

# Step 1: Stop all CVAT containers
echo "[1/7] Stopping all CVAT containers..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              down --remove-orphans || true

echo "✓ Containers stopped"
echo ""

# Step 2: Remove any lingering CVAT containers and images
echo "[2/7] Removing lingering CVAT containers and images..."
docker container prune -f --filter "label!=keep" 2>/dev/null || true
docker images | grep -E "(cvat|nuclio)" | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

echo "✓ Cleanup complete"
echo ""

# Step 3: Create/ensure network exists
echo "[3/7] Creating cvat network..."
docker network create cvat 2>/dev/null || echo "Network already exists"

echo "✓ Network ready"
echo ""

# Step 4: Build backend and frontend (required on first run and after code changes)
echo "[4/7] Building backend and UI images (this may take a few minutes)..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              build cvat_server cvat_ui

echo "✓ Backend and UI built"
echo ""

# Step 5: Start all services
echo "[5/7] Starting all services..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              up -d

echo "✓ Services started"
echo ""

# Step 6: Install/refresh Nuclio and SAM if needed
echo "[6/7] Ensuring Nuclio and SAM are installed..."
"$PROJECT_ROOT/scripts/install_nuclio_sam.sh"

echo "✓ Nuclio and SAM ready"
echo ""

# Step 7: Wait for services to be ready and display status
echo "[7/7] Waiting for services to be ready..."
sleep 5

echo ""
echo "========================================="
echo "✓ CVAT is starting up!"
echo "========================================="
echo ""
echo "Connection details:"
echo "  • Frontend:  http://localhost"
echo "  • API:       http://localhost:7000"
echo "  • Postgres:  localhost:5432 (from host)"
echo ""
echo "Check service status:"
echo "  docker compose -f docker-compose.yml -f docker-compose.dev.yml -f components/serverless/docker-compose.serverless.yml ps"
echo ""
echo "View logs:"
echo "  ./scripts/dev-logs.sh"
echo ""
echo "Wait 30-60 seconds for all services to fully initialize, then visit http://localhost"
echo ""
