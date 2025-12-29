#!/bin/bash
# Build Docker image for Infinity X One Gateway

set -e

VERSION=${1:-latest}
IMAGE_NAME="infinityxone/gateway"

echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"

# Build the image
docker build -t "${IMAGE_NAME}:${VERSION}" .

# Tag as latest if this is a version build
if [ "$VERSION" != "latest" ]; then
  docker tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
fi

echo "✅ Successfully built ${IMAGE_NAME}:${VERSION}"
echo ""
echo "To run the container:"
echo "  docker run -p 8080:8080 ${IMAGE_NAME}:${VERSION}"
echo ""
echo "To push to registry:"
echo "  docker push ${IMAGE_NAME}:${VERSION}"
