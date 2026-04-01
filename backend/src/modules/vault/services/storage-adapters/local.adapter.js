const fs = require("fs/promises");
const path = require("path");

const uploadRoot =
  process.env.ARTIFACT_LOCAL_ROOT ||
  path.resolve(__dirname, "../../../../../../uploads/artifacts");

function normalizeName(fileName) {
  return String(fileName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

function artifactAbsolutePath(storagePath) {
  return path.resolve(uploadRoot, storagePath);
}

async function saveArtifact({ storagePath, buffer }) {
  const absolutePath = artifactAbsolutePath(storagePath);
  const parentDir = path.dirname(absolutePath);
  await fs.mkdir(parentDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

async function readArtifact(storagePath) {
  const absolutePath = artifactAbsolutePath(storagePath);
  return fs.readFile(absolutePath);
}

module.exports = {
  providerName: "local",
  normalizeName,
  saveArtifact,
  readArtifact,
};
