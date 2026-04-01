#!/usr/bin/env node
const path = require("path");
const { backupSqliteDatabase } = require("../shared/services/backup.service");
const logger = require("../shared/utils/logger");

const projectRoot = path.join(__dirname, "../../..");
const sourcePath = process.env.BACKUP_SOURCE_DB || path.join(projectRoot, "dev.db");
const backupDirectory = process.env.BACKUP_OUTPUT_DIR || path.join(projectRoot, "backups");
const label = process.env.BACKUP_LABEL || "manual";

try {
  const result = backupSqliteDatabase({ sourcePath, backupDirectory, label });
  logger.info("backup_completed", result);
  process.exit(0);
} catch (error) {
  logger.error("backup_failed", {
    message: error?.message || "Backup failed",
  });
  process.exit(1);
}
