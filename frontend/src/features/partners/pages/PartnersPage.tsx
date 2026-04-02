import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { usePersistentState } from "../../../shared/hooks/usePersistentState";
import { listTasksRequest, type TaskRecord } from "../../tasks/services/tasks-api";
import {
  archivePartnerRequest,
  createPartnerRequest,
  DuplicatePartnerError,
  getWorkflowConfigRequest,
  getWorkflowHealthMetricsRequest,
  getPartnerImportMappingRequest,
  importPartnersRequest,
  listPartnersRequest,
  type DuplicateCandidate,
  type PartnerImportMappingConfig,
  type PartnerImportResult,
  type PartnerRecord,
  type WorkflowConfig,
  type WorkflowHealthMetrics,
} from "../services/partners-api";

type FilterState = {
  search: string;
  organizationType: string;
  industryNiche: string;
  status: "active" | "archived" | "all";
  impactTier: "" | "standard" | "major" | "lead";
  phaseCode: string;
  valueProp: string;
  coverageState: "" | "gap" | "covered";
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

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseSpreadsheetText(raw: string): Array<Record<string, string>> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => header.trim());
  if (headers.length === 0) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row;
  });
}

export const PartnersPage = () => {
  useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [metrics, setMetrics] = useState<WorkflowHealthMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [taskCounters, setTaskCounters] = useState({ open: 0, done: 0, overdue: 0 });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [importMappingConfig, setImportMappingConfig] = useState<PartnerImportMappingConfig | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [sheetText, setSheetText] = useState("");
  const [importResult, setImportResult] = useState<PartnerImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeView, setActiveView] = usePersistentState<
    "table" | "filters" | "health" | "add" | "import"
  >("ui:partners:active-view", "table");
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
    industryNiche: searchParams.get("industryNiche") || "",
    status: parseStatus(searchParams.get("status")),
    impactTier: (searchParams.get("impactTier") as FilterState["impactTier"]) || "",
    phaseCode: searchParams.get("phaseCode") || "",
    valueProp: searchParams.get("valueProp") || "",
    coverageState: (searchParams.get("coverageState") as FilterState["coverageState"]) || "",
  }));

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) {
      params.set("search", filters.search.trim());
    }
    if (filters.organizationType.trim()) {
      params.set("organizationType", filters.organizationType.trim());
    }
    if (filters.industryNiche.trim()) {
      params.set("industryNiche", filters.industryNiche.trim());
    }
    if (filters.status !== "active") {
      params.set("status", filters.status);
    }
    if (filters.impactTier) {
      params.set("impactTier", filters.impactTier);
    }
    if (filters.phaseCode.trim()) {
      params.set("phaseCode", filters.phaseCode.trim());
    }
    if (filters.valueProp.trim()) {
      params.set("valueProp", filters.valueProp.trim());
    }
    if (filters.coverageState) {
      params.set("coverageState", filters.coverageState);
    }

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const loadWorkflowConfig = async () => {
      try {
        const [workflowData, mappingConfig] = await Promise.all([
          getWorkflowConfigRequest(),
          getPartnerImportMappingRequest(),
        ]);
        if (!cancelled) {
          setWorkflowConfig(workflowData);
          setImportMappingConfig(mappingConfig);
          const defaults: Record<string, string> = {};
          mappingConfig.fields.forEach((field) => {
            defaults[field.key] = field.defaultColumn;
          });
          setImportMapping(defaults);
        }
      } catch {
        if (!cancelled) {
          setWorkflowConfig(null);
          setImportMappingConfig(null);
        }
      }
    };

    loadWorkflowConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPartners = async () => {
      setIsLoadingPartners(true);
      setPartnersError(null);
      try {
        const data = await listPartnersRequest(filters);
        if (!cancelled) {
          setPartners(data);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load partners";
          setPartnersError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPartners(false);
        }
      }
    };

    loadPartners();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        const data = await getWorkflowHealthMetricsRequest();
        if (!cancelled) {
          setMetrics(data);
          setMetricsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMetricsError(error instanceof Error ? error.message : "Failed to load metrics");
        }
      }
    };

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [partners.length]);

  useEffect(() => {
    let cancelled = false;

    const computeCounters = (tasks: TaskRecord[]) => {
      const now = Date.now();
      const open = tasks.filter((task) => task.status !== "done").length;
      const done = tasks.filter((task) => task.status === "done").length;
      const overdue = tasks.filter((task) => {
        if (task.status === "done") {
          return false;
        }

        const dueAt = new Date(`${task.dueDate}T23:59:59.999Z`).getTime();
        return dueAt < now;
      }).length;

      return { open, done, overdue };
    };

    const loadTaskCounters = async () => {
      try {
        const tasks = await listTasksRequest({});
        if (!cancelled) {
          setTaskCounters(computeCounters(tasks));
        }
      } catch {
        if (!cancelled) {
          setTaskCounters({ open: 0, done: 0, overdue: 0 });
        }
      }
    };

    const onTaskUpdate = () => {
      loadTaskCounters();
    };

    loadTaskCounters();
    window.addEventListener("task:updated", onTaskUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("task:updated", onTaskUpdate);
    };
  }, []);

  const filteredPartners = useMemo(() => {
    if (!filters.phaseCode.trim()) {
      return partners;
    }

    const targetCode = filters.phaseCode.trim().toLowerCase();
    return partners.filter((partner) => {
      const code = partner.currentPhaseId.replace(/^phase_/, "").toLowerCase();
      return code === targetCode;
    });
  }, [filters.phaseCode, partners]);

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / pageSize));
  const paginatedPartners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPartners.slice(start, start + pageSize);
  }, [currentPage, filteredPartners, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const phaseOptions = useMemo(
    () =>
      (workflowConfig?.phases || [])
        .filter((phase) => phase.isActive)
        .map((phase) => ({
          value: phase.code,
          label: phase.name,
        })),
    [workflowConfig?.phases],
  );

  const subtitle = useMemo(() => {
    if (isLoadingPartners) {
      return "Loading partner registry...";
    }
    if (partnersError) {
      return "Could not load partner data.";
    }
    return `${filteredPartners.length} partner${filteredPartners.length === 1 ? "" : "s"} found`;
  }, [filteredPartners.length, isLoadingPartners, partnersError]);

  const onFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const refreshPartners = async () => {
    setIsLoadingPartners(true);
    setPartnersError(null);
    try {
      const data = await listPartnersRequest(filters);
      setPartners(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load partners";
      setPartnersError(message);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  const submitCreate = async (
    confirmDuplicate: boolean,
    payloadOverride?: {
      organizationName: string;
      organizationType: string;
      industryNiche: string;
      currentPhaseId: string;
      location: string;
      websiteUrl: string;
    },
  ) => {
    const payloadSource = payloadOverride || pendingCreatePayload;
    if (!payloadSource) {
      setCreateError("Please complete the partner form.");
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      await createPartnerRequest({
        organizationName: payloadSource.organizationName,
        organizationType: payloadSource.organizationType,
        industryNiche: payloadSource.industryNiche,
        currentPhaseId: payloadSource.currentPhaseId,
        location: payloadSource.location,
        websiteUrl: payloadSource.websiteUrl,
        confirmDuplicate,
      });

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
        setCreateError("Potential duplicate detected. Review matches and confirm to proceed.");
      } else {
        const message = error instanceof Error ? error.message : "Failed to create partner";
        setCreateError(message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const onCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const location =
      createForm.locationScope === "laguna"
        ? "Laguna"
        : createForm.nonLagunaLocation.trim();

    if (!location) {
      setCreateError("Please specify the non-Laguna location.");
      return;
    }

    setPendingCreatePayload(null);
    setPendingDuplicateCandidates([]);
    const payload = {
      organizationName: createForm.organizationName,
      organizationType: createForm.organizationType,
      industryNiche: createForm.industryNiche,
      currentPhaseId: createForm.currentPhaseId,
      location,
      websiteUrl: createForm.websiteUrl,
    };
    setPendingCreatePayload(payload);
    await submitCreate(false, payload);
  };

  const runImport = async (dryRun: boolean) => {
    setImportError(null);
    setImportResult(null);

    const rows = parseSpreadsheetText(sheetText);
    if (rows.length === 0) {
      setImportError("Paste a sheet with a header row and at least one data row.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importPartnersRequest({
        dryRun,
        mapping: importMapping,
        rows,
      });
      setImportResult(result);

      if (!dryRun) {
        await refreshPartners();
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import spreadsheet rows");
    } finally {
      setIsImporting(false);
    }
  };
  const handleDeletePartner = async (partnerId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to archive "${name}"? It will be moved to the Archived view.`)) {
      return;
    }
    try {
      await archivePartnerRequest(partnerId);
      await refreshPartners();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive partner");
    }
  };

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
            className={`sidebar-link ${activeView === "filters" ? "is-active" : ""}`}
            onClick={() => setActiveView("filters")}
          >
            Advanced Filters
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeView === "health" ? "is-active" : ""}`}
            onClick={() => setActiveView("health")}
          >
            Pipeline Health
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeView === "add" ? "is-active" : ""}`}
            onClick={() => setActiveView("add")}
          >
            Add New Partner
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeView === "import" ? "is-active" : ""}`}
            onClick={() => setActiveView("import")}
          >
            Spreadsheet Import
          </button>
        </nav>
      </div>

      <div className="settings-content">
        <div className="single-screen-content">
          {activeView === "table" && (
            <div className="registry-panel">
              {isLoadingPartners && <p className="loading-state">Loading registry...</p>}

              {!isLoadingPartners && partnersError && (
                <div className="status-card status-error" role="alert">
                  <h2>Registry Error</h2>
                  <p>{partnersError}</p>
                </div>
              )}

              {!isLoadingPartners && !partnersError && filteredPartners.length === 0 && (
                <div className="status-card status-empty">
                  <h2>No partners found</h2>
                  <p>Try adjusting filters or adding a new partner.</p>
                </div>
              )}

              {!isLoadingPartners && !partnersError && filteredPartners.length > 0 && (
                <>
                  <div className="registry-table-wrap">
                    <table className="registry-table">
                      <thead>
                        <tr>
                          <th>Organization</th>
                          <th>Type</th>
                          <th>Phase</th>
                          <th>Location</th>
                          <th>Impact</th>
                          <th style={{ width: "80px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPartners.map((partner) => (
                          <tr key={partner.id}>
                            <td>
                              <Link to={`/partners/${partner.id}`} className="table-link">
                                {partner.organizationName}
                              </Link>
                            </td>
                            <td>{partner.organizationType}</td>
                            <td>{partner.currentPhaseId.replace(/^phase_/, "").toUpperCase()}</td>
                            <td>{partner.location}</td>
                            <td>{partner.impactTier || "standard"}</td>
                            <td>
                              <button
                                type="button"
                                className="table-action-btn delete-btn"
                                title="Archive Partner"
                                onClick={() => handleDeletePartner(partner.id, partner.organizationName)}
                              >
                                <span role="img" aria-label="delete">🗑️</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                        style={{ padding: "0.4rem" }}
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
          )}

          {activeView === "filters" && (
            <section className="registry-controls" aria-label="Partner registry filters">
              <label>
                Search
                <input
                  type="text"
                  placeholder="Partner name or keyword"
                  value={filters.search}
                  onChange={(event) => onFilterChange("search", event.target.value)}
                />
              </label>
              <label>
                Type
                <input
                  type="text"
                  placeholder="e.g. Corporate"
                  value={filters.organizationType}
                  onChange={(event) => onFilterChange("organizationType", event.target.value)}
                />
              </label>
              <label>
                Niche
                <input
                  type="text"
                  placeholder="e.g. Digital upskilling"
                  value={filters.industryNiche}
                  onChange={(event) => onFilterChange("industryNiche", event.target.value)}
                />
              </label>
              <label>
                Status
                <select
                  value={filters.status}
                  onChange={(event) =>
                    onFilterChange("status", event.target.value as FilterState["status"])
                  }
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label>
                Phase
                <select
                  value={filters.phaseCode}
                  onChange={(event) => onFilterChange("phaseCode", event.target.value)}
                >
                  <option value="">Any</option>
                  {phaseOptions.map((phase) => (
                    <option key={phase.value} value={phase.value}>
                      {phase.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Value Proposition
                <input
                  type="text"
                  placeholder="e.g. Talent Pipeline"
                  value={filters.valueProp}
                  onChange={(event) => onFilterChange("valueProp", event.target.value)}
                />
              </label>
              <label>
                Coverage
                <select
                  value={filters.coverageState}
                  onChange={(event) =>
                    onFilterChange("coverageState", event.target.value as FilterState["coverageState"])
                  }
                >
                  <option value="">Any</option>
                  <option value="gap">Gap (Potential not Confirmed)</option>
                  <option value="covered">Covered (Confirmed)</option>
                </select>
              </label>
              <label>
                Impact
                <select
                  value={filters.impactTier}
                  onChange={(event) =>
                    onFilterChange("impactTier", event.target.value as FilterState["impactTier"])
                  }
                >
                  <option value="">Any</option>
                  <option value="standard">Standard</option>
                  <option value="major">Major</option>
                  <option value="lead">Lead</option>
                </select>
              </label>
            </section>
          )}

          {activeView === "health" && (
            <section className="health-metrics-panel" aria-label="Pipeline health metrics">
              {metricsError && <p className="error-text">{metricsError}</p>}
              {!metricsError && metrics && (
                <div className="health-cards">
                  <article className="health-card">
                    <h3>Active Partners</h3>
                    <strong>{metrics.summary.totalActivePartners}</strong>
                  </article>
                  <article className="health-card health-card-warning">
                    <h3>Overdue Actions</h3>
                    <strong>{metrics.summary.overdueNextActionCount}</strong>
                    <p>{`Threshold: ${metrics.summary.overdueNextActionDaysThreshold} days`}</p>
                  </article>
                  <article className="health-card health-card-danger">
                    <h3>Stalled Stages</h3>
                    <strong>{metrics.summary.stalledPartnerCount}</strong>
                    <p>Threshold from config rules</p>
                  </article>
                  <article className="health-card">
                    <h3>Open Tasks</h3>
                    <strong>{taskCounters.open}</strong>
                  </article>
                  <article className="health-card">
                    <h3>Completed Tasks</h3>
                    <strong>{taskCounters.done}</strong>
                    <p>{taskCounters.overdue} overdue</p>
                  </article>
                </div>
              )}
            </section>
          )}

          {activeView === "add" && (
            <section className="registry-create-panel" aria-label="Create partner">
              <form className="registry-create-form" onSubmit={onCreateSubmit}>
                <input
                  required
                  type="text"
                  placeholder="Organization name"
                  value={createForm.organizationName}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, organizationName: event.target.value }))
                  }
                />
                <select
                  required
                  value={createForm.organizationType}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, organizationType: event.target.value }))
                  }
                >
                  <option value="">Select type</option>
                  {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <textarea
                  className="registry-create-field-wide"
                  required
                  placeholder="Industry Niche (describe core focus)"
                  value={createForm.industryNiche}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, industryNiche: event.target.value }))
                  }
                />
                <select
                  value={createForm.locationScope}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      locationScope: event.target.value as "laguna" | "non_laguna",
                    }))
                  }
                >
                  <option value="laguna">Laguna</option>
                  <option value="non_laguna">Non-Laguna</option>
                </select>
                {createForm.locationScope === "non_laguna" && (
                  <input
                    required
                    type="text"
                    placeholder="Specify location"
                    value={createForm.nonLagunaLocation}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, nonLagunaLocation: event.target.value }))
                    }
                  />
                )}
                <input
                  type="url"
                  placeholder="Website URL"
                  value={createForm.websiteUrl}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, websiteUrl: event.target.value }))
                  }
                />
                <button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Add Partner"}
                </button>
              </form>

              {createError && <p className="error-text">{createError}</p>}

              {pendingDuplicateCandidates.length > 0 && (
                <div className="duplicate-warning" role="alert">
                  <h3>Potential duplication</h3>
                  <ul>
                    {pendingDuplicateCandidates.map((candidate) => (
                      <li key={candidate.id}>
                        {candidate.organizationName} ({Math.round(candidate.similarity * 100)}%)
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => submitCreate(true)} disabled={isCreating}>
                    Save as Intentional Duplicate
                  </button>
                </div>
              )}
            </section>
          )}

          {activeView === "import" && (
            <section className="registry-create-panel" aria-label="Spreadsheet import">
              <p className="muted">Bulk import from Google Sheets by pasting raw cell data.</p>
              <div className="import-grid">
                <label>
                  Paste Data Here
                  <textarea
                    className="import-textarea"
                    value={sheetText}
                    onChange={(event) => setSheetText(event.target.value)}
                    placeholder="Headers followed by data rows..."
                  />
                </label>

                <div className="import-mapping-grid">
                  {importMappingConfig?.fields.map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        type="text"
                        required={field.required}
                        value={importMapping[field.key] || ""}
                        onChange={(event) =>
                          setImportMapping((prev) => ({ ...prev, [field.key]: event.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="import-actions">
                <button type="button" onClick={() => runImport(true)} disabled={isImporting}>
                  Dry Run
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => runImport(false)}
                  disabled={isImporting}
                >
                  Apply Import
                </button>
              </div>

              {importError && <p className="error-text">{importError}</p>}

              {importResult && (
                <div className="import-summary">
                  <h3>Import Result</h3>
                  <div className="health-cards">
                    <article className="health-card">
                      <h3>Created</h3>
                      <strong>{importResult.summary.created}</strong>
                    </article>
                    <article className="health-card">
                      <h3>Updated</h3>
                      <strong>{importResult.summary.updated}</strong>
                    </article>
                    <article className="health-card">
                      <h3>Skipped</h3>
                      <strong>{importResult.summary.skipped}</strong>
                    </article>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
};
