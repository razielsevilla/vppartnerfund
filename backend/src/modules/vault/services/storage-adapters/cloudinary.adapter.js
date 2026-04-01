const cloudinary = require("cloudinary").v2;

// Auto-configures via CLOUDINARY_URL or individual env vars
cloudinary.config({
  secure: true,
});

function normalizeName(fileName) {
  return String(fileName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

async function saveArtifact({ storagePath, buffer }) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: storagePath.replace(/\.[^/.]+$/, ""), // Cloudinary avoids extensions in public_id
        folder: "vppartnerfund",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

async function readArtifact(storagePath) {
  // For Cloudinary, we don't 'read' the buffer back through the adapter usually.
  // Instead, the controller should provide the redirect URL.
  // BUT the current backend architecture expects a buffer.
  // I'll fetch it from the URL.
  const url = cloudinary.url(storagePath, { secure: true });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch artifact from Cloudinary: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = {
  providerName: "cloudinary",
  normalizeName,
  saveArtifact,
  readArtifact,
};
