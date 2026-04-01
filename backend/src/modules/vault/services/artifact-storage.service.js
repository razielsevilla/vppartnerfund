const crypto = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");
const { logPartnerActivity } = require("../../../shared/services/audit-log.service");
const localAdapter = require("./storage-adapters/local.adapter");

class ArtifactStorageError extends Error {
  constructor(message, code, status = 400, details = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function getStorageAdapter() {
  const provider = (process.env.ARTIFACT_STORAGE_PROVIDER || "local").toLowerCase();
  if (provider === "local") {
    return localAdapter;
  }

  throw new ArtifactStorageError("Unsupported artifact storage provider", "ARTIFACT_STORAGE_PROVIDER_INVALID", 500, [
    { field: "ARTIFACT_STORAGE_PROVIDER", message: `Unsupported provider: ${provider}` },
  ]);
}

function parseAllowedMimeTypes() {
  const raw =
    process.env.ARTIFACT_ALLOWED_MIME_TYPES ||
    "application/pdf,image/png,image/jpeg,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getMaxBytes() {
  return Number(process.env.ARTIFACT_MAX_BYTES || 10 * 1024 * 1024);
}

function validateArtifactInput(file) {
  const allowedMimeTypes = parseAllowedMimeTypes();
  const maxBytes = getMaxBytes();

  if (!file) {
    throw new ArtifactStorageError("File is required", "ARTIFACT_FILE_REQUIRED", 400, [
      { field: "file", message: "Missing file upload" },
    ]);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ArtifactStorageError("File type is not allowed", "ARTIFACT_FILE_TYPE_INVALID", 400, [
      { field: "mimeType", message: `Allowed types: ${allowedMimeTypes.join(", ")}` },
    ]);
  }

  if (file.size > maxBytes) {
    throw new ArtifactStorageError("File exceeds maximum size", "ARTIFACT_FILE_TOO_LARGE", 400, [
      { field: "size", message: `Max bytes: ${maxBytes}` },
    ]);
  }
}

async function assertPartnerExists(db, partnerId) {
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    throw new ArtifactStorageError("Partner was not found", "PARTNER_NOT_FOUND", 404, [
      { field: "partnerId", message: "No partner exists with this id" },
    ]);
  }
}

function mapArtifact(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    partnerId: row.partner_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageProvider: row.storage_provider,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

async function uploadArtifact({ partnerId, actorId, file }) {
  const db = getDatabase();
  await assertPartnerExists(db, partnerId);

  validateArtifactInput(file);

  const adapter = getStorageAdapter();
  const artifactId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const safeName = adapter.normalizeName(file.originalFilename || file.newFilename || "artifact.bin");
  const storagePath = `${partnerId}/${artifactId}-${safeName}`;

  await adapter.saveArtifact({
    storagePath,
    buffer: file.buffer,
  });

  await db("artifact_records").insert({
    id: artifactId,
    partner_id: partnerId,
    file_name: safeName,
    mime_type: file.mimetype,
    size_bytes: file.size,
    storage_provider: adapter.providerName,
    storage_path: storagePath,
    uploaded_by: actorId,
    created_at: nowIso,
  });

  await logPartnerActivity(db, {
    partnerId,
    actionType: "artifact_uploaded",
    actorId,
    payload: {
      artifactId,
      fileName: safeName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
  });

  const saved = await db("artifact_records").where({ id: artifactId }).first();
  return mapArtifact(saved);
}

async function listArtifacts(partnerId) {
  const db = getDatabase();
  await assertPartnerExists(db, partnerId);

  const rows = await db("artifact_records")
    .where({ partner_id: partnerId })
    .orderBy("created_at", "desc");

  return rows.map(mapArtifact);
}

async function getArtifactById(artifactId) {
  const db = getDatabase();
  const row = await db("artifact_records").where({ id: artifactId }).first();
  if (!row) {
    return null;
  }

  const adapter = getStorageAdapter();
  const fileBuffer = await adapter.readArtifact(row.storage_path);

  return {
    artifact: mapArtifact(row),
    fileBuffer,
    fileName: row.file_name,
    mimeType: row.mime_type,
    partnerId: row.partner_id,
  };
}

module.exports = {
  ArtifactStorageError,
  getMaxBytes,
  uploadArtifact,
  listArtifacts,
  getArtifactById,
};
