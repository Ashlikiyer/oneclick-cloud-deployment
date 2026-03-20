#!/bin/bash
# ==============================================================================
# OneClick AWS Deployer - EC2 Bootstrap Script
# ==============================================================================
# This script is injected as UserData when launching EC2 instances.
# It sets up a complete Node.js environment and deploys a GitHub repository.
#
# Variables to replace:
#   {{GITHUB_URL}} - The GitHub repository URL to clone
#   {{BRANCH}} - Git branch to checkout (default: main)
#   {{APP_PORT}} - Application port (default: 3000)
#   {{ENV_VARS}} - Custom environment variables
# ==============================================================================

set -e

# Log all output to file for debugging (viewable via EC2 Console Logs)
exec > >(tee /var/log/oneclick-deploy.log) 2>&1

echo "=============================================="
echo "  OneClick Deploy Bootstrap Script"
echo "=============================================="
echo "Started at: $(date)"
echo "GitHub URL: {{GITHUB_URL}}"
echo "Branch: {{BRANCH}}"
echo ""

# ==============================================================================
# PHASE 1: System Setup
# ==============================================================================
echo ">>> [1/7] Updating system packages..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo ">>> [2/7] Installing essential packages..."
apt-get install -y curl git build-essential

# ==============================================================================
# PHASE 2: Node.js Installation
# ==============================================================================
echo ">>> [3/7] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# ==============================================================================
# PHASE 3: PM2 Installation
# ==============================================================================
echo ">>> [4/7] Installing PM2 process manager..."
npm install -g pm2

# ==============================================================================
# PHASE 4: Application Clone & Setup
# ==============================================================================
echo ">>> [5/7] Cloning repository..."
mkdir -p /home/ubuntu/app
cd /home/ubuntu/app

# Clone with retry logic
MAX_RETRIES=3
for i in $(seq 1 $MAX_RETRIES); do
  if git clone --depth 1 --branch {{BRANCH}} {{GITHUB_URL}} .; then
    echo "Repository cloned successfully"
    break
  fi
  if [ $i -eq $MAX_RETRIES ]; then
    echo "ERROR: Failed to clone repository after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Clone failed, retrying in 5 seconds..."
  rm -rf /home/ubuntu/app/*
  sleep 5
done

# Set ownership
chown -R ubuntu:ubuntu /home/ubuntu/app

# Create environment file
echo ">>> Setting up environment variables..."
cat > /home/ubuntu/app/.env << 'ENVFILE'
NODE_ENV=production
PORT={{APP_PORT}}
{{ENV_VARS}}
ENVFILE

# ==============================================================================
# PHASE 5: Dependencies & Build
# ==============================================================================
echo ">>> [6/7] Installing dependencies..."
cd /home/ubuntu/app
npm install --production=false

# Detect and build application
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
  echo ">>> Detected Next.js application"
  echo ">>> Building Next.js..."
  npm run build
  
  # Start with PM2
  su - ubuntu -c "cd /home/ubuntu/app && pm2 start npm --name 'nextjs-app' -- start"
  
elif [ -f "package.json" ]; then
  # Check for start script
  if grep -q '"start"' package.json; then
    echo ">>> Detected Node.js application with start script"
    
    # Check for build script
    if grep -q '"build"' package.json; then
      echo ">>> Running build..."
      npm run build || true
    fi
    
    # Start with PM2
    su - ubuntu -c "cd /home/ubuntu/app && pm2 start npm --name 'node-app' -- start"
  else
    # Try common entry points
    for ENTRY in index.js server.js app.js main.js; do
      if [ -f "$ENTRY" ]; then
        echo ">>> Starting $ENTRY with PM2..."
        su - ubuntu -c "cd /home/ubuntu/app && pm2 start $ENTRY --name 'node-app'"
        break
      fi
    done
  fi
else
  echo "WARNING: Could not detect application type"
  echo "Please SSH in and start the application manually"
fi

# Save PM2 configuration
su - ubuntu -c "pm2 save"

# Configure PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# ==============================================================================
# PHASE 6: Nginx Reverse Proxy
# ==============================================================================
echo ">>> [7/7] Configuring Nginx..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Increase max body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:{{APP_PORT}};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

# Test and restart Nginx
nginx -t && systemctl restart nginx
systemctl enable nginx

# ==============================================================================
# COMPLETE
# ==============================================================================
echo ""
echo "=============================================="
echo "  Bootstrap Complete!"
echo "=============================================="
echo "Finished at: $(date)"
echo ""
echo "Application Status:"
su - ubuntu -c "pm2 list"
echo ""
echo "Service URLs:"
echo "  - Direct:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):{{APP_PORT}}"
echo "  - Nginx:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Logs:"
echo "  - Bootstrap: /var/log/oneclick-deploy.log"
echo "  - PM2:       pm2 logs"
echo "=============================================="
