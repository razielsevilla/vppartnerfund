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

export type PartnerListFilters = {
  search?: string;
  organizationType?: string;
  industryNiche?: string;
  status?: "active" | "archived" | "all";
  impactTier?: string;
};

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
    const errorMessage =
      (body && typeof body === "object" && "error" in body
        ? (body.error as { message?: string }).message
        : undefined) || "Failed to load partners";
    throw new Error(errorMessage);
  }

  const body = (await response.json()) as { partners: PartnerRecord[] };
  return body.partners;
};