# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Install dependencies needed for Camoufox and build tools for native modules
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Set environment variables for Camoufox
ENV HOME=/root
ENV XDG_DATA_HOME=/root/.local/share
ENV XDG_CONFIG_HOME=/root/.config
ENV XDG_CACHE_HOME=/root/.cache
ENV CAMOUFOX_APP_NAME=camoufox

# Fetch Camoufox binary
RUN npx camoufox-js fetch
RUN npx playwright install-deps firefox

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Runtime stage
FROM node:18-slim

WORKDIR /app

# Install X11 and Firefox dependencies (not Firefox itself - we use Camoufox)
RUN apt-get update && apt-get install -y \
    libx11-6 \
    libxrandr2 \
    libxinerama1 \
    libxcursor1 \
    libxi6 \
    libfontconfig1 \
    libfreetype6 \
    libxext6 \
    libxrender1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libasound2 \
    libdbus-glib-1-2 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libxss1 \
    libxkbcommon0 \
    xdg-utils \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV DEBIAN_FRONTEND=noninteractive

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Copy Camoufox binary from builder stage
COPY --from=builder /root/.cache/camoufox /root/.cache/camoufox

# Ensure proper permissions
RUN mkdir -p /tmp && chmod 1777 /tmp && \
    mkdir -p /root/.local/share && \
    mkdir -p /root/.config && \
    mkdir -p /root/.cache

# Environment variables
ENV HOME=/root
ENV PORT=8080
ENV NODE_ENV=production
ENV TMPDIR=/tmp
ENV XDG_DATA_HOME=/root/.local/share
ENV XDG_CONFIG_HOME=/root/.config
ENV XDG_CACHE_HOME=/root/.cache

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', r => {if(r.statusCode !== 200) throw new Error(); process.exit(0)})"

CMD ["node", "dist/server.js"]
