FROM node:20-bookworm-slim

# Install Chromium dan dependencies yang dibutuhkan Remotion
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto \
  fonts-noto-cjk \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
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
  wget \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Set Chromium path untuk Remotion
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production=false

# Copy source code
COPY . .

# Create output directory
RUN mkdir -p outputs

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
