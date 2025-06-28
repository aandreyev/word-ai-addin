#!/bin/bash

# dev-exec.sh: Execute commands in the development container with Doppler secrets
# Usage: ./dev-exec.sh "command to run"
# Example: ./dev-exec.sh "npm install"

# Color codes for better output
BLUE="\033[0;34m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

if [ -z "$1" ]; then
    echo -e "${RED}❌ Usage: ./dev-exec.sh \"command to run\"${NC}"
    echo -e "${BLUE}Example: ./dev-exec.sh \"npm install\"${NC}"
    exit 1
fi

COMMAND="$1"

echo -e "${BLUE}🚀 Executing command in development container...${NC}"

# --- Doppler Integration ---
USE_DOPPLER=false
if command -v doppler &> /dev/null && doppler me &> /dev/null; then
    if [ -f ".doppler.yaml" ]; then
        echo -e "${GREEN}✅ Doppler CLI found and configured.${NC}"
        USE_DOPPLER=true
    else
        echo -e "${YELLOW}⚠️ Doppler CLI is installed but no .doppler.yaml found. Using .env file.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Doppler CLI not found or user not logged in. Using .env file.${NC}"
fi

# Ensure the container is running
if [ -z "$(docker-compose ps -q word-addin-dev)" ] || [ "$(docker-compose ps -q word-addin-dev | xargs docker inspect -f '{{.State.Status}}')" != "running" ]; then
    echo -e "${BLUE}   Starting Docker container...${NC}"
    docker-compose up -d --build
fi

# Execute command with or without Doppler
if [ "$USE_DOPPLER" = true ]; then
    echo -e "${GREEN}🔑 Using Doppler for secrets management${NC}"
    echo -e "${BLUE}   Generating temporary Doppler token...${NC}"

    # Generate a temporary service token for the container
    TOKEN_NAME="temp-dev-token-$(date +%s)"
    DOPPLER_TOKEN=$(doppler configs tokens create "$TOKEN_NAME" --project mswordai --config dev --max-age 15m --plain)
    if [ -z "$DOPPLER_TOKEN" ]; then
        echo -e "${RED}❌ Failed to generate Doppler token. Please check your Doppler login status and permissions.${NC}"
        exit 1
    fi

    # Ensure the token is revoked on exit
    trap 'echo -e "${BLUE}   Revoking temporary Doppler token...${NC}"; doppler configs tokens revoke "$DOPPLER_TOKEN" --project mswordai --config dev --yes &> /dev/null' EXIT

    echo -e "${GREEN}   Executing: $COMMAND${NC}"
    # Execute the command with Doppler token
    docker-compose exec -e DOPPLER_TOKEN="$DOPPLER_TOKEN" word-addin-dev bash -c "doppler run -- $COMMAND"
else
    echo -e "${YELLOW}🔑 Using .env file for environment variables${NC}"
    echo -e "${GREEN}   Executing: $COMMAND${NC}"
    docker-compose exec word-addin-dev bash -c "$COMMAND"
fi

echo -e "${BLUE}✅ Command completed${NC}"
