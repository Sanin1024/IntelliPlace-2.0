#!/bin/bash
# Backup script for PostgreSQL (Challenge 233)
# Usage: bash scripts/backup-db.sh

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in environment or .env"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/intelliplace_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

echo "Starting database backup..."
# Extract connection info from DATABASE_URL
# Example: postgresql://user:pass@host:port/dbname?schema=public
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):\([0-9]*\)\/.*/\2/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD=$DB_PASS

pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -F p | gzip > $BACKUP_FILE

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Backup successful: $BACKUP_FILE"
  echo "⚠️ Warning: Move this file to secure offsite storage. Do not keep all backups locally."
else
  echo "❌ Backup failed."
  exit 1
fi

