#!/usr/bin/env bash

set -euo pipefail

confirm_removal() {
    if [[ "${1:-}" == "--yes" || "${FORCE_DOCKER_CLEAN:-}" == "1" ]]; then
        return
    fi

    cat <<'EOF'
=== Docker Full Cleanup & Removal ===

WARNING: this removes Docker from this machine, including:
  - all Docker containers, images, volumes, and networks
  - Docker packages
  - /var/lib/docker and /etc/docker
  - the docker group, if present

For a CVAT-only cleanup, use ./scripts/dev-clean-start.sh instead.
EOF

    read -r -p "Type DELETE DOCKER to continue: " confirmation
    if [[ "$confirmation" != "DELETE DOCKER" ]]; then
        echo "Aborted."
        exit 1
    fi
}

run_as_root() {
    if [[ "$(id -u)" -eq 0 ]]; then
        "$@"
    else
        sudo "$@"
    fi
}

have_command() {
    command -v "$1" >/dev/null 2>&1
}

confirm_removal "${1:-}"

echo "=== Docker Full Cleanup & Removal ==="

# -------------------------------------------------------------------
# Stop running containers while the Docker daemon is still available
# -------------------------------------------------------------------

echo "[1/10] Stopping running containers..."

if have_command docker && run_as_root docker info >/dev/null 2>&1; then
    mapfile -t containers < <(run_as_root docker ps -aq 2>/dev/null || true)

    if [[ "${#containers[@]}" -gt 0 ]]; then
        run_as_root docker stop "${containers[@]}" || true
    else
        echo "No containers to stop."
    fi
else
    echo "Docker daemon is not reachable; skipping container stop."
fi

# -------------------------------------------------------------------
# Remove containers/images/volumes/networks
# -------------------------------------------------------------------

echo "[2/10] Removing Docker resources..."

if have_command docker && run_as_root docker info >/dev/null 2>&1; then
    run_as_root docker system prune -af --volumes || true
else
    echo "Docker daemon is not reachable; skipping docker system prune."
fi

# -------------------------------------------------------------------
# Stop Docker-related services cleanly
# -------------------------------------------------------------------

echo "[3/10] Stopping Docker services..."

if have_command systemctl; then
    run_as_root systemctl stop docker.service 2>/dev/null || true
    run_as_root systemctl stop docker.socket 2>/dev/null || true
    run_as_root systemctl stop containerd.service 2>/dev/null || true

    # Disable services to avoid auto-restart during cleanup
    run_as_root systemctl disable docker.service 2>/dev/null || true
    run_as_root systemctl disable docker.socket 2>/dev/null || true
    run_as_root systemctl disable containerd.service 2>/dev/null || true
else
    echo "systemctl not found; skipping service stop/disable."
fi

# -------------------------------------------------------------------
# Remove Docker packages
# -------------------------------------------------------------------

echo "[4/10] Purging Docker packages..."

if have_command apt-get; then
    run_as_root apt-get purge -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin \
        docker-compose \
        docker.io \
        docker-doc \
        docker-registry \
        podman-docker \
        runc \
        moby-engine \
        moby-cli \
        || true
else
    echo "apt-get not found; skipping package purge."
fi

# -------------------------------------------------------------------
# Remove Docker repository files
# -------------------------------------------------------------------

echo "[5/10] Removing Docker apt repositories..."

run_as_root rm -f /etc/apt/sources.list.d/docker.list
run_as_root rm -f /etc/apt/sources.list.d/docker-ce.list

run_as_root rm -f /etc/apt/keyrings/docker.asc
run_as_root rm -f /etc/apt/keyrings/docker.gpg

# -------------------------------------------------------------------
# Remove Docker runtime/data directories
# -------------------------------------------------------------------

echo "[6/10] Removing Docker data directories..."

run_as_root rm -rf /var/lib/docker
run_as_root rm -rf /etc/docker

# -------------------------------------------------------------------
# Remove containerd ONLY if Kubernetes is NOT installed
# -------------------------------------------------------------------

echo "[7/10] Checking for Kubernetes before removing containerd..."

kubernetes_detected=false
if have_command kubectl; then
    kubernetes_detected=true
elif have_command systemctl && systemctl list-units --type=service --all 2>/dev/null | grep -Eqi 'kube|k3s|microk8s'; then
    kubernetes_detected=true
fi

if [[ "$kubernetes_detected" == "true" ]]; then

    echo "WARNING: Kubernetes-related services detected."
    echo "Skipping removal of /var/lib/containerd to avoid breaking Kubernetes networking."

else
    echo "No Kubernetes detected. Removing containerd data..."
    run_as_root rm -rf /var/lib/containerd
fi

# -------------------------------------------------------------------
# Clean leftover Docker networking
# -------------------------------------------------------------------

echo "[8/10] Cleaning Docker network interfaces..."

if have_command ip && ip link show docker0 >/dev/null 2>&1; then
    run_as_root ip link delete docker0 || true
fi

# Remove dangling bridge interfaces created by Docker
if have_command ip; then
    mapfile -t bridge_interfaces < <(ip -o link show | awk -F': ' '{print $2}' | grep '^br-' || true)

    for iface in "${bridge_interfaces[@]}"; do
        run_as_root ip link delete "$iface" 2>/dev/null || true
    done
else
    echo "ip command not found; skipping network interface cleanup."
fi

# -------------------------------------------------------------------
# Remove stale iptables chains (safe attempt)
# -------------------------------------------------------------------

echo "[9/10] Cleaning old Docker firewall rules..."

if have_command iptables; then
    run_as_root iptables -t nat -F DOCKER 2>/dev/null || true
    run_as_root iptables -t filter -F DOCKER 2>/dev/null || true
    run_as_root iptables -t filter -F DOCKER-USER 2>/dev/null || true

    run_as_root iptables -t nat -X DOCKER 2>/dev/null || true
    run_as_root iptables -t filter -X DOCKER 2>/dev/null || true
    run_as_root iptables -t filter -X DOCKER-USER 2>/dev/null || true
else
    echo "iptables not found; skipping iptables cleanup."
fi

# nftables cleanup (safe/no-op if unused)
if have_command nft; then
    run_as_root nft delete table ip docker 2>/dev/null || true
fi

# -------------------------------------------------------------------
# Remove docker group safely
# -------------------------------------------------------------------

if getent group docker >/dev/null 2>&1; then
    echo "Removing docker group..."
    run_as_root groupdel docker || true
fi

# -------------------------------------------------------------------
# Cleanup apt cache
# -------------------------------------------------------------------

echo "[10/10] Cleaning apt cache..."

if have_command apt-get; then
    run_as_root apt-get autoremove -y
    run_as_root apt-get autoclean
else
    echo "apt-get not found; skipping apt cache cleanup."
fi

# -------------------------------------------------------------------
# Verification
# -------------------------------------------------------------------

echo
echo "=== Verification ==="

if command -v docker >/dev/null 2>&1; then
    echo "WARNING: docker binary still exists"
else
    echo "OK: docker removed"
fi

echo
echo "Remaining listening ports:"
if have_command ss; then
    run_as_root ss -tulpn || true
else
    echo "ss not found; skipping port listing."
fi

echo
echo "Cleanup complete."
