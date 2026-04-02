import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { Modal } from "../../../shared/components/Modal";
import {
  createWorkflowSnapshotRequest,
  getWorkflowCoverageInsightsRequest,
  getWorkflowKpiMetricsRequest,
  listWorkflowSnapshotsRequest,
  type WorkflowCoverageInsights,
  type WorkflowKpiMetrics,
  type WorkflowSnapshot,
} from "../../partners/services/partners-api";

function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(2)}%`;
}

function toPhaseParam(phaseCode: string): string {
  return encodeURIComponent(phaseCode);
}

function getHealthTone(level: number, thresholds: { warning: number; danger: number; invert?: boolean }) {
  const { warning, danger, invert = false } = thresholds;

  if (invert) {
    if (level <= warning) {
      return "dashboard-kpi-success";
    }
    if (level >= danger) {
      return "dashboard-kpi-danger";
    }
    return "dashboard-kpi-warning";
  }

  if (level >= danger) {
    return "dashboard-kpi-danger";
  }
  if (level >= warning) {
    return "dashboard-kpi-warning";
  }
  return "dashboard-kpi-success";
}

export const ExecutiveDashboardPage = () => {
  useAuthSession();
  const [metrics, setMetrics] = useState<WorkflowKpiMetrics | null>(null);
  const [coverage, setCoverage] = useState<WorkflowCoverageInsights | null>(null);
  const [snapshots, setSnapshots] = useState<WorkflowSnapshot[]>([]);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [isTriggeringPeriod, setIsTriggeringPeriod] = useState<"weekly" | "monthly" | null>(null);
  const [activeModal, setActiveModal] = useState<"stage" | "conversion" | "coverage" | "snapshot" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [kpiData, coverageData] = await Promise.all([
          getWorkflowKpiMetricsRequest(),
          getWorkflowCoverageInsightsRequest(),
        ]);
        const snapshotData = await listWorkflowSnapshotsRequest({ limit: 8 });
        if (!cancelled) {
          setMetrics(kpiData);
          setCoverage(coverageData);
          setSnapshots(snapshotData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard metrics");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const stageCounts = metrics?.stageCounts ?? [];
  const hasStageData = stageCounts.length > 0;
  const stageConversion = metrics?.conversion.stageConversion ?? [];
  const hasConversionData = stageConversion.length > 0;
  const demandDistribution = coverage?.demandDistribution ?? [];
  const coverageGaps = coverage?.coverageGaps ?? [];
  const totalActivePartners = metrics?.summary.totalActivePartners || 0;
  const stagePreview = stageCounts.slice(0, 4);
  const conversionPreview = stageConversion.slice(0, 4);
  const gapPreview = coverageGaps.slice(0, 3);
  const snapshotPreview = snapshots.slice(0, 3);
  const winRateValue = Number(metrics?.conversion.overallWinRatePct || 0);
  const overdueValue = metrics?.overdueActions.count || 0;
  const gapCategoryValue = coverage?.summary.categoriesWithGaps || 0;

  const overdueCardClass = getHealthTone(overdueValue, { warning: 0, danger: 6, invert: true });
  const winRateCardClass = getHealthTone(winRateValue, { warning: 1, danger: 0 });
  const gapCardClass = getHealthTone(gapCategoryValue, { warning: 1, danger: 4, invert: true });

  const refreshSnapshotHistory = async () => {
    const history = await listWorkflowSnapshotsRequest({ limit: 8 });
    setSnapshots(history);
  };

  const triggerSnapshot = async (periodType: "weekly" | "monthly") => {
    setSnapshotMessage(null);
    setIsTriggeringPeriod(periodType);
    try {
      const snapshot = await createWorkflowSnapshotRequest(periodType);
      await refreshSnapshotHistory();
      setSnapshotMessage(
        `${snapshot.periodType} snapshot generated at ${new Date(snapshot.generatedAt).toLocaleString()}.`,
      );
    } catch (triggerError) {
      setSnapshotMessage(
        triggerError instanceof Error ? triggerError.message : "Failed to trigger snapshot",
      );
    } finally {
      setIsTriggeringPeriod(null);
    }
  };

  return (
    <main className="page-layout dashboard-page">
      <header className="page-header">
        <div>
          <h1>Executive Dashboard</h1>
          <p className="muted">Live performance overview for pipeline health and execution.</p>
        </div>
      </header>

      {isLoading && <p className="loading-state">Loading dashboard metrics...</p>}

      {!isLoading && error && (
        <div className="status-card status-error" role="alert">
          <h2>Failed to load dashboard</h2>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && metrics && (
        <>
          <div className="dashboard-screen">
            <section className="dashboard-kpi-grid" aria-label="Executive KPI cards">
              <article className="dashboard-kpi-card">
                <h2>Active Partners</h2>
                <strong>{metrics.summary.totalActivePartners}</strong>
                <p>Current active portfolio count.</p>
                <Link to="/partners?status=active" className="kpi-action">
                  Open active partners &gt;
                </Link>
              </article>

              <article className={`dashboard-kpi-card ${overdueCardClass}`}>
                <h2>Overdue Next Actions</h2>
                <strong>{metrics.overdueActions.count}</strong>
                <p>{`Threshold: ${metrics.overdueActions.thresholdDays} days since last touchpoint.`}</p>
                <Link
                  to={`/tasks?queue=team&status=open&dueDateTo=${todayIso}`}
                  className="kpi-action"
                >
                  Open overdue task queue &gt;
                </Link>
              </article>

              <article className={`dashboard-kpi-card ${winRateCardClass}`}>
                <h2>Overall Win Rate</h2>
                <strong>{formatPct(metrics.conversion.overallWinRatePct)}</strong>
                <p>Won-stage share across all active partners.</p>
                <Link to="/partners?status=active&phaseCode=won" className="kpi-action">
                  Open won-stage partners &gt;
                </Link>
              </article>

              <article className={`dashboard-kpi-card ${gapCardClass}`}>
                <h2>Coverage Gap Categories</h2>
                <strong>{gapCategoryValue}</strong>
                <p>Strategic categories with demand but weak confirmation coverage.</p>
                <button type="button" className="kpi-action" onClick={() => setActiveModal("coverage")}>
                  Review coverage gaps &gt;
                </button>
              </article>
            </section>
            <section className="dashboard-quick-grid" aria-label="Dashboard quick modules">
              <article
                className="dashboard-panel dashboard-module dashboard-module-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal("stage")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveModal("stage");
                  }
                }}
              >
                <div className="dashboard-panel-head">
                  <h2>Stage Distribution</h2>
                  <span className="muted">Click card for details</span>
                </div>
                {hasStageData ? (
                  <ul className="dashboard-mini-list">
                    {stagePreview.map((stage) => {
                      const barPct = totalActivePartners > 0 ? (stage.count / totalActivePartners) * 100 : 0;
                      return (
                        <li key={stage.phaseId}>
                          <div className="stage-list-meta">
                            <Link to={`/partners?status=active&phaseCode=${toPhaseParam(stage.phaseCode)}`} className="table-link">
                              {stage.phaseName}
                            </Link>
                            <strong>{stage.count}</strong>
                          </div>
                          <div className="stage-progress-track" aria-hidden="true">
                            <span className="stage-progress-fill" style={{ width: `${barPct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted">No stage data yet.</p>
                )}
              </article>

              <article
                className="dashboard-panel dashboard-module dashboard-module-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal("conversion")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveModal("conversion");
                  }
                }}
              >
                <div className="dashboard-panel-head">
                  <h2>Conversion by Stage</h2>
                  <span className="muted">Click card for details</span>
                </div>
                {hasConversionData ? (
                  <ul className="dashboard-mini-list">
                    {conversionPreview.map((entry) => (
                      <li key={`${entry.fromPhaseCode}-${entry.toPhaseCode}`}>
                        <div className="stage-list-meta">
                          <span>{`${entry.fromPhaseCode} to ${entry.toPhaseCode}`}</span>
                          <strong className="conversion-rate-highlight">{formatPct(entry.conversionRatePct)}</strong>
                        </div>
                        <p className="muted">{`${entry.toCount}/${entry.fromCount} progressed`}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No conversion data yet.</p>
                )}
              </article>

              <article
                className="dashboard-panel dashboard-module dashboard-module-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal("coverage")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveModal("coverage");
                  }
                }}
              >
                <div className="dashboard-panel-head">
                  <h2>Coverage Insights</h2>
                  <span className="muted">Click card for details</span>
                </div>
                <div className="dashboard-inline-metrics">
                  <span>{`Tracked: ${coverage?.summary.categoriesTracked || 0}`}</span>
                  <span>{`With Gaps: ${coverage?.summary.categoriesWithGaps || 0}`}</span>
                </div>
                {gapPreview.length > 0 ? (
                  <ul className="dashboard-mini-list">
                    {gapPreview.map((gap) => (
                      <li key={gap.category}>
                        <div className="stage-list-meta">
                          <span>{gap.category}</span>
                          <span className={`coverage-severity coverage-severity-${gap.severity}`}>
                            {gap.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="muted">{gap.recommendedAction}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No coverage gaps identified.</p>
                )}
              </article>

              <article
                className="dashboard-panel dashboard-module dashboard-module-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal("snapshot")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveModal("snapshot");
                  }
                }}
              >
                <div className="dashboard-panel-head">
                  <h2>Snapshot Reporting</h2>
                  <span className="muted">Click card for details</span>
                </div>
                <div className="snapshot-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={isTriggeringPeriod === "weekly"}
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerSnapshot("weekly");
                    }}
                  >
                    {isTriggeringPeriod === "weekly" ? "Generating Weekly..." : "Generate Weekly"}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={isTriggeringPeriod === "monthly"}
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerSnapshot("monthly");
                    }}
                  >
                    {isTriggeringPeriod === "monthly" ? "Generating Monthly..." : "Generate Monthly"}
                  </button>
                </div>
                {snapshotMessage && <p className="muted snapshot-feedback">{snapshotMessage}</p>}
                {snapshotPreview.length > 0 ? (
                  <ul className="dashboard-mini-list">
                    {snapshotPreview.map((snapshot) => (
                      <li key={snapshot.id}>
                        <div className="stage-list-meta">
                          <span>{snapshot.periodType}</span>
                          <strong>{snapshot.periodEnd}</strong>
                        </div>
                        <p className="muted">{`${snapshot.metrics?.kpi.summary.totalActivePartners ?? "--"} active partners`}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No snapshots generated yet.</p>
                )}
              </article>
            </section>
          </div>

          <Modal title="Stage Distribution" open={activeModal === "stage"} onClose={() => setActiveModal(null)}>
            {!hasStageData && (
              <div className="status-card status-empty">
                <h2>No stage data yet</h2>
                <p>Stage metrics will appear after partners are created and assigned phases.</p>
              </div>
            )}
            {hasStageData && (
              <ul className="stage-list">
                {stageCounts.map((stage) => {
                  const barPct = totalActivePartners > 0 ? (stage.count / totalActivePartners) * 100 : 0;
                  return (
                    <li key={stage.phaseId} className="stage-list-item">
                      <div className="stage-list-meta">
                        <Link to={`/partners?status=active&phaseCode=${toPhaseParam(stage.phaseCode)}`} className="table-link">
                          {stage.phaseName}
                        </Link>
                        <strong>{stage.count}</strong>
                      </div>
                      <div className="stage-progress-track" aria-hidden="true">
                        <span className="stage-progress-fill" style={{ width: `${barPct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Modal>

          <Modal title="Conversion by Stage" open={activeModal === "conversion"} onClose={() => setActiveModal(null)}>
            {!hasConversionData && (
              <div className="status-card status-empty">
                <h2>No conversion data yet</h2>
                <p>Conversion metrics will appear once stages have active records.</p>
              </div>
            )}
            {hasConversionData && (
              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>From Count</th>
                      <th>To Count</th>
                      <th>Conversion Rate</th>
                      <th>Drill Down</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageConversion.map((entry) => (
                      <tr key={`${entry.fromPhaseCode}-${entry.toPhaseCode}`}>
                        <td>{entry.fromPhaseCode}</td>
                        <td>{entry.toPhaseCode}</td>
                        <td>{entry.fromCount}</td>
                        <td>{entry.toCount}</td>
                        <td>
                          <strong className="conversion-rate-highlight">{formatPct(entry.conversionRatePct)}</strong>
                        </td>
                        <td>
                          <Link to={`/partners?status=active&phaseCode=${toPhaseParam(entry.toPhaseCode)}`} className="table-link">
                            Open {entry.toPhaseCode}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Modal>

          <Modal title="Strategic Coverage Insights" open={activeModal === "coverage"} onClose={() => setActiveModal(null)}>
            <div className="dashboard-kpi-grid">
              <article className="dashboard-kpi-card">
                <h2>Categories Tracked</h2>
                <strong>{coverage?.summary.categoriesTracked || 0}</strong>
                <p>Distinct value proposition categories in active qualification profiles.</p>
              </article>
              <article className="dashboard-kpi-card dashboard-kpi-warning">
                <h2>Categories With Gaps</h2>
                <strong>{coverage?.summary.categoriesWithGaps || 0}</strong>
                <p>Potential demand exists but confirmation is still incomplete.</p>
              </article>
            </div>

            {demandDistribution.length > 0 && (
              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Demand</th>
                      <th>Confirmed</th>
                      <th>Gap</th>
                      <th>Coverage</th>
                      <th>Drill Down</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandDistribution.map((entry) => (
                      <tr key={entry.category}>
                        <td>{entry.category}</td>
                        <td>{entry.demandCount}</td>
                        <td>{entry.confirmedCount}</td>
                        <td>{entry.gapCount}</td>
                        <td>{formatPct(entry.coverageRatePct)}</td>
                        <td>
                          <Link
                            className="table-link"
                            to={`/partners?status=active&valueProp=${encodeURIComponent(entry.category)}&coverageState=gap`}
                          >
                            Open gap partners
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {coverageGaps.length > 0 && (
              <div className="coverage-gap-list">
                {coverageGaps.map((gap) => (
                  <article key={`modal-gap-${gap.category}`} className="coverage-gap-item">
                    <div>
                      <h3>{gap.category}</h3>
                      <p>{gap.recommendedAction}</p>
                    </div>
                    <div className="coverage-gap-meta">
                      <span className={`coverage-severity coverage-severity-${gap.severity}`}>
                        {gap.severity.toUpperCase()}
                      </span>
                      <span>{`Gap: ${gap.gapCount}`}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Modal>

          <Modal title="Snapshot Reporting" open={activeModal === "snapshot"} onClose={() => setActiveModal(null)}>
            <div className="snapshot-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={isTriggeringPeriod === "weekly"}
                onClick={() => triggerSnapshot("weekly")}
              >
                {isTriggeringPeriod === "weekly" ? "Generating Weekly..." : "Generate Weekly Snapshot"}
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={isTriggeringPeriod === "monthly"}
                onClick={() => triggerSnapshot("monthly")}
              >
                {isTriggeringPeriod === "monthly" ? "Generating Monthly..." : "Generate Monthly Snapshot"}
              </button>
            </div>

            {snapshotMessage && <p className="muted snapshot-feedback">{snapshotMessage}</p>}

            {snapshots.length > 0 && (
              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Window Start</th>
                      <th>Window End</th>
                      <th>Generated At</th>
                      <th>Active Partners</th>
                      <th>Coverage Gap Categories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id}>
                        <td>{snapshot.periodType}</td>
                        <td>{snapshot.periodStart}</td>
                        <td>{snapshot.periodEnd}</td>
                        <td>{new Date(snapshot.generatedAt).toLocaleString()}</td>
                        <td>{snapshot.metrics?.kpi.summary.totalActivePartners ?? "--"}</td>
                        <td>{snapshot.metrics?.coverage.summary.categoriesWithGaps ?? "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Modal>
        </>
      )}

      {!isLoading && !error && !metrics && (
        <div className="status-card status-empty">
          <h2>No dashboard data</h2>
          <p>Metrics are temporarily unavailable.</p>
        </div>
      )}
    </main>
  );
};
