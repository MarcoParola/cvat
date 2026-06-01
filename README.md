# HCVAT

Hierarchical Computer Vision Annotation Tool (HCVAT) is an extension of the original [CVAT annotation](https://github.com/cvat-ai/cvat) tool supporting hierarchical annotaitons.
It requires:
* Docker 26.0
* An NVIDIA gpu

## Install Docker 26.0
It runs on Ubuntu (tested on Ubuntu 24). HCVAT requires **Docker** 26.*.
Instructions for docker installations and CVAT deployment are available [here](./docs/install/docker_install.md). If you already have a different version installed, we recommend to first uninstall the current instance using following [this guide](./docs/install/docker_remove.md) and, then, proceed with the installation of Docker 26.

## Setup and deploy HCVAT
Once the right Docker version has been installed, follow [this instructions](./docs/install/docker_install.md) to setup and deploy HCVAT locally.

## Annotate with HCVAT
After deployed, HCVAT supports the hierarchical annotations process using SAM. Details about how import predefined labels and proceed with the annotation task can be found [here](./docs/annotate/README).


## Acknowledgement
Special thanks to all the developers and maintainers of the [original CVAT tool](https://github.com/cvat-ai/cvat).