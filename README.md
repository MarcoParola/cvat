# HCVAT

Hierarchical Computer Vision Annotation Tool (HCVAT) is an extension of the original CVAT annotation tool supporting hierarchical annotations.

## Quick start

This project is tested on Ubuntu 24 with Docker 26 and an NVIDIA GPU.

1. Install Docker:
   ```sh
   ./scripts/docker_install.sh
   ```
   After the script finishes, run:
   ```sh
   newgrp docker
   ```
   This makes the current shell use the Docker group so you can run Docker commands without sudo.

2. Start the full development environment:
   ```sh
   ./scripts/dev-clean-start.sh
   ```
   This builds the containers, starts CVAT, and installs the Nuclio/SAM serverless components.

3. Create an admin user:
   ```sh
   docker exec -it cvat_server bash -ic "python manage.py createsuperuser"
   ```

4. Open the app at http://localhost.

## Acknowledgements

Special thanks to all the developers and maintainers of the original CVAT tool.
