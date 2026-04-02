import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { usePersistentState } from "../../../shared/hooks/usePersistentState";
import {
  getSettingsMasterDataRequest,
  listSettingsAuditLogRequest,
  updateTaxonomyRequest,
  updateWorkflowPhasesRequest,
  type SettingsAuditEntry,
  type TaxonomyItemSetting,
  type WorkflowPhaseSetting,
} from "../services/settings-api";

const TAXONOMY_KEYS = ["organization_type", "industry_niche", "impact_tier", "value_proposition"];

export const SettingsPage = () => {
  const { user } = useAuthSession();
  const [phases, setPhases] = useState<WorkflowPhaseSetting[]>([]);
  const [taxonomyKey, setTaxonomyKey] = useState<string>("value_proposition");
  const [taxonomyItems, setTaxonomyItems] = useState<TaxonomyItemSetting[]>([]);
  const [auditEntries, setAuditEntries] = useState<SettingsAuditEntry[]>([]);
  const [activeView, setActiveView] = usePersistentState<"phases" | "taxonomy" | "audit">(
    "ui:settings:active-view",
    "phases",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const isAdmin = user?.role === "vp_head";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [masterData, audits] = await Promise.all([
          getSettingsMasterDataRequest(),
          listSettingsAuditLogRequest(100), // Load more for client-side pagination
        ]);

        if (!cancelled) {
          setPhases(masterData.workflowPhases);
          const defaultItems = masterData.taxonomies[taxonomyKey] || [];
          setTaxonomyItems(defaultItems);
          setAuditEntries(audits);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [taxonomyKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeView, taxonomyKey]);

  const savePhases = async () => {
    if (!isAdmin) {
      return;
    }

    setMessage(null);
    setError(null);
    try {
      const updated = await updateWorkflowPhasesRequest(phases);
      setPhases(updated.workflowPhases);
      setMessage("Workflow phases updated.");
      setAuditEntries(await listSettingsAuditLogRequest(100));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update phases");
    }
  };

  const saveTaxonomy = async () => {
    if (!isAdmin) {
      return;
    }

    setMessage(null);
    setError(null);
    try {
      const updated = await updateTaxonomyRequest(
        taxonomyKey,
        taxonomyItems.map((item) => ({
          value: item.value,
          label: item.label,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        })),
      );
      setTaxonomyItems(updated.taxonomies[taxonomyKey] || []);
      setMessage(`Taxonomy ${taxonomyKey} updated.`);
      setAuditEntries(await listSettingsAuditLogRequest(100));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update taxonomy");
    }
  };

  const subtitle = useMemo(() => {
    if (isLoading) {
      return "Loading settings...";
    }
    return isAdmin
      ? "Manage workflow and taxonomy configuration safely."
      : "Read-only settings. VP Head required for updates.";
  }, [isAdmin, isLoading]);

  // Pagination logic
  const getPaginatedData = (data: any[]) => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  };

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    return (
      <div className="table-pagination-row">
        <span className="muted">
          Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} to{" "}
          {Math.min(totalItems, currentPage * pageSize)} of {totalItems}
        </span>
        <div className="table-pagination-controls">
          <button
            type="button"
            className="secondary-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="secondary-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="page-layout single-screen-page settings-page-container">
      <div className="settings-sidebar">
        <div className="sidebar-header">
          <h1>Settings</h1>
          <p className="muted">{subtitle}</p>
        </div>
        
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-link ${activeView === "phases" ? "is-active" : ""}`}
            onClick={() => setActiveView("phases")}
          >
            Workflow Phases
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeView === "audit" ? "is-active" : ""}`}
            onClick={() => setActiveView("audit")}
          >
            Audit Trail
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeView === "taxonomy" ? "is-active" : ""}`}
            onClick={() => setActiveView("taxonomy")}
          >
            Taxonomy Masters
          </button>
        </nav>

        {error && <p className="error-text sidebar-status">{error}</p>}
        {message && <p className="muted sidebar-status">{message}</p>}
      </div>

      <div className="settings-content">
        <div className="single-screen-content">
          {activeView === "phases" && (
            <section className="registry-panel" aria-label="Workflow phase settings">
              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Sort</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(phases).map((phase) => (
                      <tr key={phase.id}>
                        <td>{phase.code}</td>
                        <td>
                          <input
                            type="text"
                            value={phase.name}
                            disabled={!isAdmin || phase.code === "archived"}
                            onChange={(event) =>
                              setPhases((prev) =>
                                prev.map((entry) =>
                                  entry.id === phase.id ? { ...entry, name: event.target.value } : entry,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            value={phase.sortOrder}
                            disabled={!isAdmin}
                            onChange={(event) =>
                              setPhases((prev) =>
                                prev.map((entry) =>
                                  entry.id === phase.id
                                    ? { ...entry, sortOrder: Number(event.target.value || 1) }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={phase.isActive}
                            disabled={!isAdmin || phase.code === "archived"}
                            onChange={(event) =>
                              setPhases((prev) =>
                                prev.map((entry) =>
                                  entry.id === phase.id ? { ...entry, isActive: event.target.checked } : entry,
                                ),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="settings-actions-footer">
                {renderPagination(phases.length)}
                {isAdmin && (
                  <button type="button" className="secondary-btn" onClick={savePhases}>
                    Save Phase Settings
                  </button>
                )}
              </div>
            </section>
          )}

          {activeView === "taxonomy" && (
            <section className="registry-panel" aria-label="Taxonomy settings">
              <div className="taxonomy-header-row">
                <label className="settings-inline-field">
                  Taxonomy Key
                  <select
                    value={taxonomyKey}
                    onChange={(event) => setTaxonomyKey(event.target.value)}
                  >
                    {TAXONOMY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key.replace(/_/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Value</th>
                      <th>Label</th>
                      <th>Sort</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(taxonomyItems).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            value={item.value}
                            disabled={!isAdmin}
                            onChange={(event) =>
                              setTaxonomyItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, value: event.target.value } : entry,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.label}
                            disabled={!isAdmin}
                            onChange={(event) =>
                              setTaxonomyItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, label: event.target.value } : entry,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            value={item.sortOrder}
                            disabled={!isAdmin}
                            onChange={(event) =>
                              setTaxonomyItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id
                                    ? { ...entry, sortOrder: Number(event.target.value || 1) }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.isActive}
                            disabled={!isAdmin}
                            onChange={(event) =>
                              setTaxonomyItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, isActive: event.target.checked } : entry,
                                ),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="settings-actions-footer">
                {renderPagination(taxonomyItems.length)}
                {isAdmin && (
                  <button type="button" className="secondary-btn" onClick={saveTaxonomy}>
                    Save Taxonomy
                  </button>
                )}
              </div>
            </section>
          )}

          {activeView === "audit" && (
            <section className="registry-panel" aria-label="Settings audit trail">
              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(auditEntries).map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.domain}</td>
                        <td>{entry.action}</td>
                        <td>{entry.actorName}</td>
                        <td>{new Date(entry.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="settings-actions-footer">
                {renderPagination(auditEntries.length)}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
};
