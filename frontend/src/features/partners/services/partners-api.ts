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

export type DiscoveryNoteTemplate = {
  id: string;
  name: string;
  questions: string[];
};

export type DiscoveryNoteGuidedAnswer = {
  question: string;
  answer: string;
};

export type DiscoveryNoteRecord = {
  id: string;
  partnerId: string;
  templateId: string | null;
  templateName: string | null;
  guidedAnswers: DiscoveryNoteGuidedAnswer[];
  freeformText: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type QualificationProfile = {
  durationCategory: "event_based" | "project_based" | "term_based" | null;
  rolePackages: Array<{
    impactLevel: "standard" | "major" | "lead";
    functionalRole: string;
  }>;
  functionalBenefits: string[];
  impactLevel: string | null;
  functionalRole: string | null;
  potentialValuePropositions: string[];
  confirmedValuePropositions: string[];
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type QualificationPayload = {
  durationCategory: "event_based" | "project_based" | "term_based" | null;
  rolePackages: Array<{
    impactLevel: "standard" | "major" | "lead";
    functionalRole: string;
  }>;
  functionalBenefits: string[];
};

export type PartnerContactRecord = {
  id: string;
  partnerId: string;
  fullName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkUrl: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePartnerContactPayload = {
  fullName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkUrl?: string;
  isPrimary?: boolean;
};

export type DiscoveryNotePayload = {
  templateId?: string;
  templateName?: string;
  guidedAnswers?: DiscoveryNoteGuidedAnswer[];
  freeformText?: string;
};

export type WorkflowHealthMetrics = {
  summary: {
    totalActivePartners: number;
    overdueNextActionCount: number;
    stalledPartnerCount: number;
    overdueNextActionDaysThreshold: number;
  };
  overduePartners: Array<{
    partnerId: string;
    organizationName: string;
    currentPhaseId: string;
    currentPhaseCode: string;
    currentPhaseName: string;
    daysSinceAnchor: number;
    overdueByDays: number;
  }>;
  stalledPartners: Array<{
    partnerId: string;
    organizationName: string;
    currentPhaseId: string;
    currentPhaseCode: string;
    currentPhaseName: string;
    daysInCurrentPhase: number;
    thresholdDays: number;
    exceededByDays: number;
  }>;
  stageMetrics: Array<{
    phaseId: string;
    phaseCode: string;
    phaseName: string;
    stalledCount: number;
    thresholdDays: number;
  }>;
};

export type WorkflowKpiMetrics = {
  summary: {
    totalActivePartners: number;
    overdueNextActionCount: number;
    generatedAt: string;
    responseTimeMs: number;
  };
  stageCounts: Array<{
    phaseId: string;
    phaseCode: string;
    phaseName: string;
    count: number;
  }>;
  conversion: {
    overallWinRatePct: number | null;
    stageConversion: Array<{
      fromPhaseCode: string;
      toPhaseCode: string;
      fromCount: number;
      toCount: number;
      conversionRatePct: number | null;
    }>;
  };
  overdueActions: {
    thresholdDays: number;
    count: number;
    partners: Array<{
      partnerId: string;
      organizationName: string;
      currentPhaseId: string;
      daysSinceAnchor: number;
      overdueByDays: number;
    }>;
  };
};

export type PartnerListFilters = {
  search?: string;
  organizationType?: string;
  industryNiche?: string;
  status?: "active" | "archived" | "all";
  impactTier?: string;
  valueProp?: string;
  coverageState?: "" | "gap" | "covered";
};

export type WorkflowCoverageInsights = {
  summary: {
    totalActivePartners: number;
    categoriesTracked: number;
    categoriesWithGaps: number;
    generatedAt: string;
    responseTimeMs: number;
  };
  demandDistribution: Array<{
    category: string;
    demandCount: number;
    confirmedCount: number;
    gapCount: number;
    coverageRatePct: number | null;
  }>;
  coverageGaps: Array<{
    category: string;
    demandCount: number;
    confirmedCount: number;
    gapCount: number;
    coverageRatePct: number | null;
    severity: "high" | "medium" | "low";
    recommendedAction: string;
  }>;
};

export type WorkflowSnapshot = {
  id: string;
  periodType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  createdBy: string;
  createdAt: string;
  generatedAt: string;
  metrics: {
    kpi: WorkflowKpiMetrics;
    coverage: WorkflowCoverageInsights;
  } | null;
};

export type PartnerImportMappingConfig = {
  fields: Array<{
    key: string;
    label: string;
    required: boolean;
    defaultColumn: string;
  }>;
  phaseOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  guidance: string[];
};

export type PartnerImportResult = {
  dryRun: boolean;
  executedAt: string;
  summary: {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  results: Array<{
    rowNumber: number;
    action: string;
    reason: string | null;
    organizationName: string | null;
  }>;
};

export type CreatePartnerPayload = {
  organizationName: string;
  organizationType: string;
  industryNiche: string;
  currentPhaseId: string;
  impactTier?: "standard" | "major" | "lead" | "";
  location?: string;
  websiteUrl?: string;
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
  if (filters.valueProp?.trim()) {
    params.set("valueProp", filters.valueProp.trim());
  }
  if (filters.coverageState) {
    params.set("coverageState", filters.coverageState);
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

export const getPartnerImportMappingRequest = async (): Promise<PartnerImportMappingConfig> => {
  const response = await fetch(`${API_URL}/partners/import/mapping`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load partner import mapping config"));
  }

  return body as PartnerImportMappingConfig;
};

export const importPartnersRequest = async (payload: {
  dryRun: boolean;
  mapping: Record<string, string>;
  rows: Array<Record<string, string>>;
}): Promise<PartnerImportResult> => {
  const response = await fetch(`${API_URL}/partners/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to import partners"));
  }

  return body as PartnerImportResult;
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

export const listDiscoveryNoteTemplatesRequest = async (
  partnerId: string,
): Promise<DiscoveryNoteTemplate[]> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/discovery-notes/templates`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load discovery note templates"));
  }

  return (body as { templates: DiscoveryNoteTemplate[] }).templates;
};

export const listDiscoveryNotesRequest = async (partnerId: string): Promise<DiscoveryNoteRecord[]> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/discovery-notes`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load discovery notes"));
  }

  return (body as { notes: DiscoveryNoteRecord[] }).notes;
};

export const createDiscoveryNoteRequest = async (
  partnerId: string,
  payload: DiscoveryNotePayload,
): Promise<DiscoveryNoteRecord> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/discovery-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to create discovery note"));
  }

  return (body as { note: DiscoveryNoteRecord }).note;
};

export const updateDiscoveryNoteRequest = async (
  partnerId: string,
  noteId: string,
  payload: DiscoveryNotePayload,
): Promise<DiscoveryNoteRecord> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/discovery-notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to update discovery note"));
  }

  return (body as { note: DiscoveryNoteRecord }).note;
};

export const getPartnerQualificationRequest = async (
  partnerId: string,
): Promise<{ qualification: QualificationProfile; functionalBenefitOptions: string[] }> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/qualification`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load qualification profile"));
  }

  return body as { qualification: QualificationProfile; functionalBenefitOptions: string[] };
};

export const upsertPartnerQualificationRequest = async (
  partnerId: string,
  payload: QualificationPayload,
): Promise<QualificationProfile> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/qualification`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to save qualification profile"));
  }

  return (body as { qualification: QualificationProfile }).qualification;
};

export const listPartnerContactsRequest = async (partnerId: string): Promise<PartnerContactRecord[]> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/contacts`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load partner contacts"));
  }

  return (body as { contacts: PartnerContactRecord[] }).contacts;
};

export const createPartnerContactRequest = async (
  partnerId: string,
  payload: CreatePartnerContactPayload,
): Promise<PartnerContactRecord> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to create partner contact"));
  }

  return (body as { contact: PartnerContactRecord }).contact;
};

export const getWorkflowHealthMetricsRequest = async (): Promise<WorkflowHealthMetrics> => {
  const response = await fetch(`${API_URL}/workflow/health/metrics`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load workflow health metrics"));
  }

  return body as WorkflowHealthMetrics;
};

export const getWorkflowKpiMetricsRequest = async (): Promise<WorkflowKpiMetrics> => {
  const response = await fetch(`${API_URL}/workflow/kpi/metrics`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load workflow KPI metrics"));
  }

  return body as WorkflowKpiMetrics;
};

export const getWorkflowCoverageInsightsRequest = async (): Promise<WorkflowCoverageInsights> => {
  const response = await fetch(`${API_URL}/workflow/kpi/coverage-insights`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load workflow coverage insights"));
  }

  return body as WorkflowCoverageInsights;
};

export const createWorkflowSnapshotRequest = async (
  periodType: "weekly" | "monthly",
): Promise<WorkflowSnapshot> => {
  const response = await fetch(`${API_URL}/workflow/snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ periodType }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to create workflow snapshot"));
  }

  return (body as { snapshot: WorkflowSnapshot }).snapshot;
};

export const listWorkflowSnapshotsRequest = async (filters?: {
  periodType?: "weekly" | "monthly";
  limit?: number;
}): Promise<WorkflowSnapshot[]> => {
  const params = new URLSearchParams();
  if (filters?.periodType) {
    params.set("periodType", filters.periodType);
  }
  if (typeof filters?.limit === "number") {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();
  const response = await fetch(`${API_URL}/workflow/snapshots${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load workflow snapshots"));
  }

  return (body as { snapshots: WorkflowSnapshot[] }).snapshots;
};

export type WorkflowPhase = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type WorkflowConfig = {
  phases: WorkflowPhase[];
  transitionRules: Array<{
    id: string;
    fromPhaseId: string;
    toPhaseId: string;
    requiresLastContactDate: boolean;
    requiresNextActionStep: boolean;
    isActive: boolean;
  }>;
  artifactRequirements: Array<{
    id: string;
    toPhaseId: string;
    documentType: string;
    requiredStatus: string;
    isActive: boolean;
  }>;
};

export class WorkflowTransitionError extends Error {
  code: string;
  details: Array<Record<string, unknown>>;

  constructor(message: string, code: string, details: Array<Record<string, unknown>>) {
    super(message);
    this.name = "WorkflowTransitionError";
    this.code = code;
    this.details = details;
  }
}

export const getWorkflowConfigRequest = async (): Promise<WorkflowConfig> => {
  const response = await fetch(`${API_URL}/workflow/config`, {
    method: "GET",
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to load workflow config"));
  }

  return body as WorkflowConfig;
};

export const transitionPartnerPhaseRequest = async (
  partnerId: string,
  payload: { toPhaseId: string; reason?: string },
): Promise<PartnerRecord> => {
  const response = await fetch(`${API_URL}/partners/${partnerId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body
        ? ((body.error as { code?: string }).code ?? "WORKFLOW_TRANSITION_FAILED")
        : "WORKFLOW_TRANSITION_FAILED";
    const details =
      body && typeof body === "object" && "error" in body
        ? ((body.error as { details?: Array<Record<string, unknown>> }).details ?? [])
        : [];

    throw new WorkflowTransitionError(
      extractApiMessage(body, "Failed to transition partner phase"),
      code,
      details,
    );
  }

  return (body as { partner: PartnerRecord }).partner;
};