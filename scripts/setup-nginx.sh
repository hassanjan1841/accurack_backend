#!/bin/bash

DOMAIN="test-backend.accurack.ai"
NGINX_CONF="/etc/nginx/sites-available/backend"
DEPLOY_PORT=4000

echo "🔧 Installing NGINX and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

echo "🛠️ Creating NGINX config for $DOMAIN..."

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$DEPLOY_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

echo "🔗 Enabling NGINX config..."
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "🔐 Setting up SSL with Certbot..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m hassanjan@innova360.io

echo "✅ NGINX reverse proxy with HTTPS is ready for $DOMAIN -> localhost:$DEPLOY_PORT"
