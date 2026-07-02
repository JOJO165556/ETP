#!/bin/bash
# Backup simple de la base PostgreSQL
# Usage: ./scripts/backup_db.sh
# Configurer BACKUP_DIR dans .env ou laisser la valeur par defaut

set -e

# Charger la config depuis .env si present
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$SCRIPT_DIR/.env" ] && export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="etp_db_${DATE}.sql.gz"
DB_HOST="${POSTGRES_SERVER:-localhost}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-etp_db}"

mkdir -p "$BACKUP_DIR"

# Dump + compression
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

# Garder les 30 derniers backups
ls -t "$BACKUP_DIR"/etp_db_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm

echo "Backup termine: $BACKUP_DIR/$FILENAME"
