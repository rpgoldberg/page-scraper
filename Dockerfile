# =============================================================================
# BASE STAGE - Common dependencies for all stages
# =============================================================================
FROM node:20-alpine AS base

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Set Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# =============================================================================
# DEVELOPMENT STAGE - For local development with hot reload
# =============================================================================
FROM base AS development

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port for development
EXPOSE 3000

CMD ["npm", "run", "dev"]

# =============================================================================
# TEST STAGE - For running tests in CI/CD
# =============================================================================
FROM development AS test

# Tests are run separately in CI/CD pipelines
# This stage provides the test environment
CMD ["npm", "run", "test:ci"]

# =============================================================================
# BUILDER STAGE - Build production assets
# =============================================================================
FROM base AS builder

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# =============================================================================
# PRODUCTION STAGE - Final production image
# =============================================================================
FROM base AS production

# Create non-root user with specific UID for Puppeteer
RUN addgroup -g 1001 pptruser && \
    adduser -D -u 1001 -G pptruser pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R pptruser:pptruser /app

# Switch to non-root user
USER pptruser

# Expose port
EXPOSE 3000

# Health check with 30s start period for Puppeteer initialization
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })" || exit 1

CMD ["npm", "start"]
