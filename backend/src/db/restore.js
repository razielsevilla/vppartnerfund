#!/usr/bin/env node
const path = require("path");
const { restoreSqliteDatabase } = require("../shared/services/backup.service");
const logger = require("../shared/utils/logger");

const projectRoot = path.join(__dirname, "../../..");
const backupPath = process.env.RESTORE_BACKUP_PATH;
const targetPath = process.env.RESTORE_TARGET_DB || path.join(projectRoot, "dev.db");

if (!backupPath) {
  logger.error("restore_failed", {
    message: "RESTORE_BACKUP_PATH is required",
  });
  process.exit(1);
}

try {
  const result = restoreSqliteDatabase({ backupPath, targetPath });
  logger.info("restore_completed", result);
  process.exit(0);
} catch (error) {
  logger.error("restore_failed", {
    message: error?.message || "Restore failed",
  });
  process.exit(1);
}
