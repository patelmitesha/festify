#!/bin/bash

# Festify Production Deployment Script
set -e

echo "🚀 Starting Festify Production Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in Festify root directory"
    exit 1
fi

# Check deployment method
DEPLOY_METHOD=${1:-"traditional"}

if [ "$DEPLOY_METHOD" = "docker" ]; then
    echo "🐳 Docker Deployment Selected"

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Copy environment file
    if [ ! -f ".env.production" ]; then
        echo "❌ Please create .env.production file with your production settings"
        exit 1
    fi
    cp .env.production .env

    # Build and start services
    echo "🔨 Building Docker images..."
    docker-compose build --no-cache

    echo "🚀 Starting services..."
    docker-compose up -d

    echo "✅ Docker deployment completed!"
    echo "📝 Access your application at: http://localhost"
    echo "📊 Check service status: docker-compose ps"
    echo "📋 View logs: docker-compose logs -f"

elif [ "$DEPLOY_METHOD" = "traditional" ]; then
    echo "🖥️  Traditional Server Deployment Selected"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "❌ PM2 is not installed. Installing PM2..."
        sudo npm install -g pm2
    fi

    # Install dependencies
    echo "📦 Installing dependencies..."
    npm run install:all

    # Build applications
    echo "🔨 Building applications..."
    npm run build:frontend
    npm run build:backend

    # Check environment files
    if [ ! -f "backend/.env" ]; then
        echo "❌ Please create backend/.env file with your production settings"
        exit 1
    fi

    if [ ! -f "frontend/.env" ]; then
        echo "❌ Please create frontend/.env file with your production settings"
        exit 1
    fi

    # Create logs directory
    mkdir -p logs

    # Start applications with PM2
    echo "🚀 Starting applications..."
    pm2 start ecosystem.config.js
    pm2 save

    echo "✅ Traditional deployment completed!"
    echo "📝 Access your application at: http://localhost:3000"
    echo "📊 Check PM2 status: pm2 status"
    echo "📋 View logs: pm2 logs"
    echo "🔄 Restart apps: pm2 restart ecosystem.config.js"

else
    echo "❌ Invalid deployment method. Use 'docker' or 'traditional'"
    echo "Usage: ./deploy.sh [docker|traditional]"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "📖 For more information, check the deployment documentation."