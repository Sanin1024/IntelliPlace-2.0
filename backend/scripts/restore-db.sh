#!/bin/bash
# Restoration script for PostgreSQL (Challenge 234)
# Usage: bash scripts/restore-db.sh backups/intelliplace_20261031_000000.sql.gz

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Error: Please provide the backup file path."
  echo "Usage: bash scripts/restore-db.sh <path_to_backup.sql.gz>"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in environment or .env"
  exit 1
fi

DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):\([0-9]*\)\/.*/\2/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD=$DB_PASS

echo "⚠️ WARNING: This will DROP and recreate the database '$DB_NAME'."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restoration aborted."
  exit 1
fi

echo "Dropping existing database..."
dropdb -U $DB_USER -h $DB_HOST -p $DB_PORT --if-exists $DB_NAME

echo "Creating fresh database..."
createdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME

echo "Restoring from backup..."
gunzip -c $BACKUP_FILE | psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Restoration successful."
else
  echo "❌ Restoration failed."
  exit 1
fi

