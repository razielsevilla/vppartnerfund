import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { listTasksRequest, type TaskRecord } from "../../tasks/services/tasks-api";
import {
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
  const { user, logout } = useAuthSession();
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
  const [pendingDuplicateCandidates, setPendingDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<{
    organizationName: string;
    organizationType: string;
    industryNiche: string;
    currentPhaseId: string;
    impactTier: "" | "standard" | "major" | "lead";
    location: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    organizationName: "",
    organizationType: "",
    industryNiche: "",
    currentPhaseId: "phase_lead",
    impactTier: "" as "" | "standard" | "major" | "lead",
    location: "",
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

  const submitCreate = async (confirmDuplicate: boolean) => {
    const payloadSource = pendingCreatePayload || createForm;
    setCreateError(null);
    setIsCreating(true);

    try {
      await createPartnerRequest({
        organizationName: payloadSource.organizationName,
        organizationType: payloadSource.organizationType,
        industryNiche: payloadSource.industryNiche,
        currentPhaseId: payloadSource.currentPhaseId,
        impactTier: payloadSource.impactTier,
        location: payloadSource.location,
        confirmDuplicate,
      });

      setPendingCreatePayload(null);
      setPendingDuplicateCandidates([]);
      setCreateForm({
        organizationName: "",
        organizationType: "",
        industryNiche: "",
        currentPhaseId: "phase_lead",
        impactTier: "",
        location: "",
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
    setPendingCreatePayload(null);
    setPendingDuplicateCandidates([]);
    await submitCreate(false);
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

  return (
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>Partner Registry</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="user-actions">
          <nav className="page-nav-links" aria-label="Primary navigation">
            <Link to="/dashboard" className="link-button">
              Dashboard
            </Link>
            <Link to="/partners" className="link-button link-button-active">
              Partners
            </Link>
            <Link to="/tasks" className="link-button">
              Tasks
            </Link>
            <Link to="/settings" className="link-button">
              Settings
            </Link>
          </nav>
          <span>{user?.displayName}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
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
          Industry
          <input
            type="text"
            placeholder="e.g. Technology"
            value={filters.industryNiche}
            onChange={(event) => onFilterChange("industryNiche", event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => onFilterChange("status", event.target.value as FilterState["status"])}
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

      <section className="health-metrics-panel" aria-label="Pipeline health metrics">
        <h2>Pipeline Health</h2>
        {metricsError && <p className="error-text">{metricsError}</p>}
        {!metricsError && metrics && (
          <div className="health-cards">
            <article className="health-card">
              <h3>Active Partners</h3>
              <strong>{metrics.summary.totalActivePartners}</strong>
            </article>
            <article className="health-card health-card-warning">
              <h3>Overdue Next Actions</h3>
              <strong>{metrics.summary.overdueNextActionCount}</strong>
              <p>{`Threshold: ${metrics.summary.overdueNextActionDaysThreshold} days`}</p>
            </article>
            <article className="health-card health-card-danger">
              <h3>Stalled Partners</h3>
              <strong>{metrics.summary.stalledPartnerCount}</strong>
              <p>From stage threshold rules</p>
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

      <section className="registry-create-panel" aria-label="Create partner">
        <h2>Add Partner</h2>
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
          <input
            required
            type="text"
            placeholder="Type"
            value={createForm.organizationType}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, organizationType: event.target.value }))
            }
          />
          <input
            required
            type="text"
            placeholder="Industry"
            value={createForm.industryNiche}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, industryNiche: event.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Location"
            value={createForm.location}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, location: event.target.value }))}
          />
          <select
            value={createForm.impactTier}
            onChange={(event) =>
              setCreateForm((prev) => ({
                ...prev,
                impactTier: event.target.value as "" | "standard" | "major" | "lead",
              }))
            }
          >
            <option value="">Impact (any)</option>
            <option value="standard">Standard</option>
            <option value="major">Major</option>
            <option value="lead">Lead</option>
          </select>
          <button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Partner"}
          </button>
        </form>

        {createError && <p className="error-text">{createError}</p>}

        {pendingDuplicateCandidates.length > 0 && (
          <div className="duplicate-warning" role="alert">
            <h3>Possible duplicates found</h3>
            <ul>
              {pendingDuplicateCandidates.map((candidate) => (
                <li key={candidate.id}>
                  {candidate.organizationName} ({Math.round(candidate.similarity * 100)}% similar)
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => submitCreate(true)} disabled={isCreating}>
              Confirm Intentional Duplicate
            </button>
          </div>
        )}
      </section>

      <section className="registry-create-panel" aria-label="Spreadsheet import">
        <h2>Spreadsheet Import</h2>
        <p className="muted">Paste CSV/TSV exported from Sheets, map columns, and run dry-run before apply.</p>

        <div className="import-grid">
          <label>
            Sheet Data
            <textarea
              className="import-textarea"
              value={sheetText}
              onChange={(event) => setSheetText(event.target.value)}
              placeholder="Organization Name,Type,Industry,Phase,Impact,Location"
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
          <button
            type="button"
            className="secondary-btn"
            disabled={isImporting}
            onClick={() => runImport(true)}
          >
            {isImporting ? "Processing..." : "Dry Run"}
          </button>
          <button type="button" disabled={isImporting} onClick={() => runImport(false)}>
            {isImporting ? "Processing..." : "Apply Import"}
          </button>
        </div>

        {importError && <p className="error-text">{importError}</p>}

        {importResult && (
          <div className="import-summary" role="status">
            <h3>{importResult.dryRun ? "Dry-Run Summary" : "Import Summary"}</h3>
            <p className="muted">{`Executed: ${new Date(importResult.executedAt).toLocaleString()}`}</p>
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
              <article className="health-card health-card-danger">
                <h3>Failed</h3>
                <strong>{importResult.summary.failed}</strong>
              </article>
            </div>
            <div className="registry-table-wrap">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Action</th>
                    <th>Organization</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.results.slice(0, 20).map((entry) => (
                    <tr key={`${entry.rowNumber}-${entry.organizationName || "row"}`}>
                      <td>{entry.rowNumber}</td>
                      <td>{entry.action}</td>
                      <td>{entry.organizationName || "-"}</td>
                      <td>{entry.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="registry-panel">
        {isLoadingPartners && <p className="loading-state">Loading partners...</p>}

        {!isLoadingPartners && partnersError && (
          <div className="status-card status-error" role="alert">
            <h2>Failed to load partner registry</h2>
            <p>{partnersError}</p>
          </div>
        )}

        {!isLoadingPartners && !partnersError && filteredPartners.length === 0 && (
          <div className="status-card status-empty">
            <h2>No partners found</h2>
            <p>Try adjusting search or filter values to broaden results.</p>
          </div>
        )}

        {!isLoadingPartners && !partnersError && filteredPartners.length > 0 && (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Industry</th>
                  <th>Impact</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((partner) => (
                  <tr key={partner.id}>
                    <td>
                      <Link to={`/partners/${partner.id}`} className="table-link">
                        {partner.organizationName}
                      </Link>
                    </td>
                    <td>{partner.organizationType}</td>
                    <td>{partner.industryNiche}</td>
                    <td>{partner.impactTier || "-"}</td>
                    <td>{partner.archivedAt ? "Archived" : "Active"}</td>
                    <td>{partner.location || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
