#!/bin/bash

# dev-start.sh: Starts the development environment for the Word Add-in.

# Color codes for better output
BLUE="\033[0;34m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${BLUE}🚀 Starting Word Add-in development environment...${NC}"

# --- Add-in Directory Check ---
if [ ! -f "addin-project/package.json" ]; then
    echo -e "${RED}❌ Error: Not in the project root or 'addin-project' is missing.${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory containing 'addin-project'.${NC}"
    exit 1
fi

# --- Execution ---
echo -e "${BLUE}Changing to 'addin-project' directory...${NC}"
cd addin-project || exit

# Decide how to start dev servers. Prefer Doppler if available so secrets
# (e.g. GEMINI_API_KEY) are injected into the environment for webpack.
USE_DOPPLER=false
if command -v doppler &> /dev/null && doppler me &> /dev/null; then
    if [ -f ".doppler.yaml" ]; then
        echo -e "${GREEN}✅ Doppler CLI found and configured. Will run dev server with Doppler.${NC}"
        USE_DOPPLER=true
    else
        echo -e "${YELLOW}⚠️ Doppler CLI found but no .doppler.yaml – falling back to .env if present.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Doppler CLI not found or user not logged in. Using .env file or normal environment.${NC}"
fi

if [ "$USE_DOPPLER" = true ]; then
    COMMAND="doppler run -- npm run dev"
else
    # The 'npm run dev' command starts both the webpack-dev-server and the log-server.
    COMMAND="npm run dev"
fi

echo -e "${GREEN}Executing: $COMMAND${NC}"
echo "--------------------------------------------------"

# The exec command replaces the shell with the new process so signals like Ctrl+C are forwarded.
exec $COMMAND

echo "--------------------------------------------------"
echo -e "${GREEN}✅ Development environment should be running.${NC}"
echo -e "${YELLOW}If you see errors, check the logs above.${NC}"
