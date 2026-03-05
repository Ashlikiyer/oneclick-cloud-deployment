/**
 * UserData Script Generator
 * 
 * Generates bash scripts to bootstrap EC2 instances for deploying
 * Next.js + Node.js applications from GitHub repositories.
 */

/**
 * Generate a UserData bootstrap script for EC2
 * @param {Object} options - Script generation options
 * @param {string} options.githubUrl - GitHub repository URL to clone
 * @param {Object} [options.envVars={}] - Environment variables to set
 * @param {number} [options.appPort=3000] - Port for the Next.js app
 * @param {number} [options.apiPort=4000] - Port for the backend API (optional)
 * @param {string} [options.branch='main'] - Git branch to checkout
 * @returns {string} - Base64-encoded bash script
 */
function generateUserData(options) {
  const {
    githubUrl,
    envVars = {},
    appPort = 3000,
    apiPort = 4000,
    branch = 'main',
  } = options;

  // Generate environment variables section
  const envVarsScript = Object.entries(envVars)
    .map(([key, value]) => `echo "${key}=${value}" >> /home/ubuntu/app/.env`)
    .join('\n');

  const script = `#!/bin/bash
set -e

# Log all output to file for debugging
exec > >(tee /var/log/oneclick-deploy.log) 2>&1
echo "=== OneClick Deploy Bootstrap Script ==="
echo "Started at: $(date)"

# Update system packages
echo ">>> Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
echo ">>> Installing essential packages..."
apt-get install -y curl git build-essential

# Install Node.js 20 LTS via NodeSource
echo ">>> Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo ">>> Node.js version: $(node --version)"
echo ">>> npm version: $(npm --version)"

# Install PM2 globally for process management
echo ">>> Installing PM2..."
npm install -g pm2

# Create app directory
echo ">>> Creating app directory..."
mkdir -p /home/ubuntu/app
cd /home/ubuntu/app

# Clone the GitHub repository
echo ">>> Cloning repository: ${githubUrl}"
git clone --depth 1 --branch ${branch} ${githubUrl} .

# Set ownership to ubuntu user
chown -R ubuntu:ubuntu /home/ubuntu/app

# Create .env file with provided environment variables
echo ">>> Setting up environment variables..."
touch /home/ubuntu/app/.env
${envVarsScript}
echo "NODE_ENV=production" >> /home/ubuntu/app/.env
echo "PORT=${appPort}" >> /home/ubuntu/app/.env

# Install dependencies
echo ">>> Installing dependencies..."
npm install --production=false

# Check if this is a Next.js app or Express backend
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
  echo ">>> Detected Next.js application"
  
  # Build the Next.js app
  echo ">>> Building Next.js application..."
  npm run build
  
  # Start with PM2
  echo ">>> Starting Next.js app with PM2..."
  su - ubuntu -c "cd /home/ubuntu/app && pm2 start npm --name 'nextjs-app' -- start"
  
elif [ -f "server.js" ] || [ -f "index.js" ] || [ -f "app.js" ]; then
  echo ">>> Detected Node.js/Express application"
  
  # Determine entry point
  ENTRY_POINT="index.js"
  if [ -f "server.js" ]; then
    ENTRY_POINT="server.js"
  elif [ -f "app.js" ]; then
    ENTRY_POINT="app.js"
  fi
  
  # Start with PM2
  echo ">>> Starting Node.js app with PM2..."
  su - ubuntu -c "cd /home/ubuntu/app && pm2 start $ENTRY_POINT --name 'node-app'"
  
else
  echo ">>> No recognized entry point found. Manual setup required."
fi

# Save PM2 process list and configure startup
echo ">>> Configuring PM2 startup..."
su - ubuntu -c "pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Install and configure Nginx as reverse proxy (optional enhancement)
echo ">>> Installing Nginx..."
apt-get install -y nginx

# Configure Nginx
cat > /etc/nginx/sites-available/default << 'NGINX_CONFIG'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:${appPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
}
NGINX_CONFIG

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Final status
echo "=== Bootstrap Complete ==="
echo "Finished at: $(date)"
echo "App should be running on port ${appPort}"
echo "Nginx reverse proxy configured on port 80"

# Display PM2 status
su - ubuntu -c "pm2 list"
`;

  // Return base64-encoded script (required for EC2 UserData)
  return Buffer.from(script).toString('base64');
}

/**
 * Generate a minimal UserData script for testing
 * @param {string} githubUrl - GitHub repository URL
 * @returns {string} - Base64-encoded minimal bash script
 */
function generateMinimalUserData(githubUrl) {
  const script = `#!/bin/bash
set -e
exec > >(tee /var/log/oneclick-deploy.log) 2>&1

echo "=== Minimal Bootstrap ==="
apt-get update -y
apt-get install -y curl git

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# Clone and start
mkdir -p /home/ubuntu/app && cd /home/ubuntu/app
git clone --depth 1 ${githubUrl} .
chown -R ubuntu:ubuntu /home/ubuntu/app

npm install
npm run build || true
su - ubuntu -c "cd /home/ubuntu/app && pm2 start npm --name 'app' -- start"
su - ubuntu -c "pm2 save"

echo "=== Done ==="
`;

  return Buffer.from(script).toString('base64');
}

/**
 * Decode a UserData script (for debugging)
 * @param {string} base64Script - Base64-encoded script
 * @returns {string} - Decoded bash script
 */
function decodeUserData(base64Script) {
  return Buffer.from(base64Script, 'base64').toString('utf-8');
}

module.exports = {
  generateUserData,
  generateMinimalUserData,
  decodeUserData,
};
