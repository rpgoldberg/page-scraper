#!/bin/bash
# WSL Path Fix Script for Page Scraper Jest Testing
# This script bypasses UNC path issues when running tests in WSL

# Force proper working directory and ensure we're using WSL native tools
cd "$(dirname "$0")"
export CURRENT_DIR="$(pwd)"

# Set environment variables to force Node.js path resolution
export NODE_PATH="$CURRENT_DIR/node_modules"
export PWD="$CURRENT_DIR"

# Force npm to use WSL paths and avoid Windows path conflicts
export npm_config_cache="$CURRENT_DIR/.npm-cache"
export npm_config_prefix="$CURRENT_DIR/.npm-global"
export npm_config_fund=false
export npm_config_audit=false

echo "Current directory: $CURRENT_DIR"
echo "Installing dependencies with proper path resolution..."

# Install dependencies with ignore-scripts to avoid UNC path issues
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/jest" ]; then
    echo "Installing dependencies..."
    npm install --ignore-scripts
    npm rebuild --ignore-scripts || true
    
    # Install Jest specifically if missing
    if [ ! -d "node_modules/jest" ]; then
        echo "Installing Jest separately..."
        npm install jest@^29.7.0 --ignore-scripts
    fi
fi

# Try different ways to run Jest
if [ -f "node_modules/.bin/jest" ]; then
    echo "Running tests with Jest binary..."
    chmod +x node_modules/.bin/jest || true
    bash node_modules/.bin/jest "$@"
elif [ -f "node_modules/jest/bin/jest.js" ]; then
    echo "Running tests with Jest JS..."
    node node_modules/jest/bin/jest.js "$@"
else
    echo "Trying to find and run any available Jest..."
    find node_modules -name "jest.js" -exec node {} "$@" \; -quit || echo "No Jest executable found."
fi
