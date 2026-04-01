import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPartnerRequest,
  getPartnerQualificationRequest,
  getPartnerTimelineRequest,
  upsertPartnerQualificationRequest,
  type PartnerRecord,
  type QualificationProfile,
  type TimelineEntry,
} from "../services/partners-api";

const VALUE_PROPOSITION_OPTIONS = [
  "Brand Visibility",
  "Developer Community Access",
  "Talent Pipeline",
  "Product Adoption",
  "Research Collaboration",
  "Event Activation",
  "CSR Impact",
  "Market Expansion",
];

const defaultQualification: QualificationProfile = {
  durationCategory: null,
  impactLevel: null,
  functionalRole: null,
  potentialValuePropositions: [],
  confirmedValuePropositions: [],
  updatedBy: null,
  createdAt: null,
  updatedAt: null,
};

export const PartnerDetailPage = () => {
  const { partnerId } = useParams();
  const [partner, setPartner] = useState<PartnerRecord | null>(null);
  const [qualification, setQualification] = useState<QualificationProfile>(defaultQualification);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualificationMessage, setQualificationMessage] = useState<string | null>(null);
  const [isSavingQualification, setIsSavingQualification] = useState(false);

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
        const [partnerData, qualificationData, timelineData] = await Promise.all([
          getPartnerRequest(partnerId),
          getPartnerQualificationRequest(partnerId),
          getPartnerTimelineRequest(partnerId),
        ]);
        if (!cancelled) {
          setPartner(partnerData);
          setQualification(qualificationData || defaultQualification);
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

  const toggleValueProposition = (
    target: "potentialValuePropositions" | "confirmedValuePropositions",
    value: string,
  ) => {
    setQualification((prev) => {
      const current = new Set(prev[target]);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }

      return {
        ...prev,
        [target]: [...current],
      };
    });
  };

  const saveQualification = async () => {
    if (!partnerId) {
      return;
    }

    setIsSavingQualification(true);
    setQualificationMessage(null);
    try {
      const saved = await upsertPartnerQualificationRequest(partnerId, {
        durationCategory: qualification.durationCategory,
        impactLevel: qualification.impactLevel,
        functionalRole: qualification.functionalRole,
        potentialValuePropositions: qualification.potentialValuePropositions,
        confirmedValuePropositions: qualification.confirmedValuePropositions,
      });
      setQualification(saved);
      setQualificationMessage("Qualification mapping saved.");
    } catch (saveError) {
      setQualificationMessage(
        saveError instanceof Error ? saveError.message : "Failed to save qualification mapping",
      );
    } finally {
      setIsSavingQualification(false);
    }
  };

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
        <>
          <section className="timeline-panel">
            <h2>Qualification Mapping</h2>
            <p className="muted">Separate potential and confirmed value proposition alignment.</p>

            <div className="qualification-grid">
              <label>
                Duration
                <select
                  value={qualification.durationCategory || ""}
                  onChange={(event) =>
                    setQualification((prev) => ({
                      ...prev,
                      durationCategory: (event.target.value || null) as QualificationProfile["durationCategory"],
                    }))
                  }
                >
                  <option value="">Unspecified</option>
                  <option value="short_term">Short Term</option>
                  <option value="mid_term">Mid Term</option>
                  <option value="long_term">Long Term</option>
                </select>
              </label>

              <label>
                Impact
                <select
                  value={qualification.impactLevel || ""}
                  onChange={(event) =>
                    setQualification((prev) => ({
                      ...prev,
                      impactLevel: (event.target.value || null) as QualificationProfile["impactLevel"],
                    }))
                  }
                >
                  <option value="">Unspecified</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="transformational">Transformational</option>
                </select>
              </label>

              <label>
                Function Role
                <input
                  type="text"
                  value={qualification.functionalRole || ""}
                  onChange={(event) =>
                    setQualification((prev) => ({
                      ...prev,
                      functionalRole: event.target.value || null,
                    }))
                  }
                  placeholder="e.g. Strategic Sponsor"
                />
              </label>
            </div>

            <div className="value-prop-columns">
              <div>
                <h3>Potential Value Propositions</h3>
                {VALUE_PROPOSITION_OPTIONS.map((option) => (
                  <label key={`potential:${option}`} className="check-item">
                    <input
                      type="checkbox"
                      checked={qualification.potentialValuePropositions.includes(option)}
                      onChange={() => toggleValueProposition("potentialValuePropositions", option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <div>
                <h3>Confirmed Value Propositions</h3>
                {VALUE_PROPOSITION_OPTIONS.map((option) => (
                  <label key={`confirmed:${option}`} className="check-item">
                    <input
                      type="checkbox"
                      checked={qualification.confirmedValuePropositions.includes(option)}
                      onChange={() => toggleValueProposition("confirmedValuePropositions", option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="qualification-actions">
              <button type="button" onClick={saveQualification} disabled={isSavingQualification}>
                {isSavingQualification ? "Saving..." : "Save Qualification Mapping"}
              </button>
              {qualificationMessage && <p className="muted">{qualificationMessage}</p>}
            </div>
          </section>

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
        </>
      )}
    </main>
  );
};