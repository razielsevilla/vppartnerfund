const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  backupSqliteDatabase,
  restoreSqliteDatabase,
} = require("./backup.service");

test("backup and restore copy sqlite file with matching hashes", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vpfund-backup-"));
  const sourceDir = path.join(tempRoot, "source");
  const backupDir = path.join(tempRoot, "backups");
  const restoreDir = path.join(tempRoot, "restore");

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(restoreDir, { recursive: true });

  const sourcePath = path.join(sourceDir, "dev.db");
  fs.writeFileSync(sourcePath, "sqlite-content-sample");

  const backup = backupSqliteDatabase({
    sourcePath,
    backupDirectory: backupDir,
    label: "test",
  });

  assert.ok(fs.existsSync(backup.backupPath));
  assert.equal(backup.sourceHash, backup.backupHash);

  const targetPath = path.join(restoreDir, "restored.db");
  const restore = restoreSqliteDatabase({ backupPath: backup.backupPath, targetPath });

  assert.ok(fs.existsSync(targetPath));
  assert.equal(restore.backupHash, restore.targetHash);
  assert.equal(fs.readFileSync(targetPath, "utf8"), "sqlite-content-sample");

  fs.rmSync(tempRoot, { recursive: true, force: true });
});
