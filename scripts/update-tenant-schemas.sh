#!/bin/bash

# Accurack Tenant Schema Update Script
# Sequentially applies Prisma migrations to all tenant databases listed in the master DB

set -e

MASTER_DB_CONTAINER="accurack_backend_prod"
MASTER_DB_NAME="accurack_master"
MASTER_DB_USER="postgres"
TENANT_QUERY="SELECT databaseUrl FROM clients;"

LOG_FILE="update-tenant-schemas.log"

echo "🔄 Starting tenant schema update..."
echo "Log file: $LOG_FILE"
echo "====================================="

# Get all tenant connection strings from master DB
tenant_dbs=$(docker exec $MASTER_DB_CONTAINER psql -U $MASTER_DB_USER -d $MASTER_DB_NAME -t -c "$TENANT_QUERY" | grep -v '^$' | tr -d ' ')

if [ -z "$tenant_dbs" ]; then
  echo "[ERROR] No tenant databases found in master DB."
  exit 1
fi

success_count=0
fail_count=0

for db_url in $tenant_dbs; do
  echo "[INFO] Migrating tenant DB: $db_url"
  # Set DATABASE_URL for Prisma
  export DATABASE_URL="$db_url"
  # Run migration
  if npx prisma migrate deploy >> "$LOG_FILE" 2>&1; then
    echo "[SUCCESS] Migration succeeded for $db_url" | tee -a "$LOG_FILE"
    success_count=$((success_count+1))
  else
    echo "[ERROR] Migration failed for $db_url" | tee -a "$LOG_FILE"
    fail_count=$((fail_count+1))
  fi
  unset DATABASE_URL
  echo "-------------------------------------" | tee -a "$LOG_FILE"
done

echo "====================================="
echo "Migration complete. Success: $success_count, Failed: $fail_count"
echo "See $LOG_FILE for details."
