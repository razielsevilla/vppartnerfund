const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type PartnerRecord = {
  id: string;
  organizationName: string;
  organizationType: string;
  industryNiche: string;
  websiteUrl: string | null;
  location: string | null;
  pastRelationship: string | null;
  currentPhaseId: string;
  lastContactDate: string | null;
  nextActionStep: string | null;
  impactTier: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TimelineEntry = {
  id: string;
  kind: "status_change" | "activity";
  actionType: string;
  actorId: string;
  actorName: string;
  happenedAt: string;
  previousValue: { phaseId?: string | null; phaseName?: string | null } | null;
  newValue: { phaseId?: string | null; phaseName?: string | null } | null;
  metadata: Record<string, unknown> | null;
};

export type PartnerListFilters = {
  search?: string;
  organizationType?: string;
  industryNiche?: string;
  status?: "active" | "archived" | "all";
  impactTier?: string;
};

export type CreatePartnerPayload = {
  organizationName: string;
  organizationType: string;
  industryNiche: string;
  currentPhaseId: string;
  impactTier?: "standard" | "major" | "lead" | "";
  location?: string;
  confirmDuplicate?: boolean;
};

export type DuplicateCandidate = {
  id: string;
  organizationName: string;
  organizationType: string;
  industryNiche: string;
  location: string | null;
  similarity: number;
};

export class DuplicatePartnerError extends Error {
  candidates: DuplicateCandidate[];

  constructor(message: string, candidates: DuplicateCandidate[]) {
    super(message);
    this.name = "DuplicatePartnerError";
    this.candidates = candidates;
  }
}

function extractApiMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const error = body.error as { message?: string };
  return error.message || fallback;
}

export const listPartnersRequest = async (filters: PartnerListFilters): Promise<PartnerRecord[]> => {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.organizationType?.trim()) {
    params.set("organizationType", filters.organizationType.trim());
  }
  if (filters.industryNiche?.trim()) {
    params.set("industryNiche", filters.industryNiche.trim());
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.impactTier?.trim()) {
    params.set("impactTier", filters.impactTier.trim().toLowerCase());
  }

  const query = params.toString();
  const response = await fetch(`${API_URL}/partners${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractApiMessage(body, "Failed to load partners"));
  }

  const body = (await response.json()) as { partners: PartnerRecord[] };
  return body.partners;
};

export const createPartnerRequest = async (payload: CreatePartnerPayload): Promise<PartnerRecord> => {
  const response = await fetch(`${API_URL}/partners`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorCode =
      body && typeof body === "object" && "error" in body
        ? (body.error as { code?: string }).code
        : undefined;

    if (errorCode === "PARTNER_DUPLICATE_DETECTED") {
      const details =
        body && typeof body === "object" && "error" in body
          ? ((body.error as { details?: Array<{ candidates?: DuplicateCandidate[] }> }).details ?? [])
          : [];

      const candidates = details[0]?.candidates ?? [];
      throw new DuplicatePartnerError(
        extractApiMessage(body, "Potential duplicates found"),
        candidates,
      );
    }

    throw new Error(extractApiMessage(body, "Failed to create partner"));
  }

  return (body as { partner: PartnerRecord }).partner;
};

export const getPartnerRequest = async (partnerId: string): Promise<PartnerRecord> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load partner detail"));
  }

  return (body as { partner: PartnerRecord }).partner;
};

export const getPartnerTimelineRequest = async (partnerId: string): Promise<TimelineEntry[]> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/timeline`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load partner timeline"));
  }

  return (body as { entries: TimelineEntry[] }).entries;
};