FROM node:22
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# We'll install dependencies after mounting the adaptive-middleware volume
# This allows for proper local package resolution

# Copy source code
COPY src/ ./src/

# For development, we'll use tsx to run TypeScript directly
# For production, we can still build if needed

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
