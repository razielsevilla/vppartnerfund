import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { usePersistentState } from "../../../shared/hooks/usePersistentState";
import { listTasksRequest } from "../../tasks/services/tasks-api";
import {
  archivePartnerRequest,
  createPartnerRequest,
  DuplicatePartnerError,
  getWorkflowConfigRequest,
  getWorkflowHealthMetricsRequest,
  listPartnersRequest,
  type DuplicateCandidate,
  type PartnerRecord,
  type WorkflowConfig,
  type WorkflowHealthMetrics,
} from "../services/partners-api";

type FilterState = {
  search: string;
  organizationType: string;
  status: "active" | "archived" | "all";
  phaseCode: string;
  groupBy: "none" | "type" | "status" | "phase";
};

function parseStatus(value: string | null): FilterState["status"] {
  if (value === "active" || value === "archived" || value === "all") {
    return value;
  }
  return "active";
}

const ORGANIZATION_TYPE_OPTIONS = [
  "Tech Corporate",
  "IT-BPO",
  "Startup",
  "Manufacturing / Industrial",
  "Local Government Unit",
  "National Government Agency",
  "Academe",
  "Academic Organization",
  "Community / Non-Profit",
  "Incubator / Accelerator",
  "Media/Marketing",
  "Food and Hospitality",
];

export const PartnersPage = () => {
  useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [metrics, setMetrics] = useState<WorkflowHealthMetrics | null>(null);
  const [taskCounters, setTaskCounters] = useState({ open: 0, done: 0, overdue: 0 });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeView, setActiveView] = usePersistentState<"table" | "health_add">(
    "ui:partners:active-view",
    "table"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = usePersistentState<number>("ui:partners:page-size", 10);
  const [pendingDuplicateCandidates, setPendingDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<{
    organizationName: string;
    organizationType: string;
    industryNiche: string;
    currentPhaseId: string;
    location: string;
    websiteUrl: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    organizationName: "",
    organizationType: "",
    industryNiche: "",
    currentPhaseId: "phase_lead",
    locationScope: "laguna" as "laguna" | "non_laguna",
    nonLagunaLocation: "",
    websiteUrl: "",
  });

  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get("search") || "",
    organizationType: searchParams.get("organizationType") || "",
    status: parseStatus(searchParams.get("status")),
    phaseCode: searchParams.get("phaseCode") || "",
    groupBy: (searchParams.get("groupBy") as FilterState["groupBy"]) || "none",
  }));

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.organizationType.trim()) params.set("organizationType", filters.organizationType.trim());
    if (filters.status !== "active") params.set("status", filters.status);
    if (filters.phaseCode.trim()) params.set("phaseCode", filters.phaseCode.trim());
    if (filters.groupBy !== "none") params.set("groupBy", filters.groupBy);

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  const loadWorkflowConfig = async () => {
    try {
      const workflowData = await getWorkflowConfigRequest();
      setWorkflowConfig(workflowData);
    } catch {
      setWorkflowConfig(null);
    }
  };

  const refreshPartners = async () => {
    setIsLoadingPartners(true);
    setPartnersError(null);
    try {
      const data = await listPartnersRequest(filters);
      setPartners(data);
    } catch (error) {
      setPartnersError(error instanceof Error ? error.message : "Failed to load partners");
    } finally {
      setIsLoadingPartners(false);
    }
  };

  useEffect(() => {
    loadWorkflowConfig();
  }, []);

  useEffect(() => {
    refreshPartners();
  }, [filters]);

  useEffect(() => {
    const loadTaskCounters = async () => {
      try {
        const tasks = await listTasksRequest({});
        const now = Date.now();
        const open = tasks.filter((t) => t.status !== "done").length;
        const done = tasks.filter((t) => t.status === "done").length;
        const overdue = tasks.filter((t) => {
          if (t.status === "done") return false;
          const dueAt = new Date(`${t.dueDate}T23:59:59.999Z`).getTime();
          return dueAt < now;
        }).length;
        setTaskCounters({ open, done, overdue });
      } catch {
        setTaskCounters({ open: 0, done: 0, overdue: 0 });
      }
    };
    loadTaskCounters();
  }, [partners.length]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await getWorkflowHealthMetricsRequest();
        setMetrics(data);
      } catch (error) {
        // Silently fail or log for debug
      }
    };
    loadMetrics();
  }, [partners.length]);

  const onFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const phaseOptions = useMemo(
    () =>
      (workflowConfig?.phases || [])
        .filter((phase) => phase.isActive)
        .map((phase) => ({
          value: phase.code,
          label: phase.name,
        })),
    [workflowConfig?.phases]
  );

  // Removing duplicate groupedPartners computation as it's unused (replaced by finalDisplayGroups)

  const totalFilteredCount = partners.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // Note: Simplified pagination for grouped results - usually you'd paginate the groups or the flat list.
  // For now we'll paginate the flat list and then group the visible page if group is active, 
  // OR just show all if grouped (as per user "if no enough space, limit number of partners shown in each page")
  const paginatedPartners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return partners.slice(start, start + pageSize);
  }, [currentPage, partners, pageSize]);

  const finalDisplayGroups = useMemo(() => {
    if (filters.groupBy === "none") return { "": paginatedPartners };
    
    // Group only the current page for instant feel
    const groups: Record<string, PartnerRecord[]> = {};
    paginatedPartners.forEach((p) => {
      let key = "Other";
      if (filters.groupBy === "type") key = p.organizationType || "Uncategorized";
      if (filters.groupBy === "status") key = p.archivedAt ? "ARCHIVED" : "ACTIVE";
      if (filters.groupBy === "phase") {
        const phase = workflowConfig?.phases.find((ph) => ph.id === p.currentPhaseId);
        key = phase ? phase.name : p.currentPhaseId.replace(/^phase_/, "").toUpperCase();
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filters.groupBy, paginatedPartners, workflowConfig]);

  const subtitle = useMemo(() => {
    if (isLoadingPartners) return "Loading partner registry...";
    if (partnersError) return "Could not load partner data.";
    return `${totalFilteredCount} partner${totalFilteredCount === 1 ? "" : "s"} found`;
  }, [totalFilteredCount, isLoadingPartners, partnersError]);

  const submitCreate = async (confirmDuplicate: boolean, payloadOverride?: any) => {
    const payloadSource = payloadOverride || pendingCreatePayload;
    if (!payloadSource) return;

    setCreateError(null);
    setIsCreating(true);
    try {
      await createPartnerRequest({ ...payloadSource, confirmDuplicate });
      setPendingCreatePayload(null);
      setPendingDuplicateCandidates([]);
      setCreateForm({
        organizationName: "",
        organizationType: "",
        industryNiche: "",
        currentPhaseId: "phase_lead",
        locationScope: "laguna",
        nonLagunaLocation: "",
        websiteUrl: "",
      });
      await refreshPartners();
    } catch (error) {
      if (error instanceof DuplicatePartnerError) {
        setPendingCreatePayload(payloadSource);
        setPendingDuplicateCandidates(error.candidates);
        setCreateError("Potential duplicate detected. Review matches and confirm.");
      } else {
        setCreateError(error instanceof Error ? error.message : "Failed to create partner");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const onCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const location = createForm.locationScope === "laguna" ? "Laguna" : createForm.nonLagunaLocation.trim();
    if (!location) {
      setCreateError("Please specify the location.");
      return;
    }
    const payload = {
      organizationName: createForm.organizationName,
      organizationType: createForm.organizationType,
      industryNiche: createForm.industryNiche,
      currentPhaseId: createForm.currentPhaseId,
      location,
      websiteUrl: createForm.websiteUrl,
    };
    await submitCreate(false, payload);
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!window.confirm(`Archive "${name}"?`)) return;
    try {
      await archivePartnerRequest(id);
      await refreshPartners();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed");
    }
  };

  const renderRegistryTable = () => (
    <div className="registry-panel">
      <div className="registry-header-filters">
        <input 
          type="text" 
          placeholder="Search Name or Niche..."
          className="search-input-inline"
          value={filters.search}
          onChange={e => onFilterChange("search", e.target.value)}
        />
        <select value={filters.organizationType} onChange={e => onFilterChange("organizationType", e.target.value)}>
          <option value="">All Types</option>
          {ORGANIZATION_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filters.status} onChange={e => onFilterChange("status", e.target.value as any)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">Both</option>
        </select>
        <select value={filters.phaseCode} onChange={e => onFilterChange("phaseCode", e.target.value)}>
          <option value="">Any Phase</option>
          {phaseOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select value={filters.groupBy} onChange={e => onFilterChange("groupBy", e.target.value as any)}>
          <option value="none">No Grouping</option>
          <option value="type">Group by Type</option>
          <option value="status">Group by Status</option>
          <option value="phase">Group by Phase</option>
        </select>
      </div>

      {isLoadingPartners ? (
        <p className="loading-state">Syncing registry...</p>
      ) : partnersError ? (
        <div className="status-card status-error">
          <h2>Registry Error</h2>
          <p>{partnersError}</p>
        </div>
      ) : totalFilteredCount === 0 ? (
        <div className="status-card status-empty">
          <h2>No matches found</h2>
          <p>Try broadening your search or adjusting filters.</p>
        </div>
      ) : (
        <>
          <div className="registry-table-wrap">
            {Object.entries(finalDisplayGroups).map(([groupName, groupPartners]) => (
              <div key={groupName} className="registry-group-section">
                {groupName && <h3 className="group-header">{groupName} ({groupPartners.length})</h3>}
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Type</th>
                      <th>Phase</th>
                      <th>Location</th>
                      <th style={{ width: "80px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupPartners.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/partners/${p.id}`} className="table-link">
                            {p.organizationName}
                          </Link>
                        </td>
                        <td>{p.organizationType}</td>
                        <td>{p.currentPhaseId.replace(/^phase_/, "").toUpperCase()}</td>
                        <td>{p.location}</td>
                        <td>
                          <button
                            type="button"
                            className="table-action-btn delete-btn"
                            onClick={() => handleDeletePartner(p.id, p.organizationName)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="settings-actions-footer">
            <div className="table-pagination-row">
              <div className="table-pagination-controls">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="secondary-btn"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="settings-page-container">
      <div className="settings-sidebar">
        <div className="sidebar-header">
          <h1>Partners</h1>
          <p className="sidebar-status">{subtitle}</p>
        </div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-link ${activeView === "table" ? "is-active" : ""}`}
            onClick={() => setActiveView("table")}
          >
            Partner Registry
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeView === "health_add" ? "is-active" : ""}`}
            onClick={() => setActiveView("health_add")}
          >
            Pipeline & New Partner
          </button>
        </nav>
      </div>

      <div className="settings-content">
        <div className="single-screen-content">
          {activeView === "table" && renderRegistryTable()}

          {activeView === "health_add" && (
            <div className="health-add-combined">
              <section className="health-section-compact">
                <header className="section-header">
                  <h2>Pipeline Performance</h2>
                  <p className="muted">Live overview of engagement velocity and health</p>
                </header>
                {metrics && (
                  <div className="health-grid-mini">
                    <div className="health-card-mini">
                      <span className="label">Active</span>
                      <span className="value">{metrics.summary.totalActivePartners}</span>
                    </div>
                    <div className="health-card-mini warning">
                      <span className="label">Overdue</span>
                      <span className="value">{metrics.summary.overdueNextActionCount}</span>
                    </div>
                    <div className="health-card-mini danger">
                      <span className="label">Stalled</span>
                      <span className="value">{metrics.summary.stalledPartnerCount}</span>
                    </div>
                    <div className="health-card-mini">
                      <span className="label">Tasks</span>
                      <span className="value">{taskCounters.open}</span>
                    </div>
                  </div>
                )}
              </section>

              <section className="add-partner-section">
                <header className="section-header">
                  <h2>Register New Partner</h2>
                  <p className="muted">Capture new organization details to start the engagement workflow</p>
                </header>
                <form className="registry-create-form wide-form" onSubmit={onCreateSubmit}>
                  <div className="form-grid">
                    <label className="full-width">
                      Organization Name
                      <textarea
                        required
                        placeholder="Legal or common name of the entity"
                        value={createForm.organizationName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, organizationName: e.target.value }))}
                        rows={2}
                      />
                    </label>
                    <label>
                      Organization Type
                      <select
                        required
                        value={createForm.organizationType}
                        onChange={(e) => setCreateForm((f) => ({ ...f, organizationType: e.target.value }))}
                      >
                        <option value="">Select type...</option>
                        {ORGANIZATION_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Industry / Niche
                      <input
                        required
                        type="text"
                        placeholder="e.g. Fintech, EdTech"
                        value={createForm.industryNiche}
                        onChange={(e) => setCreateForm((f) => ({ ...f, industryNiche: e.target.value }))}
                      />
                    </label>
                    <label className="full-width">
                      Website URL
                      <textarea
                        placeholder="https://example.com"
                        value={createForm.websiteUrl}
                        onChange={(e) => setCreateForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                        rows={1}
                      />
                    </label>
                    <div className="location-group">
                      <span className="group-label">Location</span>
                      <div className="radio-options">
                        <label className="radio-label">
                          <input
                            type="radio"
                            checked={createForm.locationScope === "laguna"}
                            onChange={() => setCreateForm((f) => ({ ...f, locationScope: "laguna" }))}
                          />
                          Laguna
                        </label>
                        <label className="radio-label">
                          <input
                            type="radio"
                            checked={createForm.locationScope === "non_laguna"}
                            onChange={() => setCreateForm((f) => ({ ...f, locationScope: "non_laguna" }))}
                          />
                          Outside Laguna
                        </label>
                      </div>
                      {createForm.locationScope === "non_laguna" && (
                        <input
                          type="text"
                          required
                          placeholder="Specify city/province"
                          value={createForm.nonLagunaLocation}
                          onChange={(e) => setCreateForm((f) => ({ ...f, nonLagunaLocation: e.target.value }))}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {createError && <p className="error-message centered">{createError}</p>}
                  
                  {pendingDuplicateCandidates.length > 0 && (
                    <div className="duplicate-warning">
                      <p>Found {pendingDuplicateCandidates.length} existing partners with similar names:</p>
                      <ul>
                        {pendingDuplicateCandidates.map(c => (
                          <li key={c.id}>
                            <strong>{c.organizationName}</strong> ({c.location})
                          </li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => submitCreate(true)} className="primary-btn">
                        Ignore and Create Anyway
                      </button>
                    </div>
                  )}

                  <div className="form-footer-centered">
                    <button 
                      type="submit" 
                      className="emphasized-add-btn" 
                      disabled={isCreating}
                    >
                      {isCreating ? "Registering..." : "Add Partner Account"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
