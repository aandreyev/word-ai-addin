#!/bin/bash

# Word Add-in Development Environment Setup Script (Docker-based)
# This script sets up the Docker-based development environment for the AI Document Review Add-in

echo "🚀 Setting up Word Add-in development environment (Docker)..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/desktop/install/mac-install/"
    exit 1
fi

echo "✅ Docker found: $(docker --version)"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "❌ Docker Compose is not available"
    exit 1
fi

echo "✅ Docker Compose available"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker daemon is running"

# Build the development container
echo "🏗️  Building development container..."
docker-compose build

echo "✅ Development container built successfully"

# Create Word sideload directory if it doesn't exist
SIDELOAD_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"
if [ ! -d "$SIDELOAD_DIR" ]; then
    echo "📁 Creating Word sideload directory..."
    mkdir -p "$SIDELOAD_DIR"
    echo "✅ Sideload directory created: $SIDELOAD_DIR"
else
    echo "✅ Sideload directory exists: $SIDELOAD_DIR"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run './generate-project.sh' to create the Office Add-in project"
echo "2. Follow the prompts to configure your project"
