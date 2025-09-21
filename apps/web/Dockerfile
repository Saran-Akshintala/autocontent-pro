# Multi-stage build for AutoContent Pro Web App
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.6

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY libs/types/package.json ./libs/types/
COPY libs/utils/package.json ./libs/utils/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build the application
RUN pnpm nx build web --prod

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=build /app/dist/apps/web /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
