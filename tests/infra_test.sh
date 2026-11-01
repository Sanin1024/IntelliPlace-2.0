#!/bin/bash
# Basic infrastructure verification

echo "Testing Docker Compose configuration..."
docker-compose config > /dev/null 2>&1
if [ $? -eq 0 ]; then echo "✅ Compose config valid"; else echo "❌ Compose config invalid"; exit 1; fi

echo "Building images..."
docker-compose build
if [ $? -eq 0 ]; then echo "✅ Images built"; else echo "❌ Build failed"; exit 1; fi

echo "Starting services..."
docker-compose up -d
sleep 10 # Wait for health checks

echo "Testing DB health..."
docker-compose exec db pg_isready
if [ $? -eq 0 ]; then echo "✅ DB healthy"; else echo "❌ DB unhealthy"; exit 1; fi

echo "Testing Backend health..."
curl -s http://localhost:4000/api/health | grep "ok"
if [ $? -eq 0 ]; then echo "✅ Backend healthy"; else echo "❌ Backend unhealthy"; exit 1; fi

echo "Testing Frontend health..."
curl -s http://localhost:5173 | grep "<title>"
if [ $? -eq 0 ]; then echo "✅ Frontend healthy"; else echo "❌ Frontend unhealthy"; exit 1; fi

echo "Testing Inter-container communication (Nginx proxy)..."
curl -s http://localhost:5173/api/health | grep "ok"
if [ $? -eq 0 ]; then echo "✅ Proxy healthy"; else echo "❌ Proxy unhealthy"; exit 1; fi

echo "Stopping services..."
docker-compose down

echo "All infrastructure tests passed!"

