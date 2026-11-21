#!/bin/sh
# Logical backup of the SSRF database and uploaded files. Runs inside the "backup" container.
set -eu
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /backups
pg_dump --format=custom --no-owner --file="/backups/ssrf-$STAMP.dump"
tar -C /data/storage -czf "/backups/uploads-$STAMP.tar.gz" . 2>/dev/null || true
# Verify the dump is readable before trusting it.
pg_restore --list "/backups/ssrf-$STAMP.dump" > /dev/null
sha256sum "/backups/ssrf-$STAMP.dump" > "/backups/ssrf-$STAMP.dump.sha256"
# Retain 14 days.
find /backups -type f -mtime +14 -delete
echo "backup $STAMP ok"
