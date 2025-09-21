# Multi-stage build for AutoContent Pro WhatsApp Worker
FROM node:18-alpine AS base

# Install dependencies needed for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN npm install -g pnpm@8.15.6

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/wa-worker/package.json ./apps/wa-worker/
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
RUN pnpm nx build wa-worker

# Production stage
FROM node:18-alpine AS production

# Install dependencies needed for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN npm install -g pnpm@8.15.6

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/dist/apps/wa-worker ./dist/apps/wa-worker
COPY --from=build /app/dist/libs ./dist/libs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S whatsapp -u 1001

# Create directory for WhatsApp session data
RUN mkdir -p /app/.wwebjs_auth && chown -R whatsapp:nodejs /app/.wwebjs_auth

# Change ownership of the app directory
RUN chown -R whatsapp:nodejs /app
USER whatsapp

# Volume for WhatsApp session persistence
VOLUME ["/app/.wwebjs_auth"]

# Start the application
CMD ["node", "dist/apps/wa-worker/main.js"]
