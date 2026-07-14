# HCVAT

<<<<<<< HEAD
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
=======
Hierarchical Computer Vision Annotation Tool (HCVAT) is an extension of the original [CVAT annotation](https://github.com/cvat-ai/cvat) tool supporting hierarchical annotations.
It requires:
* Docker 26.0
* An NVIDIA gpu

It runs on Ubuntu (tested on Ubuntu 24). HCVAT requires **Docker** 26.*.
Instructions for docker installations and CVAT deployment are available [here](./docs/install/docker_install.md).


After Docker 26.0 installation, go through the following **3 steps** to have everything ready.
>>>>>>> f9e71b3271b2cb4d52dd6577e9b173112b51e3d7

2. Start the full development environment:
   ```sh
   ./scripts/dev-clean-start.sh
   ```
   This builds the containers, starts CVAT, and installs the Nuclio/SAM serverless components.

<<<<<<< HEAD
3. Create an admin user:
   ```sh
   docker exec -it cvat_server bash -ic "python manage.py createsuperuser"
   ```

4. Open the app at http://localhost.

## Acknowledgements

Special thanks to all the developers and maintainers of the original CVAT tool.
=======
## 1. Create a SAM docker container
You need SAM as model to automate the annotation process.
Create nuctl project and deploy it by running:

```sh
sudo curl -sSL \
  "https://github.com/nuclio/nuclio/releases/download/1.15.9/nuctl-1.15.9-linux-amd64" \
  -o /usr/local/bin/nuctl

sudo chmod +x /usr/local/bin/nuctl
nuctl version

nuctl create project cvat --platform local
nuctl get projects --platform local

nuctl deploy \
  --project-name cvat \
  --path serverless/pytorch/facebookresearch/sam/nuclio \
  --platform local

nuctl get functions --platform local
```


## 2. Deploy the HCVAT docker containers

Run the following script to deploy all the docker containers composing the HCVAT project.
```sh
./scripts/dev-clean-start.sh
```

## 3. Create a user account and annotate

Create a fake user account as admin user for CVAT:
```sh
docker exec -it cvat_server bash -ic \
  "python manage.py createsuperuser"
```

Finally, you can connect to http://localhost:8080 and enjoy the annotation task ;D

## Acknowledgement
Special thanks to all the developers and maintainers of the [original CVAT tool](https://github.com/cvat-ai/cvat).
>>>>>>> f9e71b3271b2cb4d52dd6577e9b173112b51e3d7
