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

# Nuclio function containers (e.g. SAM) are created by the Nuclio dashboard,
# not by docker compose, so they need to be stopped separately.
RUNNING_NUCLIO_FUNCTIONS=$(docker ps -q --filter "label=nuclio.io/function-name")
if [ -n "$RUNNING_NUCLIO_FUNCTIONS" ]; then
    docker stop $RUNNING_NUCLIO_FUNCTIONS > /dev/null
fi

echo "✓ Services stopped"
echo ""

# Step 2: Start services again
echo "[2/3] Starting services..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              up -d

# Start all deployed Nuclio functions, including ones already stopped
# beforehand (e.g. by dev-stop.sh)
NUCLIO_FUNCTIONS=$(docker ps -aq --filter "label=nuclio.io/function-name")
if [ -n "$NUCLIO_FUNCTIONS" ]; then
    docker start $NUCLIO_FUNCTIONS > /dev/null
fi

echo "✓ Services started"
echo ""

# Step 3: Wait for services
echo "[3/3] Waiting for services to be ready..."
sleep 5

# Nuclio functions only start serving HTTP once init_context has finished
# (SAM loads a ~2.5GB checkpoint), so wait until each one answers a request.
NUCLIO_TIMEOUT=300
for CONTAINER in $NUCLIO_FUNCTIONS; do
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER" | sed 's|^/||')
    PORT=$(docker port "$CONTAINER" | head -n 1 | sed 's/.*://')
    if [ -z "$PORT" ]; then
        echo "  ! $NAME has no published port, skipping readiness check"
        continue
    fi

    echo "  Waiting for $NAME on port $PORT..."
    ELAPSED=0
    # curl prints 000 until the function actually answers with an HTTP response
    until [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$PORT" || true)" != "000" ]; do
        if [ "$(docker inspect --format '{{.State.Running}}' "$CONTAINER")" != "true" ]; then
            echo "  ✗ $NAME is not running. Check: docker logs $NAME"
            exit 1
        fi
        if [ "$ELAPSED" -ge "$NUCLIO_TIMEOUT" ]; then
            echo "  ✗ $NAME not ready after ${NUCLIO_TIMEOUT}s. Check: docker logs $NAME"
            exit 1
        fi
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    done
    echo "  ✓ $NAME ready"
done

echo ""
echo "========================================="
echo "✓ CVAT services restarted!"
echo "========================================="
echo ""
echo "This does not rebuild the UI image."
echo "For frontend code changes, use: ./scripts/dev-rebuild-ui.sh"
echo "For backend Python changes, use: ./scripts/dev-clean-start.sh"
echo ""
