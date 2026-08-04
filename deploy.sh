#!/usr/bin/env bash
# ==============================================================================
# Enterprise AI Fabric - Deployment Script
# Automatically ensures the shared Docker network 'llm-infra-net' exists
# before bringing up Docker Compose stacks.
# ==============================================================================

set -e

NETWORK_NAME="llm-infra-net"

echo "======================================================================"
echo "🚀 ENTERPRISE AI FABRIC DEPLOYER"
echo "======================================================================"

# 1. Check and create the shared network bridge if not present
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "🌐 Docker network '$NETWORK_NAME' not found."
    echo "⚙️ Creating Docker bridge network '$NETWORK_NAME'..."
    docker network create --driver bridge "$NETWORK_NAME"
    echo "✅ Successfully created network '$NETWORK_NAME'."
else
    echo "✅ Docker bridge network '$NETWORK_NAME' already exists."
fi

# 2. Determine target compose file based on argument
MODE="${1:-app}"

case "$MODE" in
    app)
        echo "📦 Deploying App Stack (docker-compose.app.yml)..."
        docker compose -f docker-compose.app.yml up -d --build
        ;;
    infra)
        echo "🏗️ Deploying CPU Infrastructure Stack (docker-compose.infra.yml)..."
        docker compose -f docker-compose.infra.yml up -d
        ;;
    infra-gpu)
        echo "⚡ Deploying GPU Infrastructure Stack (docker-compose.infra-gpu.yml)..."
        docker compose -f docker-compose.infra-gpu.yml up -d
        ;;
    all)
        echo "🏗️ Deploying CPU Infrastructure Stack (docker-compose.infra.yml)..."
        docker compose -f docker-compose.infra.yml up -d
        echo "📦 Deploying App Stack (docker-compose.app.yml)..."
        docker compose -f docker-compose.app.yml up -d --build
        ;;
    all-gpu)
        echo "⚡ Deploying GPU Infrastructure Stack (docker-compose.infra-gpu.yml)..."
        docker compose -f docker-compose.infra-gpu.yml up -d
        echo "📦 Deploying App Stack (docker-compose.app.yml)..."
        docker compose -f docker-compose.app.yml up -d --build
        ;;
    *)
        echo "❌ Unknown deployment mode: '$MODE'"
        echo "Usage: ./deploy.sh [app|infra|infra-gpu|all|all-gpu]"
        exit 1
        ;;
esac

echo "======================================================================"
echo "🎉 Deployment complete!"
echo "======================================================================"
