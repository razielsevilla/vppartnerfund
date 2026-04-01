# Backup and Restore Runbook

This runbook documents the backup/restore process for local and self-hosted deployments.

## Scope

- Database backups are currently file-based for SQLite development/runtime setups.
- For PostgreSQL production deployments, use the platform-native dump/restore flow and keep this runbook as process reference.

## Backup

Run:

```bash
npm run db:backup
```

Optional environment variables:

- `BACKUP_SOURCE_DB`: override source DB file path (default: `dev.db` in repo root)
- `BACKUP_OUTPUT_DIR`: override backup directory (default: `backups/`)
- `BACKUP_LABEL`: filename prefix (default: `manual`)

Expected output: structured JSON log line with `backupPath`, `sourceHash`, and `backupHash`.

## Restore

Run:

```bash
RESTORE_BACKUP_PATH=<path-to-backup.sqlite> npm run db:restore
```

Optional environment variables:

- `RESTORE_TARGET_DB`: override target DB file path (default: `dev.db` in repo root)

Expected output: structured JSON log line with `targetPath`, `backupHash`, and `targetHash`.

## Verification

1. Ensure hash parity in command output (`sourceHash == backupHash` for backup and `backupHash == targetHash` for restore).
2. Run application smoke tests after restore:

```bash
npm run test
```

## Automated Test Coverage

- Backup/restore copy integrity is validated by automated test:
  - `backend/src/shared/services/backup.service.test.js`
