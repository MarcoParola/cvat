#!/bin/bash
#
# CVAT Development - Stop Services
# Stops all CVAT services (containers keep running in stopped state for inspection)
#
# Usage: ./scripts/dev-stop.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Stopping CVAT services..."

docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              stop

# Nuclio function containers (e.g. SAM) are created by the Nuclio dashboard,
# not by docker compose, so they need to be stopped separately.
NUCLIO_FUNCTIONS=$(docker ps -q --filter "label=nuclio.io/function-name")
if [ -n "$NUCLIO_FUNCTIONS" ]; then
    echo "Stopping Nuclio function containers..."
    docker stop $NUCLIO_FUNCTIONS > /dev/null
fi

echo "✓ All services stopped"
echo ""
echo "To start again: ./scripts/dev-hot-reload.sh"
echo "To do a full clean restart: ./scripts/dev-clean-start.sh"
