FROM node:22
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript initially
# This is the crucial step to ensure all files, including tuner.ts, are compiled
RUN npm run build

# For development, we want to run in watch mode
# For production, we just need the built files
CMD ["npm", "run", "dev"]
