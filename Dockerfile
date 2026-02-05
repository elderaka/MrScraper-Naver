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
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    firefox-esr \
    libx11-6 \
    libxrandr2 \
    libxinerama1 \
    libxcursor1 \
    libxi6 \
    libfontconfig1 \
    libfreetype6 \
    libxext6 \
    libxrender1 \
    libnss3 \
    xdg-utils \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV DEBIAN_FRONTEND=noninteractive

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', r => {if(r.statusCode !== 200) throw new Error(); process.exit(0)})"

CMD ["node", "dist/src/server.js"]
