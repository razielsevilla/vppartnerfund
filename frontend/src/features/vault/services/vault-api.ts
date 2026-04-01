const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");

export type ArtifactStatus = "active" | "pending_review" | "archived";

export type ArtifactRecord = {
  id: string;
  partnerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  documentType: string;
  status: ArtifactStatus;
  versionNumber: number;
  ownerId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

function extractApiMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const error = body.error as { message?: string };
  return error.message || fallback;
}

export const listArtifactsRequest = async (partnerId: string): Promise<ArtifactRecord[]> => {
  const response = await fetch(`${API_URL}/vault/partners/${partnerId}/artifacts`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load artifacts"));
  }

  return (body as { artifacts: ArtifactRecord[] }).artifacts;
};

export const uploadArtifactRequest = async (
  partnerId: string,
  payload: {
    file: File;
    documentType: string;
    status?: ArtifactStatus;
    ownerId?: string;
  },
): Promise<ArtifactRecord> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("documentType", payload.documentType);
  if (payload.status) {
    formData.append("status", payload.status);
  }
  if (payload.ownerId) {
    formData.append("ownerId", payload.ownerId);
  }

  const response = await fetch(`${API_URL}/vault/partners/${partnerId}/artifacts`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to upload artifact"));
  }

  return (body as { artifact: ArtifactRecord }).artifact;
};

export const updateArtifactStatusRequest = async (
  artifactId: string,
  status: ArtifactStatus,
): Promise<ArtifactRecord> => {
  const response = await fetch(`${API_URL}/vault/artifacts/${artifactId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to update artifact status"));
  }

  return (body as { artifact: ArtifactRecord }).artifact;
};

export const artifactFileUrl = (artifactId: string): string => `${API_URL}/vault/artifacts/${artifactId}`;
