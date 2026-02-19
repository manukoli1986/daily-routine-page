#!/usr/bin/env bash
# ============================================================================
# docker-build.sh — Multi-Architecture Docker Build Script
# ============================================================================
# Builds container images for multiple platforms using Docker Buildx.
#
# Supported platforms:
#   - linux/amd64   (standard x86_64 servers, Intel/AMD Macs)
#   - linux/arm64   (Apple Silicon Macs, AWS Graviton, ARM servers)
#   - linux/arm/v7  (Raspberry Pi, IoT devices)
#
# Usage:
#   ./docker-build.sh local                     Build for current platform only
#   ./docker-build.sh push <registry/image:tag>  Build multi-arch & push to registry
#   ./docker-build.sh inspect <image:tag>        Inspect a multi-arch image manifest
# ============================================================================

set -euo pipefail

IMAGE_NAME="daily-routine-page"
PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"
BUILDER_NAME="multiarch-builder"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}ℹ️  $*${NC}"; }
ok()    { echo -e "${GREEN}✅ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $*${NC}"; }
error() { echo -e "${RED}❌ $*${NC}" >&2; exit 1; }

# Ensure docker buildx is available
check_buildx() {
    if ! docker buildx version &>/dev/null; then
        error "Docker Buildx is not available. Please install Docker Desktop or enable buildx."
    fi
    info "Docker Buildx version: $(docker buildx version)"
}

# Create or reuse a multi-arch builder instance
ensure_builder() {
    if docker buildx inspect "$BUILDER_NAME" &>/dev/null; then
        info "Using existing builder: $BUILDER_NAME"
    else
        info "Creating new builder: $BUILDER_NAME"
        docker buildx create --name "$BUILDER_NAME" --driver docker-container --bootstrap
        ok "Builder created and bootstrapped"
    fi
    docker buildx use "$BUILDER_NAME"
}

# Build for current platform only (loaded into local docker)
build_local() {
    info "Building for current platform only..."
    check_buildx

    docker buildx build \
        --load \
        -t "${IMAGE_NAME}:latest" \
        .

    ok "Local build complete: ${IMAGE_NAME}:latest"
    echo ""
    info "Run with: docker run -p 3000:3000 ${IMAGE_NAME}:latest"
}

# Build for multiple platforms and push to registry
build_push() {
    local tag="${1:?Error: Please provide a full image tag, e.g. 'myregistry/daily-routine-page:v1.0'}"

    info "Building multi-arch image for platforms: $PLATFORMS"
    check_buildx
    ensure_builder

    docker buildx build \
        --platform "$PLATFORMS" \
        --push \
        -t "$tag" \
        .

    ok "Multi-arch image pushed: $tag"
    echo ""
    info "Inspect with: docker buildx imagetools inspect $tag"
}

# Inspect a multi-arch image manifest
inspect_image() {
    local tag="${1:?Error: Please provide an image tag to inspect}"
    info "Inspecting image manifest: $tag"
    docker buildx imagetools inspect "$tag"
}

# Print usage
usage() {
    cat <<EOF
Usage: $(basename "$0") <command> [options]

Commands:
  local                      Build for current platform only (loads into local Docker)
  push <registry/image:tag>  Build for all platforms and push to a container registry
  inspect <image:tag>        Inspect a multi-arch image manifest

Supported platforms: $PLATFORMS

Examples:
  $(basename "$0") local
  $(basename "$0") push docker.io/myuser/daily-routine-page:v1.0
  $(basename "$0") push ghcr.io/manukoli1986/daily-routine-page:latest
  $(basename "$0") inspect ghcr.io/manukoli1986/daily-routine-page:latest
EOF
}

# Main
case "${1:-}" in
    local)   build_local ;;
    push)    build_push "${2:-}" ;;
    inspect) inspect_image "${2:-}" ;;
    -h|--help|help) usage ;;
    *) usage; exit 1 ;;
esac
