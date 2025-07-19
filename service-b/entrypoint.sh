#!/bin/sh
if [ "$NODE_ENV" = "development" ]; then
    echo "Starting in development mode with nodemon..."
    npm run dev
else
    echo "Starting in production mode with node..."
    npm start
fi

