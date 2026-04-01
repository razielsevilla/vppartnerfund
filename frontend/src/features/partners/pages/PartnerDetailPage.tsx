import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  artifactFileUrl,
  listArtifactsRequest,
  updateArtifactStatusRequest,
  uploadArtifactRequest,
  type ArtifactRecord,
  type ArtifactStatus,
} from "../../vault/services/vault-api";
import {
  createDiscoveryNoteRequest,
  getPartnerRequest,
  getPartnerQualificationRequest,
  getPartnerTimelineRequest,
  getWorkflowConfigRequest,
  listDiscoveryNotesRequest,
  listDiscoveryNoteTemplatesRequest,
  transitionPartnerPhaseRequest,
  updateDiscoveryNoteRequest,
  upsertPartnerQualificationRequest,
  type DiscoveryNoteGuidedAnswer,
  type DiscoveryNoteRecord,
  type DiscoveryNoteTemplate,
  type PartnerRecord,
  type QualificationProfile,
  type TimelineEntry,
  type WorkflowPhase,
  WorkflowTransitionError,
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

const defaultGuidedAnswer: DiscoveryNoteGuidedAnswer = {
  question: "",
  answer: "",
};

const CLIENT_ALLOWED_ARTIFACT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const CLIENT_MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;

export const PartnerDetailPage = () => {
  const { partnerId } = useParams();
  const [partner, setPartner] = useState<PartnerRecord | null>(null);
  const [qualification, setQualification] = useState<QualificationProfile>(defaultQualification);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [discoveryTemplates, setDiscoveryTemplates] = useState<DiscoveryNoteTemplate[]>([]);
  const [discoveryNotes, setDiscoveryNotes] = useState<DiscoveryNoteRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [guidedAnswers, setGuidedAnswers] = useState<DiscoveryNoteGuidedAnswer[]>([]);
  const [freeformText, setFreeformText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notesMessage, setNotesMessage] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [artifactDocumentType, setArtifactDocumentType] = useState("proposal");
  const [artifactStatus, setArtifactStatus] = useState<ArtifactStatus>("pending_review");
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [artifactNameFilter, setArtifactNameFilter] = useState("");
  const [artifactTypeFilter, setArtifactTypeFilter] = useState("");
  const [artifactStatusFilter, setArtifactStatusFilter] = useState<"" | ArtifactStatus>("");
  const [artifactMessage, setArtifactMessage] = useState<string | null>(null);
  const [isUploadingArtifact, setIsUploadingArtifact] = useState(false);
  const [workflowPhases, setWorkflowPhases] = useState<WorkflowPhase[]>([]);
  const [targetPhaseId, setTargetPhaseId] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [transitionBlockingDetails, setTransitionBlockingDetails] = useState<string[]>([]);
  const [isTransitioningPhase, setIsTransitioningPhase] = useState(false);
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
        const [templatesData, notesData] = await Promise.all([
          listDiscoveryNoteTemplatesRequest(partnerId),
          listDiscoveryNotesRequest(partnerId),
        ]);
        const workflowConfig = await getWorkflowConfigRequest();
        const artifactsData = await listArtifactsRequest(partnerId);
        if (!cancelled) {
          setPartner(partnerData);
          setQualification(qualificationData || defaultQualification);
          setTimeline(timelineData);
          setDiscoveryTemplates(templatesData);
          setDiscoveryNotes(notesData);
          setArtifacts(artifactsData);
          setWorkflowPhases(workflowConfig.phases.filter((phase) => phase.isActive));
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

  const selectedTemplate = discoveryTemplates.find((template) => template.id === selectedTemplateId) || null;

  const applyTemplateQuestions = (templateId: string) => {
    const template = discoveryTemplates.find((item) => item.id === templateId);
    if (!template) {
      setGuidedAnswers([]);
      return;
    }

    setGuidedAnswers(template.questions.map((question) => ({ question, answer: "" })));
  };

  const refreshNotesAndTimeline = async (targetPartnerId: string) => {
    const [timelineData, notesData] = await Promise.all([
      getPartnerTimelineRequest(targetPartnerId),
      listDiscoveryNotesRequest(targetPartnerId),
    ]);
    setTimeline(timelineData);
    setDiscoveryNotes(notesData);
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

  const updateGuidedAnswer = (index: number, nextAnswer: string) => {
    setGuidedAnswers((prev) =>
      prev.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, answer: nextAnswer } : entry,
      ),
    );
  };

  const beginEditNote = (note: DiscoveryNoteRecord) => {
    setEditingNoteId(note.id);
    setSelectedTemplateId(note.templateId || "");
    setGuidedAnswers(
      note.guidedAnswers.length > 0 ? note.guidedAnswers : [{ ...defaultGuidedAnswer }],
    );
    setFreeformText(note.freeformText || "");
    setNotesMessage(null);
  };

  const resetNoteComposer = () => {
    setEditingNoteId(null);
    setSelectedTemplateId("");
    setGuidedAnswers([]);
    setFreeformText("");
  };

  const saveDiscoveryNote = async () => {
    if (!partnerId) {
      return;
    }

    const nonEmptyGuidedAnswers = guidedAnswers.filter(
      (item) => item.question.trim() && item.answer.trim(),
    );

    if (nonEmptyGuidedAnswers.length === 0 && !freeformText.trim()) {
      setNotesMessage("Provide at least one guided answer or freeform note.");
      return;
    }

    setIsSavingNote(true);
    setNotesMessage(null);
    try {
      const payload = {
        templateId: selectedTemplateId || undefined,
        templateName: selectedTemplate?.name,
        guidedAnswers: nonEmptyGuidedAnswers,
        freeformText: freeformText.trim() || undefined,
      };

      if (editingNoteId) {
        await updateDiscoveryNoteRequest(partnerId, editingNoteId, payload);
      } else {
        await createDiscoveryNoteRequest(partnerId, payload);
      }

      await refreshNotesAndTimeline(partnerId);
      setNotesMessage(editingNoteId ? "Discovery note updated." : "Discovery note saved.");
      resetNoteComposer();
    } catch (saveError) {
      setNotesMessage(saveError instanceof Error ? saveError.message : "Failed to save discovery note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const refreshArtifacts = async (targetPartnerId: string) => {
    const records = await listArtifactsRequest(targetPartnerId);
    setArtifacts(records);
  };

  const uploadArtifact = async () => {
    if (!partnerId || !artifactFile) {
      setArtifactMessage("Select a file to upload.");
      return;
    }

    if (!artifactDocumentType.trim()) {
      setArtifactMessage("Document type is required.");
      return;
    }

    if (!CLIENT_ALLOWED_ARTIFACT_TYPES.includes(artifactFile.type)) {
      setArtifactMessage("Unsupported file type. Upload PDF, PNG, JPG, TXT, or DOCX.");
      return;
    }

    if (artifactFile.size > CLIENT_MAX_ARTIFACT_BYTES) {
      setArtifactMessage("File is too large. Maximum size is 10 MB.");
      return;
    }

    setIsUploadingArtifact(true);
    setArtifactMessage(null);
    try {
      await uploadArtifactRequest(partnerId, {
        file: artifactFile,
        documentType: artifactDocumentType,
        status: artifactStatus,
      });
      await refreshArtifacts(partnerId);
      await refreshNotesAndTimeline(partnerId);
      setArtifactFile(null);
      setArtifactMessage(`Artifact uploaded for ${artifactDocumentType.trim().toLowerCase()}.`);
    } catch (uploadError) {
      setArtifactMessage(uploadError instanceof Error ? uploadError.message : "Failed to upload artifact");
    } finally {
      setIsUploadingArtifact(false);
    }
  };

  const startReplacementFlow = (documentType: string) => {
    setArtifactDocumentType(documentType);
    setArtifactStatus("active");
    setArtifactMessage(`Replacement mode: upload a new ${documentType} version.`);
  };

  const changeArtifactStatus = async (artifactId: string, status: ArtifactStatus) => {
    if (!partnerId) {
      return;
    }

    setArtifactMessage(null);
    try {
      await updateArtifactStatusRequest(artifactId, status);
      await refreshArtifacts(partnerId);
      await refreshNotesAndTimeline(partnerId);
      setArtifactMessage("Artifact status updated.");
    } catch (statusError) {
      setArtifactMessage(statusError instanceof Error ? statusError.message : "Failed to update artifact status");
    }
  };

  const transitionPhase = async () => {
    if (!partnerId || !targetPhaseId) {
      setTransitionMessage("Select a target phase first.");
      return;
    }

    setIsTransitioningPhase(true);
    setTransitionMessage(null);
    setTransitionBlockingDetails([]);
    try {
      const updatedPartner = await transitionPartnerPhaseRequest(partnerId, {
        toPhaseId: targetPhaseId,
        reason: transitionReason.trim() || undefined,
      });

      setPartner(updatedPartner);
      await refreshNotesAndTimeline(partnerId);
      setTransitionMessage(`Transitioned to ${targetPhaseId}.`);
      setTransitionReason("");
    } catch (transitionError) {
      if (transitionError instanceof WorkflowTransitionError) {
        const detailMessages = transitionError.details.flatMap((entry) => {
          const lines = [];
          if (entry.message && typeof entry.message === "string") {
            lines.push(entry.message);
          }

          if (Array.isArray(entry.requiredFields)) {
            lines.push(`Missing fields: ${entry.requiredFields.join(", ")}`);
          }

          if (Array.isArray(entry.requiredArtifacts)) {
            lines.push(
              `Required artifacts: ${entry.requiredArtifacts
                .map((item) => `${String((item as { documentType?: string }).documentType)} (${String((item as { requiredStatus?: string }).requiredStatus)})`)
                .join(", ")}`,
            );
          }

          return lines;
        });

        setTransitionBlockingDetails(detailMessages);
        setTransitionMessage(transitionError.message);
      } else {
        setTransitionMessage(
          transitionError instanceof Error
            ? transitionError.message
            : "Failed to transition partner phase",
        );
      }
    } finally {
      setIsTransitioningPhase(false);
    }
  };

  const filteredArtifacts = useMemo(() => {
    const nameFilter = artifactNameFilter.trim().toLowerCase();

    return artifacts.filter((artifact) => {
      if (artifactTypeFilter && artifact.documentType !== artifactTypeFilter) {
        return false;
      }
      if (artifactStatusFilter && artifact.status !== artifactStatusFilter) {
        return false;
      }
      if (nameFilter && !artifact.fileName.toLowerCase().includes(nameFilter)) {
        return false;
      }
      return true;
    });
  }, [artifactNameFilter, artifactStatusFilter, artifactTypeFilter, artifacts]);

  const artifactsByType = useMemo(() => {
    const grouped = new Map<string, ArtifactRecord[]>();
    for (const artifact of filteredArtifacts) {
      const key = artifact.documentType || "general";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(artifact);
    }

    return Array.from(grouped.entries()).map(([documentType, records]) => ({
      documentType,
      records: [...records].sort((left, right) => right.versionNumber - left.versionNumber),
    }));
  }, [filteredArtifacts]);

  const artifactTypeOptions = useMemo(
    () => [...new Set(artifacts.map((artifact) => artifact.documentType))].sort(),
    [artifacts],
  );

  const artifactStatusLabel = (status: ArtifactStatus) => {
    if (status === "pending_review") {
      return "Pending Review";
    }
    if (status === "active") {
      return "Active";
    }
    return "Archived";
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
            <h2>Workflow Transition</h2>
            <p className="muted">Move partner to the next phase once transition requirements are satisfied.</p>

            <div className="artifact-upload-grid">
              <label>
                Current Phase
                <input type="text" value={partner?.currentPhaseId || ""} disabled />
              </label>
              <label>
                Target Phase
                <select value={targetPhaseId} onChange={(event) => setTargetPhaseId(event.target.value)}>
                  <option value="">Select phase</option>
                  {workflowPhases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason (optional)
                <input
                  type="text"
                  value={transitionReason}
                  onChange={(event) => setTransitionReason(event.target.value)}
                  placeholder="Transition reason"
                />
              </label>
            </div>

            <div className="qualification-actions">
              <button type="button" onClick={transitionPhase} disabled={isTransitioningPhase}>
                {isTransitioningPhase ? "Transitioning..." : "Transition Phase"}
              </button>
              {transitionMessage && <p className="muted">{transitionMessage}</p>}
            </div>

            {transitionBlockingDetails.length > 0 && (
              <div className="status-card status-error" role="alert">
                <h2>Transition blocked</h2>
                <ul>
                  {transitionBlockingDetails.map((line, index) => (
                    <li key={`${line}:${index}`}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="timeline-panel">
            <h2>Artifact Vault</h2>
            <p className="muted">Upload and track document versions by artifact type.</p>

            <div className="artifact-upload-grid">
              <label>
                Filter by File Name
                <input
                  type="text"
                  value={artifactNameFilter}
                  onChange={(event) => setArtifactNameFilter(event.target.value)}
                  placeholder="Search artifacts"
                />
              </label>
              <label>
                Filter by Type
                <select
                  value={artifactTypeFilter}
                  onChange={(event) => setArtifactTypeFilter(event.target.value)}
                >
                  <option value="">All types</option>
                  {artifactTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Filter by Status
                <select
                  value={artifactStatusFilter}
                  onChange={(event) => setArtifactStatusFilter(event.target.value as "" | ArtifactStatus)}
                >
                  <option value="">All statuses</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="artifact-upload-grid">
              <label>
                Document Type
                <input
                  type="text"
                  value={artifactDocumentType}
                  onChange={(event) => setArtifactDocumentType(event.target.value)}
                  placeholder="e.g. proposal"
                />
              </label>

              <label>
                Status
                <select
                  value={artifactStatus}
                  onChange={(event) => setArtifactStatus(event.target.value as ArtifactStatus)}
                >
                  <option value="pending_review">Pending Review</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label>
                File
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
                  onChange={(event) => setArtifactFile(event.target.files?.[0] || null)}
                />
                {artifactFile && <span className="muted">{artifactFile.name}</span>}
              </label>

              <div className="qualification-actions">
                <button type="button" onClick={uploadArtifact} disabled={isUploadingArtifact}>
                  {isUploadingArtifact ? "Uploading..." : "Upload Artifact"}
                </button>
                {artifactMessage && <p className="muted">{artifactMessage}</p>}
              </div>
            </div>

            {artifactsByType.length === 0 && (
              <div className="status-card status-empty">
                <h2>No artifacts yet</h2>
                <p>Upload files to start building version history.</p>
              </div>
            )}

            {artifactsByType.length > 0 && (
              <div className="artifact-version-groups">
                {artifactsByType.map((group) => (
                  <article key={group.documentType} className="artifact-version-card">
                    <div className="artifact-group-head">
                      <h3>{group.documentType}</h3>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => startReplacementFlow(group.documentType)}
                      >
                        Upload Replacement
                      </button>
                    </div>
                    <ol>
                      {group.records.map((artifact) => (
                        <li key={artifact.id}>
                          <div className="timeline-item-head">
                            <strong>{`v${artifact.versionNumber} - ${artifact.fileName}`}</strong>
                            <span>{new Date(artifact.createdAt).toLocaleString()}</span>
                          </div>
                          <p>
                            <span className={`artifact-status-chip artifact-status-${artifact.status}`}>
                              {artifactStatusLabel(artifact.status)}
                            </span>
                            {` ${artifact.mimeType} | ${artifact.sizeBytes} bytes`}
                          </p>
                          <div className="artifact-actions-row">
                            <a
                              href={artifactFileUrl(artifact.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="table-link"
                            >
                              Open
                            </a>
                            <select
                              value={artifact.status}
                              onChange={(event) =>
                                changeArtifactStatus(artifact.id, event.target.value as ArtifactStatus)
                              }
                            >
                              <option value="pending_review">Pending Review</option>
                              <option value="active">Active</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="timeline-panel">
            <h2>Discovery Notes</h2>
            <p className="muted">Capture guided discovery answers and freeform context.</p>

            <div className="discovery-note-composer">
              <label>
                Guided Template
                <select
                  value={selectedTemplateId}
                  onChange={(event) => {
                    const nextTemplateId = event.target.value;
                    setSelectedTemplateId(nextTemplateId);
                    applyTemplateQuestions(nextTemplateId);
                  }}
                >
                  <option value="">No template</option>
                  {discoveryTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              {guidedAnswers.length > 0 && (
                <div className="discovery-guided-list">
                  {guidedAnswers.map((guided, index) => (
                    <label key={`${guided.question}:${index}`}>
                      {guided.question || `Guided Answer ${index + 1}`}
                      <textarea
                        value={guided.answer}
                        onChange={(event) => updateGuidedAnswer(index, event.target.value)}
                        rows={2}
                        placeholder="Enter response"
                      />
                    </label>
                  ))}
                </div>
              )}

              <label>
                Freeform Notes
                <textarea
                  value={freeformText}
                  onChange={(event) => setFreeformText(event.target.value)}
                  rows={4}
                  placeholder="Capture additional discovery notes, risks, and follow-ups"
                />
              </label>

              <div className="qualification-actions">
                <button type="button" onClick={saveDiscoveryNote} disabled={isSavingNote}>
                  {isSavingNote
                    ? "Saving..."
                    : editingNoteId
                      ? "Update Discovery Note"
                      : "Save Discovery Note"}
                </button>
                {editingNoteId && (
                  <button type="button" className="secondary-btn" onClick={resetNoteComposer}>
                    Cancel Edit
                  </button>
                )}
                {notesMessage && <p className="muted">{notesMessage}</p>}
              </div>
            </div>

            {discoveryNotes.length === 0 && (
              <div className="status-card status-empty">
                <h2>No discovery notes yet</h2>
                <p>Use the form above to add guided responses and freeform notes.</p>
              </div>
            )}

            {discoveryNotes.length > 0 && (
              <ol className="timeline-list">
                {discoveryNotes.map((note) => (
                  <li key={note.id} className="timeline-item">
                    <div className="timeline-item-head">
                      <strong>{note.templateName || "Freeform Discovery Note"}</strong>
                      <span>{new Date(note.updatedAt).toLocaleString()}</span>
                    </div>

                    {note.guidedAnswers.length > 0 && (
                      <div className="discovery-guided-preview">
                        {note.guidedAnswers.map((guided) => (
                          <p key={`${note.id}:${guided.question}`}>
                            <strong>{guided.question}</strong>: {guided.answer}
                          </p>
                        ))}
                      </div>
                    )}

                    {note.freeformText && <p>{note.freeformText}</p>}

                    <button type="button" className="secondary-btn" onClick={() => beginEditNote(note)}>
                      Edit Note
                    </button>
                  </li>
                ))}
              </ol>
            )}
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