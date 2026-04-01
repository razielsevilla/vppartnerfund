const { formidable } = require("formidable");
const {
  ArtifactStorageError,
  getMaxBytes,
  uploadArtifact,
  listArtifacts,
  getArtifactById,
} = require("../services/artifact-storage.service");

function serviceError(res, error) {
  if (error instanceof ArtifactStorageError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "ARTIFACT_INTERNAL_ERROR",
      message: "Unexpected artifact storage error",
      details: [],
    },
  });
}

function parseFileUpload(req) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: getMaxBytes(),
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const fileEntry = files.file;
      const uploaded = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
      if (!uploaded) {
        resolve(null);
        return;
      }

      resolve({
        originalFilename: uploaded.originalFilename,
        newFilename: uploaded.newFilename,
        mimetype: uploaded.mimetype || "application/octet-stream",
        size: uploaded.size,
        filepath: uploaded.filepath,
      });
    });
  });
}

async function uploadArtifactHandler(req, res) {
  try {
    const file = await parseFileUpload(req);
    if (!file) {
      return res.status(400).json({
        error: {
          code: "ARTIFACT_FILE_REQUIRED",
          message: "File is required",
          details: [{ field: "file", message: "Missing file upload" }],
        },
      });
    }

    const fs = require("fs/promises");
    const buffer = await fs.readFile(file.filepath);

    const artifact = await uploadArtifact({
      partnerId: req.params.partnerId,
      actorId: req.user.id,
      file: {
        ...file,
        buffer,
      },
    });

    return res.status(201).json({ artifact });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function listArtifactsHandler(req, res) {
  try {
    const artifacts = await listArtifacts(req.params.partnerId);
    return res.status(200).json({ artifacts });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getArtifactHandler(req, res) {
  try {
    const payload = await getArtifactById(req.params.artifactId);
    if (!payload) {
      return res.status(404).json({
        error: {
          code: "ARTIFACT_NOT_FOUND",
          message: "Artifact was not found",
          details: [{ field: "artifactId", message: "No artifact exists with this id" }],
        },
      });
    }

    res.setHeader("Content-Type", payload.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${payload.fileName}"`);
    return res.status(200).send(payload.fileBuffer);
  } catch (error) {
    return serviceError(res, error);
  }
}

module.exports = {
  uploadArtifactHandler,
  listArtifactsHandler,
  getArtifactHandler,
};
