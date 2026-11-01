#!/bin/bash
# Challenge 308: Safe disk space cleanup

echo "Cleaning unused Docker images..."
docker image prune -a -f --filter "until=168h"

echo "Cleaning stopped containers..."
docker container prune -f

echo "Cleaning unused networks..."
docker network prune -f

echo "Cleaning build cache..."
docker builder prune -f

# Warning: Do NOT prune volumes without explicit confirmation
echo "Volumes preserved. Run 'docker volume prune' manually if absolutely necessary."

echo "Cleanup complete."

