#!/bin/bash
#
# CVAT Development - View Logs
# Displays logs from all CVAT services
#
# Usage: ./scripts/dev-logs.sh [container-name]
# Examples:
#   ./scripts/dev-logs.sh                    # All services
#   ./scripts/dev-logs.sh cvat_server        # Just backend
#   ./scripts/dev-logs.sh postgres           # Just database
#
# Add -f flag to follow logs in real-time: ./scripts/dev-logs.sh -f
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

docker compose -f "$PROJECT_ROOT/docker-compose.yml" \
              -f "$PROJECT_ROOT/docker-compose.dev.yml" \
              -f "$PROJECT_ROOT/components/serverless/docker-compose.serverless.yml" \
              logs "$@"
