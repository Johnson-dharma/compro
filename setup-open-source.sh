#!/bin/bash

# Open Source Attendance System Setup Script
# This script sets up CompreFace (facial recognition) and Thumbor (image processing)

echo "🚀 Setting up Open Source Attendance System with Facial Recognition"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   Windows: https://docs.docker.com/desktop/windows/"
    echo "   Mac: https://docs.docker.com/desktop/mac/"
    echo "   Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker found"

# Create uploads directory
mkdir -p backend/uploads
echo "✅ Created uploads directory"

# Copy environment file if it doesn't exist
if [ ! -f backend/.env ]; then
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created .env file from .env.example"
        echo "⚠️ Please update the .env file with your configuration"
    else
        echo "⚠️ .env.example not found. Please create backend/.env manually"
    fi
fi

# Start the open-source services
echo "🔄 Starting open-source services..."
echo "   • CompreFace (Facial Recognition)"
echo "   • Thumbor (Image Processing)"
echo "   • PostgreSQL (Database for CompreFace)"
echo "   • Redis (Caching)"

# Use docker-compose or docker compose based on what's available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    DOCKER_COMPOSE_CMD="docker compose"
fi

$DOCKER_COMPOSE_CMD up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check CompreFace Admin
if curl -f http://localhost:8000/login > /dev/null 2>&1; then
    echo "✅ CompreFace Admin UI: http://localhost:8000"
else
    echo "⚠️ CompreFace Admin UI not ready yet"
fi

# Check CompreFace API
if curl -f http://localhost:8001/api/v1/recognition/subjects > /dev/null 2>&1; then
    echo "✅ CompreFace API: http://localhost:8001"
else
    echo "⚠️ CompreFace API not ready yet"
fi

# Check Thumbor
if curl -f http://localhost:8888/healthcheck > /dev/null 2>&1; then
    echo "✅ Thumbor: http://localhost:8888"
else
    echo "⚠️ Thumbor not ready yet"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Configure CompreFace:"
echo "   • Visit: http://localhost:8000"
echo "   • Login with default credentials"
echo "   • Create Recognition and Detection services"
echo "   • Copy API keys to your .env file"
echo ""
echo "2. Update your .env file with:"
echo "   COMPREFACE_URL=http://localhost:8001"
echo "   COMPREFACE_RECOGNITION_API_KEY=your-key-here"
echo "   COMPREFACE_DETECTION_API_KEY=your-key-here"
echo "   THUMBOR_URL=http://localhost:8888"
echo ""
echo "3. Start your backend:"
echo "   cd backend && npm run dev"
echo ""
echo "📖 Service URLs:"
echo "   • CompreFace Admin: http://localhost:8000"
echo "   • CompreFace API: http://localhost:8001"
echo "   • CompreFace UI: http://localhost:8002"
echo "   • Thumbor: http://localhost:8888"
echo "   • Redis: localhost:6379"
echo ""
echo "🔗 API Documentation:"
echo "   • CompreFace: https://github.com/exadel-inc/CompreFace"
echo "   • Thumbor: https://thumbor.readthedocs.io/"
echo ""
echo "💡 Tips:"
echo "   • Use 'docker-compose logs -f' to view service logs"
echo "   • Use 'docker-compose down' to stop services"
echo "   • Use 'docker-compose pull && docker-compose up -d' to update"


