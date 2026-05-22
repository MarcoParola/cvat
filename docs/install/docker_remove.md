# Safe Docker Full Removal Script (Ubuntu)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Docker Full Cleanup & Removal ==="

# -------------------------------------------------------------------
# Stop Docker-related services cleanly
# -------------------------------------------------------------------

echo "[1/10] Stopping Docker services..."

sudo systemctl stop docker.service 2>/dev/null || true
sudo systemctl stop docker.socket 2>/dev/null || true
sudo systemctl stop containerd.service 2>/dev/null || true

# Disable services to avoid auto-restart during cleanup
sudo systemctl disable docker.service 2>/dev/null || true
sudo systemctl disable docker.socket 2>/dev/null || true
sudo systemctl disable containerd.service 2>/dev/null || true

# -------------------------------------------------------------------
# Stop all running containers
# -------------------------------------------------------------------

echo "[2/10] Stopping running containers..."

if command -v docker >/dev/null 2>&1; then
    sudo docker ps -aq | xargs -r sudo docker stop
fi

# -------------------------------------------------------------------
# Remove containers/images/volumes/networks
# -------------------------------------------------------------------

echo "[3/10] Removing Docker resources..."

if command -v docker >/dev/null 2>&1; then
    sudo docker system prune -af --volumes
fi

# -------------------------------------------------------------------
# Remove Docker packages
# -------------------------------------------------------------------

echo "[4/10] Purging Docker packages..."

sudo apt-get purge -y \
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

# -------------------------------------------------------------------
# Remove Docker repository files
# -------------------------------------------------------------------

echo "[5/10] Removing Docker apt repositories..."

sudo rm -f /etc/apt/sources.list.d/docker.list
sudo rm -f /etc/apt/sources.list.d/docker-ce.list

sudo rm -f /etc/apt/keyrings/docker.asc
sudo rm -f /etc/apt/keyrings/docker.gpg

# -------------------------------------------------------------------
# Remove Docker runtime/data directories
# -------------------------------------------------------------------

echo "[6/10] Removing Docker data directories..."

sudo rm -rf /var/lib/docker
sudo rm -rf /etc/docker

# -------------------------------------------------------------------
# Remove containerd ONLY if Kubernetes is NOT installed
# -------------------------------------------------------------------

echo "[7/10] Checking for Kubernetes before removing containerd..."

if command -v kubectl >/dev/null 2>&1 || \
   systemctl list-units --type=service | grep -qi 'kube\|k3s\|microk8s'; then

    echo "WARNING: Kubernetes-related services detected."
    echo "Skipping removal of /var/lib/containerd to avoid breaking Kubernetes networking."

else
    echo "No Kubernetes detected. Removing containerd data..."
    sudo rm -rf /var/lib/containerd
fi

# -------------------------------------------------------------------
# Clean leftover Docker networking
# -------------------------------------------------------------------

echo "[8/10] Cleaning Docker network interfaces..."

if ip link show docker0 >/dev/null 2>&1; then
    sudo ip link delete docker0 || true
fi

# Remove dangling bridge interfaces created by Docker
for iface in $(ip -o link show | awk -F': ' '{print $2}' | grep '^br-' || true); do
    sudo ip link delete "$iface" 2>/dev/null || true
done

# -------------------------------------------------------------------
# Remove stale iptables chains (safe attempt)
# -------------------------------------------------------------------

echo "[9/10] Cleaning old Docker firewall rules..."

sudo iptables -t nat -F DOCKER 2>/dev/null || true
sudo iptables -t filter -F DOCKER 2>/dev/null || true
sudo iptables -t filter -F DOCKER-USER 2>/dev/null || true

sudo iptables -t nat -X DOCKER 2>/dev/null || true
sudo iptables -t filter -X DOCKER 2>/dev/null || true
sudo iptables -t filter -X DOCKER-USER 2>/dev/null || true

# nftables cleanup (safe/no-op if unused)
sudo nft delete table ip docker 2>/dev/null || true

# -------------------------------------------------------------------
# Remove docker group safely
# -------------------------------------------------------------------

if getent group docker >/dev/null 2>&1; then
    echo "Removing docker group..."
    sudo groupdel docker || true
fi

# -------------------------------------------------------------------
# Cleanup apt cache
# -------------------------------------------------------------------

echo "[10/10] Cleaning apt cache..."

sudo apt-get autoremove -y
sudo apt-get autoclean

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
sudo ss -tulpn || true

echo
echo "Cleanup complete."
```
