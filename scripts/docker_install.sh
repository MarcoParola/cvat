#!/usr/bin/env bash
set -euo pipefail

echo "Installing Docker 26 (tested on Ubuntu 24)..."

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu noble stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

sudo apt-get install -y \
  docker-ce=5:26.0.0-1~ubuntu.24.04~noble \
  docker-ce-cli=5:26.0.0-1~ubuntu.24.04~noble \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

sudo apt-mark hold docker-ce docker-ce-cli

# Ensure docker group exists and add the current user
sudo groupadd -f docker
sudo usermod -aG docker "$USER"

service_exists() {
  systemctl list-unit-files --type=service "$1" --no-legend 2>/dev/null | awk '{print $1}' | grep -qx "$1"
}

echo "Enabling Docker services..."
sudo systemctl daemon-reload || true

if service_exists containerd.service; then
  sudo systemctl unmask containerd.service || true
  sudo systemctl enable --now containerd.service
else
  echo "containerd.service was not found; skipping separate containerd enable."
fi

if service_exists docker.service; then
  sudo systemctl unmask docker.service || true
  sudo systemctl enable --now docker.service
else
  echo "docker.service was not found after package installation." >&2
  exit 1
fi

echo "Installation finished."
echo "Run 'newgrp docker' now (or log out/in) to apply the docker group membership changes."
echo "This avoids needing sudo for docker commands in a new shell."
docker --version || true
docker compose version || true

echo "If Docker is not active, try: sudo systemctl enable --now docker.service"
