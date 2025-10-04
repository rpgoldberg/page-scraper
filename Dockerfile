# =============================================================================
# BASE STAGE - Secure Ubuntu 22.04 + Node 24 + Patched Chrome 140.0.7339.185
# =============================================================================
FROM ubuntu:22.04 AS base

# Install Node.js 24 using official binaries (avoids NodeSource CVE false positives)
RUN apt-get update && apt-get install -y \
    curl \
    xz-utils \
    && NODE_VERSION=v24.8.0 \
    && curl -fsSLO https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz \
    && tar -xJf node-${NODE_VERSION}-linux-x64.tar.xz -C /usr/local --strip-components=1 \
    && rm node-${NODE_VERSION}-linux-x64.tar.xz \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies for Puppeteer and ensure latest security updates
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y \
    ca-certificates \
    procps \
    libxss1 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libxkbcommon0 \
    libgbm1 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install fonts for Puppeteer
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y fonts-liberation fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    && apt-get autoremove -y --purge \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Download and install patched Chrome for Testing (140.0.7339.185) - fixes CVE-2025-10200
RUN apt-get update && apt-get install -y wget unzip \
    && wget -q https://storage.googleapis.com/chrome-for-testing-public/140.0.7339.185/linux64/chrome-linux64.zip \
    && unzip chrome-linux64.zip \
    && mv chrome-linux64 /opt/chrome \
    && rm chrome-linux64.zip \
    && chmod +x /opt/chrome/chrome \
    && apt-get remove -y wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path for Puppeteer and skip download
ENV PUPPETEER_EXECUTABLE_PATH=/opt/chrome/chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# =============================================================================
# DEVELOPMENT STAGE - For local development with hot reload
# =============================================================================
FROM base AS development

# Copy package files
COPY package*.json ./

# Install all dependencies (Puppeteer won't download Chrome due to ENV vars)
RUN npm config set fetch-timeout 300000 && npm config set fetch-retry-maxtimeout 300000
RUN timeout 600 npm install --no-audit --no-fund

# Remove any Chrome that might have been downloaded by Puppeteer
RUN rm -rf /root/.cache/puppeteer \
    && rm -rf node_modules/puppeteer/.local-chromium \
    && rm -rf node_modules/puppeteer-core/.local-chromium

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

# Install all dependencies for build
RUN npm config set fetch-timeout 300000 && npm config set fetch-retry-maxtimeout 300000
RUN timeout 600 npm install --no-audit --no-fund

# Remove any Chrome that might have been downloaded by Puppeteer
RUN rm -rf /root/.cache/puppeteer \
    && rm -rf node_modules/puppeteer/.local-chromium \
    && rm -rf node_modules/puppeteer-core/.local-chromium

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# =============================================================================
# PRODUCTION STAGE - Final production image
# =============================================================================
FROM base AS production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm config set fetch-timeout 300000 && npm config set fetch-retry-maxtimeout 300000
RUN timeout 600 npm install --no-audit --no-fund --omit=dev

# Remove any Chrome that might have been downloaded by Puppeteer
RUN rm -rf /root/.cache/puppeteer \
    && rm -rf node_modules/puppeteer/.local-chromium \
    && rm -rf node_modules/puppeteer-core/.local-chromium

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Switch to non-root user
USER pptruser

# Expose port
EXPOSE 3000

# Health check with 30s start period for Puppeteer initialization
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]
