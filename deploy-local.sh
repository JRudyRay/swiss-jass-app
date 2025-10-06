#!/bin/bash
# Local deployment script - run this from your development machine

PI_HOST="YOUR_PI_IP_HERE"
PI_USER="pi"

echo "Deploying to Raspberry Pi at $PI_HOST..."

# Sync code to Pi
rsync -avz --exclude 'node_modules' --exclude '.git' ./ $PI_USER@$PI_HOST:~/apps/swiss-jass-app/

# Run deployment on Pi
ssh $PI_USER@$PI_HOST "cd ~/apps/swiss-jass-app && ./deploy/raspberry-pi/deploy-backend.sh"

echo "Deployment completed!"