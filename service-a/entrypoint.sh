#!/bin/sh
if [ "$NODE_ENV" = "development" ]; then
    echo "Starting in development mode with tsx (no build required)..."

    # Wait for adaptive-middleware to be available with timeout
    echo "Waiting for adaptive-middleware to be built..."
    TIMEOUT=60
    ELAPSED=0

    while [ ! -f /app/adaptive-middleware/dist/index.js ] && [ $ELAPSED -lt $TIMEOUT ]; do
        echo "Waiting for adaptive-middleware dist files... (${ELAPSED}s/${TIMEOUT}s)"
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    done

    if [ ! -f /app/adaptive-middleware/dist/index.js ]; then
        echo "ERROR: adaptive-middleware dist files not found after ${TIMEOUT} seconds"
        echo "Checking if adaptive-middleware directory exists..."
        ls -la /app/adaptive-middleware/ || echo "adaptive-middleware directory not found"
        echo "Checking if src files exist..."
        ls -la /app/adaptive-middleware/src/ || echo "adaptive-middleware src directory not found"
        echo "Attempting to build adaptive-middleware manually..."
        cd /app/adaptive-middleware && npm install && npm run build
        cd /app
    fi

    echo "Installing dependencies..."
    npm install

    echo "Starting development server with hot reload..."
    npm run dev
else
    echo "Starting in production mode..."
    npm run build
    npm run start
fi
