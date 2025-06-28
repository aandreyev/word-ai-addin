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

# The 'npm run dev' command now starts both the webpack-dev-server (with proxy)
# and the node.js log-server in parallel.
COMMAND="npm run dev"

echo -e "${GREEN}Executing: $COMMAND${NC}"
echo "--------------------------------------------------"

# The exec command replaces the shell with the new process.
# This ensures that signals like Ctrl+C are passed correctly to npm.
exec $COMMAND

echo "--------------------------------------------------"
echo -e "${GREEN}✅ Development environment should be running.${NC}"
echo -e "${YELLOW}If you see errors, check the logs above.${NC}"
