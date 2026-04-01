const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type SettingsError = { error?: { message?: string } };

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const parsed = body as SettingsError;
  return parsed.error?.message || fallback;
}

export type WorkflowPhaseSetting = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type TaxonomyItemSetting = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

export type SettingsMasterData = {
  workflowPhases: WorkflowPhaseSetting[];
  taxonomies: Record<string, TaxonomyItemSetting[]>;
};

export type SettingsAuditEntry = {
  id: string;
  domain: string;
  action: string;
  actorId: string;
  actorName: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export const getSettingsMasterDataRequest = async (): Promise<SettingsMasterData> => {
  const response = await fetch(`${API_URL}/settings/master-data`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractMessage(body, "Failed to load settings"));
  }

  return body as SettingsMasterData;
};

export const updateWorkflowPhasesRequest = async (
  phases: WorkflowPhaseSetting[],
): Promise<SettingsMasterData> => {
  const response = await fetch(`${API_URL}/settings/workflow-phases`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phases }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractMessage(body, "Failed to update workflow phases"));
  }

  return body as SettingsMasterData;
};

export const updateTaxonomyRequest = async (
  taxonomyKey: string,
  items: Array<{ value: string; label: string; sortOrder: number; isActive: boolean }>,
): Promise<SettingsMasterData> => {
  const response = await fetch(`${API_URL}/settings/taxonomies/${encodeURIComponent(taxonomyKey)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ items }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractMessage(body, "Failed to update taxonomy"));
  }

  return body as SettingsMasterData;
};

export const listSettingsAuditLogRequest = async (limit = 20): Promise<SettingsAuditEntry[]> => {
  const response = await fetch(`${API_URL}/settings/audit-log?limit=${limit}`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractMessage(body, "Failed to load settings audit log"));
  }

  return (body as { entries: SettingsAuditEntry[] }).entries;
};
