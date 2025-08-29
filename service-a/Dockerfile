FROM node:22
WORKDIR /app

# Copy package files first for better caching
COPY service-a/package*.json ./
COPY service-a/tsconfig.json ./

# Copy local adaptive-middleware package into image so npm can install it as file: dependency
COPY adaptive-middleware ./adaptive-middleware

# Install dependencies (including local adaptive-middleware)
RUN npm install

# Copy source code
COPY service-a/src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Copy entrypoint script
COPY service-a/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default to production (entrypoint will respect NODE_ENV)
ENV NODE_ENV=production

ENTRYPOINT ["/entrypoint.sh"]
