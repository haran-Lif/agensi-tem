#!/usr/bin/env bash
set -euo pipefail
# Use PostgreSQL connection environment variables / .pgpass, never commit credentials.
: "${PGHOST:?Set PGHOST for the source database}"
: "${PGUSER:?Set PGUSER}"
: "${PGDATABASE:?Set PGDATABASE}"
command -v pg_dump >/dev/null || { echo 'PostgreSQL pg_dump is required.' >&2; exit 1; }
backup_dir="backups/private/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
pg_dump --schema-only --schema=public --no-owner --no-privileges > "$backup_dir/public-schema.sql"
pg_dump --data-only --no-owner --no-privileges --column-inserts \
 --table=public.teams --table=public.positions --table=public.employees \
 --table=public.projects --table=public.project_members --table=public.output_rules \
 --table=public.app_settings --table=public.code_master > "$backup_dir/settings-data.sql"
printf '%s\n' 'Contains employee/project configuration; review and anonymize before sharing.' > "$backup_dir/README.txt"
echo "Exported to $backup_dir (Git ignored). Auth and Storage are separate."
