#!/bin/bash

# Word Add-in Project Generation Script (Docker-based)
# This script creates the Office Add-in project using Docker container

echo "🏗️  Generating Word Add-in project in Docker container..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the Word Add-in project directory"
    exit 1
fi

# Check if Docker container is built
if ! docker-compose images | grep -q "word-addin-dev"; then
    echo "❌ Development container not found. Please run './setup-environment.sh' first"
    exit 1
fi

# Create project directory
PROJECT_NAME="Word-Review-Add-in"
if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  Project directory '$PROJECT_NAME' already exists"
    read -p "Do you want to remove it and start fresh? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_NAME"
        echo "🗑️  Removed existing project directory"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

echo "� Running yo office in Docker container..."
echo "   - Project type: Office Add-in Task Pane project"
echo "   - Script type: TypeScript"
echo "   - Name: Word-Review-Add-in"
echo "   - Office client: Word"

# Run yo office in Docker container
docker-compose run --rm word-addin-dev bash -c "
  yo office \
    --projectType='taskpane' \
    --name='Word-Review-Add-in' \
    --host='Word' \
    --ts=true \
    --skip-install
"

echo ""
echo "✅ Project generated successfully!"
echo ""
echo "Next steps:"
echo "1. cd $PROJECT_NAME"
echo "2. Run './setup-project-structure.sh' to create our custom folder structure"
echo "3. Run 'npm install' to install dependencies"
