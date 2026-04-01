const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function fileHash(filePath) {
  const hash = crypto.createHash("sha256");
  const content = fs.readFileSync(filePath);
  hash.update(content);
  return hash.digest("hex");
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function backupSqliteDatabase({ sourcePath, backupDirectory, label = "manual" }) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source database file not found: ${sourcePath}`);
  }

  ensureDirectory(backupDirectory);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `${label}-${timestamp}.sqlite`;
  const backupPath = path.join(backupDirectory, backupFileName);

  fs.copyFileSync(sourcePath, backupPath);

  return {
    backupPath,
    sourceHash: fileHash(sourcePath),
    backupHash: fileHash(backupPath),
    createdAt: new Date().toISOString(),
  };
}

function restoreSqliteDatabase({ backupPath, targetPath }) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  ensureDirectory(path.dirname(targetPath));
  fs.copyFileSync(backupPath, targetPath);

  return {
    targetPath,
    backupHash: fileHash(backupPath),
    targetHash: fileHash(targetPath),
    restoredAt: new Date().toISOString(),
  };
}

module.exports = {
  backupSqliteDatabase,
  restoreSqliteDatabase,
  fileHash,
};
