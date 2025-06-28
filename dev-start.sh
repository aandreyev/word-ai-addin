#!/bin/bash

# dev-start.sh: Starts the development environment.
# This script handles two main scenarios:
# 1. Using Doppler for secret management (recommended).
# 2. Falling back to a local .env file if Doppler is not used.

# Color codes for better output
BLUE="\033[0;34m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${BLUE}🚀 Starting Word Add-in development environment...${NC}"

# --- Doppler Integration ---
USE_DOPPLER=false
if command -v doppler &> /dev/null && doppler me &> /dev/null; then
    if [ -f ".doppler.yaml" ]; then
        echo -e "${GREEN}✅ Doppler CLI found and configured.${NC}"
        USE_DOPPLER=true
    else
        echo -e "${YELLOW}⚠️ Doppler CLI is installed but no .doppler.yaml found. Falling back to .env file.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Doppler CLI not found or user not logged in. Falling back to .env file.${NC}"
fi
# --- Docker Verification ---
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker and try again.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Ensure the container is running
if [ -z "$(docker-compose ps -q word-addin-dev)" ] || [ "$(docker-compose ps -q word-addin-dev | xargs docker inspect -f '{{.State.Status}}')" != "running" ]; then
    echo -e "${BLUE}   Starting Docker container...${NC}"
    docker-compose up -d --build
fi

echo -e "${BLUE}   Container is running. Entering development shell...${NC}"
echo -e "${BLUE}   Use 'exit' to leave the development environment${NC}"

# Start development shell with or without Doppler
if [ "$USE_DOPPLER" = true ]; then
    echo -e "${GREEN}🔑 Using Doppler for secrets management${NC}"
    echo -e "${BLUE}   Generating temporary Doppler token...${NC}"

    # Generate a temporary service token for the container
    # The token name is a positional argument
    TOKEN_NAME="temp-dev-token-$(date +%s)"
    DOPPLER_TOKEN=$(doppler configs tokens create "$TOKEN_NAME" --project mswordai --config dev --max-age 15m --plain)
    if [ -z "$DOPPLER_TOKEN" ]; then
        echo -e "${RED}❌ Failed to generate Doppler token. Please check your Doppler login status and permissions.${NC}"
        exit 1
    fi

    # Ensure the token is revoked on exit
    # The revoke command takes the token itself, not the name.
    trap 'echo -e "${BLUE}   Revoking temporary Doppler token...${NC}"; doppler configs tokens revoke "$DOPPLER_TOKEN" --project mswordai --config dev --yes &> /dev/null' EXIT

    echo -e "${GREEN}   Token generated. Entering container...${NC}"
    # Pass the token to the container and start an interactive shell
    # Inside the container, `doppler run` will now be authenticated with this token.
    docker-compose exec -e DOPPLER_TOKEN="$DOPPLER_TOKEN" word-addin-dev bash -c "echo '✅ Doppler token injected. Run commands with \`doppler run -- your_command\` to access secrets.'; echo 'For example: doppler run -- printenv | grep GEMINI_API_KEY'; bash"
else
    echo -e "${YELLOW}🔑 Using .env file for environment variables${NC}"
    docker-compose exec word-addin-dev bash
fi

echo -e "${BLUE}👋 Exited development environment${NC}"
