#!/usr/bin/env bash
set -e

echo "=== Remotion Google Colab Setup ==="

# Determine sudo usage (root vs non-root)
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "Warning: Running as non-root without sudo. Package installation might require root."
  fi
fi

# 1. Install Node.js 20 if needed
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "--> Installing Node.js 20..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y ca-certificates curl gnupg
  $SUDO mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | $SUDO gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | $SUDO tee /etc/apt/sources.list.d/nodesource.list
  $SUDO apt-get update -y
  $SUDO apt-get install -y nodejs
else
  echo "--> Node.js $(node -v) is already installed."
fi

# 2. Install ffmpeg and Chrome / Chromium dependencies for Remotion on Ubuntu/Colab
echo "--> Installing ffmpeg and Chrome headless dependencies..."
$SUDO apt-get update -y
$SUDO apt-get install -y \
  ffmpeg \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  fonts-liberation \
  libxshmfence1

# 3. Run npm install
echo "--> Running npm install..."
npm install

# 4. Ensure Remotion headless browser binary is downloaded and ready
echo "--> Ensuring Remotion browser binary..."
npx remotion browser ensure

# 5. Print CPU count
echo "--> Available CPU cores for rendering (nproc):"
nproc
echo "=== Setup Complete ==="
