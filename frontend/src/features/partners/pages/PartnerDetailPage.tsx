import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPartnerRequest,
  getPartnerTimelineRequest,
  type PartnerRecord,
  type TimelineEntry,
} from "../services/partners-api";

export const PartnerDetailPage = () => {
  const { partnerId } = useParams();
  const [partner, setPartner] = useState<PartnerRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setError("Missing partner id");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [partnerData, timelineData] = await Promise.all([
          getPartnerRequest(partnerId),
          getPartnerTimelineRequest(partnerId),
        ]);
        if (!cancelled) {
          setPartner(partnerData);
          setTimeline(timelineData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load partner detail");
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
  }, [partnerId]);

  const subtitle = useMemo(() => {
    if (isLoading) {
      return "Loading partner detail...";
    }
    if (error) {
      return "Could not load partner timeline.";
    }
    return `${timeline.length} timeline entr${timeline.length === 1 ? "y" : "ies"}`;
  }, [error, isLoading, timeline.length]);

  return (
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>{partner?.organizationName || "Partner Detail"}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <Link to="/partners" className="link-button">
          Back to Registry
        </Link>
      </header>

      {isLoading && <p className="loading-state">Loading timeline...</p>}

      {!isLoading && error && (
        <div className="status-card status-error" role="alert">
          <h2>Unable to load partner detail</h2>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <section className="timeline-panel">
          <h2>Timeline and Audit Trail</h2>
          <p className="muted">Read-only history of workflow changes and partner actions.</p>

          {timeline.length === 0 && (
            <div className="status-card status-empty">
              <h2>No timeline activity yet</h2>
              <p>Entries will appear once users update this partner.</p>
            </div>
          )}

          {timeline.length > 0 && (
            <ol className="timeline-list">
              {timeline.map((entry) => (
                <li key={entry.id} className="timeline-item">
                  <div className="timeline-item-head">
                    <strong>{entry.kind === "status_change" ? "Status Change" : "Activity"}</strong>
                    <span>{new Date(entry.happenedAt).toLocaleString()}</span>
                  </div>
                  <p>
                    Actor: <strong>{entry.actorName}</strong>
                  </p>
                  {entry.kind === "status_change" && (
                    <p>
                      {entry.previousValue?.phaseName || entry.previousValue?.phaseId || "Unknown"} to{" "}
                      {entry.newValue?.phaseName || entry.newValue?.phaseId || "Unknown"}
                    </p>
                  )}
                  {entry.metadata && <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
};