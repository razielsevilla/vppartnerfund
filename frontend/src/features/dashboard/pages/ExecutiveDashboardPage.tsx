import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
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

export const ExecutiveDashboardPage = () => {
  const { user, logout } = useAuthSession();
  const [metrics, setMetrics] = useState<WorkflowKpiMetrics | null>(null);
  const [coverage, setCoverage] = useState<WorkflowCoverageInsights | null>(null);
  const [snapshots, setSnapshots] = useState<WorkflowSnapshot[]>([]);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [isTriggeringPeriod, setIsTriggeringPeriod] = useState<"weekly" | "monthly" | null>(null);
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
  const maxStageCount = stageCounts.reduce((max, stage) => Math.max(max, stage.count), 0);
  const hasStageData = stageCounts.length > 0;
  const stageConversion = metrics?.conversion.stageConversion ?? [];
  const hasConversionData = stageConversion.length > 0;
  const demandDistribution = coverage?.demandDistribution ?? [];
  const coverageGaps = coverage?.coverageGaps ?? [];

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
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>Executive Dashboard</h1>
          <p className="muted">Live performance overview for pipeline health and execution.</p>
        </div>
        <div className="user-actions">
          <nav className="page-nav-links" aria-label="Primary navigation">
            <Link to="/dashboard" className="link-button link-button-active">
              Dashboard
            </Link>
            <Link to="/partners" className="link-button">
              Partners
            </Link>
            <Link to="/tasks" className="link-button">
              Tasks
            </Link>
          </nav>
          <span>{user?.displayName}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
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
          <section className="dashboard-kpi-grid" aria-label="Executive KPI cards">
            <article className="dashboard-kpi-card">
              <h2>Active Partners</h2>
              <strong>{metrics.summary.totalActivePartners}</strong>
              <p>Current active portfolio count.</p>
              <Link to="/partners?status=active" className="table-link">
                Open active partners
              </Link>
            </article>

            <article className="dashboard-kpi-card dashboard-kpi-warning">
              <h2>Overdue Next Actions</h2>
              <strong>{metrics.overdueActions.count}</strong>
              <p>{`Threshold: ${metrics.overdueActions.thresholdDays} days since last touchpoint.`}</p>
              <Link
                to={`/tasks?queue=team&status=open&dueDateTo=${todayIso}`}
                className="table-link"
              >
                Open overdue task queue
              </Link>
            </article>

            <article className="dashboard-kpi-card">
              <h2>Overall Win Rate</h2>
              <strong>{formatPct(metrics.conversion.overallWinRatePct)}</strong>
              <p>Won-stage share across all active partners.</p>
              <Link to="/partners?status=active&phaseCode=won" className="table-link">
                Open won-stage partners
              </Link>
            </article>

            <article className="dashboard-kpi-card">
              <h2>Endpoint Response Time</h2>
              <strong>{`${metrics.summary.responseTimeMs} ms`}</strong>
              <p>Server aggregation runtime for current snapshot.</p>
              <Link to="/dashboard" className="table-link">
                Refresh dashboard
              </Link>
            </article>
          </section>

          <section className="dashboard-panel" aria-label="Stage count summary">
            <div className="dashboard-panel-head">
              <h2>Stage Distribution</h2>
              <p className="muted">Partner counts by pipeline phase.</p>
            </div>

            {!hasStageData && (
              <div className="status-card status-empty">
                <h2>No stage data yet</h2>
                <p>Stage metrics will appear after partners are created and assigned phases.</p>
              </div>
            )}

            {hasStageData && (
              <ul className="stage-list">
                {stageCounts.map((stage) => {
                  const barPct = maxStageCount > 0 ? (stage.count / maxStageCount) * 100 : 0;
                  return (
                    <li key={stage.phaseId} className="stage-list-item">
                      <div className="stage-list-meta">
                        <Link
                          to={`/partners?status=active&phaseCode=${toPhaseParam(stage.phaseCode)}`}
                          className="table-link"
                        >
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
          </section>

          <section className="dashboard-panel" aria-label="Conversion summary">
            <div className="dashboard-panel-head">
              <h2>Conversion by Stage</h2>
              <p className="muted">Progression quality between adjacent phases.</p>
            </div>

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
                        <td>{formatPct(entry.conversionRatePct)}</td>
                        <td>
                          <Link
                            to={`/partners?status=active&phaseCode=${toPhaseParam(entry.toPhaseCode)}`}
                            className="table-link"
                          >
                            Open {entry.toPhaseCode}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="dashboard-panel" aria-label="Strategic coverage insights">
            <div className="dashboard-panel-head">
              <h2>Strategic Coverage Insights</h2>
              <p className="muted">Demand distribution and actionable proposition coverage gaps.</p>
            </div>

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

            {demandDistribution.length === 0 && (
              <div className="status-card status-empty">
                <h2>No value proposition demand yet</h2>
                <p>Insights appear once teams map potential and confirmed value propositions.</p>
              </div>
            )}

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
                {coverageGaps.slice(0, 5).map((gap) => (
                  <article key={`gap-${gap.category}`} className="coverage-gap-item">
                    <div>
                      <h3>{gap.category}</h3>
                      <p>{gap.recommendedAction}</p>
                    </div>
                    <div className="coverage-gap-meta">
                      <span className={`coverage-severity coverage-severity-${gap.severity}`}>
                        {gap.severity.toUpperCase()}
                      </span>
                      <span>{`Gap: ${gap.gapCount}`}</span>
                      <Link
                        className="table-link"
                        to={`/partners?status=active&valueProp=${encodeURIComponent(gap.category)}&coverageState=gap`}
                      >
                        Review Partners
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-panel" aria-label="Snapshot reporting">
            <div className="dashboard-panel-head">
              <h2>Snapshot Reporting</h2>
              <p className="muted">Generate weekly or monthly snapshots and review historical outputs.</p>
            </div>

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

            {snapshots.length === 0 && (
              <div className="status-card status-empty">
                <h2>No snapshots yet</h2>
                <p>Trigger weekly or monthly generation to start snapshot history.</p>
              </div>
            )}

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
          </section>
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
