# Multi-stage build for AutoContent Pro API
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.6

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY libs/types/package.json ./libs/types/
COPY libs/utils/package.json ./libs/utils/
COPY libs/queue/package.json ./libs/queue/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build the application
RUN pnpm nx build api

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm@8.15.6

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/dist/apps/api ./dist/apps/api
COPY --from=build /app/dist/libs ./dist/libs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/apps/api/main.js"]
