#!/bin/bash
# Challenge 306 & 310: Safe deployment script
set -e

echo "1. Pulling latest code..."
git pull origin main

echo "2. Building new images..."
docker-compose build

echo "3. Running database migrations (if any)..."
# Run migrations in a temporary container to avoid app downtime
docker-compose run --rm backend npx prisma migrate deploy

echo "4. Restarting services with zero downtime..."
# Recreate containers one by one
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend

echo "5. Cleaning up old images..."
docker image prune -f

echo "Deployment complete!"

