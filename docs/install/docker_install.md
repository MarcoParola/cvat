# Install Docker

Install Docker 26.0 from `apt`. Note: we can not ensure that HCVAT runs on Docker from `snap`.
```sh
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

sudo usermod -aG docker $USER
sudo systemctl enable --now docker
newgrp docker

docker --version        # Should show 26.0.0
docker compose version  # Should show v2.x

# Create the group if it doesn't exist
sudo groupadd docker
# Add your current user to the docker group
sudo usermod -aG docker $USER

# Unmask and enable containerd
sudo systemctl unmask containerd
sudo systemctl enable --now containerd
# Enable and start Docker
sudo systemctl enable --now docker

newgrp docker
```