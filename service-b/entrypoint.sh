#!/bin/sh
if [ "$NODE_ENV" = "development" ]; then
    echo "Starting in development mode with tsx (no build required)..."
    npm run dev
else
    echo "Starting in production mode..."
    npm run build && npm start
fi
