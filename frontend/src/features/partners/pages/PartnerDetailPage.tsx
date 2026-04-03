import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { usePersistentState } from "../../../shared/hooks/usePersistentState";
import { Modal } from "../../../shared/components/Modal";
import {
  artifactFileUrl,
  listArtifactsRequest,
  updateArtifactStatusRequest,
  uploadArtifactRequest,
  type ArtifactRecord,
  type ArtifactStatus,
} from "../../vault/services/vault-api";
import {
  createPartnerContactRequest,
  deletePartnerContactRequest,
  createDiscoveryNoteRequest,
  getPartnerRequest,
  getPartnerQualificationRequest,
  getPartnerTimelineRequest,
  getWorkflowConfigRequest,
  listPartnerContactsRequest,
  listDiscoveryNotesRequest,
  listDiscoveryNoteTemplatesRequest,
  transitionPartnerPhaseRequest,
  updateDiscoveryNoteRequest,
  updatePartnerContactRequest,
  upsertPartnerQualificationRequest,
  archivePartnerRequest,
  deletePartnerRequest,
  updatePartnerRequest,
  type PartnerContactRecord,
  type DiscoveryNoteGuidedAnswer,
  type DiscoveryNoteRecord,
  type DiscoveryNoteTemplate,
  type PartnerRecord,
  type QualificationProfile,
  type TimelineEntry,
  type WorkflowPhase,
  WorkflowTransitionError,
} from "../services/partners-api";
import {
  DURATION_OPTIONS,
  FUNCTIONAL_BENEFIT_GUIDES,
  IMPACT_LABEL,
  IMPACT_PACKAGE_OPTIONS,
  getBenefitSelectionLimits,
  ROLE_GUIDES,
  ROLE_PACKAGE_FUNCTION_OPTIONS,
} from "../constants/qualification-menu";

const joinWithAnd = (parts: string[]) => {
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
};

const buildRolePackageSummary = (rolePackages: QualificationProfile["rolePackages"]) => {
  if (!rolePackages.length) {
    return "";
  }

  const order: Array<"lead" | "major" | "standard"> = ["lead", "major", "standard"];

  const grouped = order
    .map((impact) => {
      const roles = rolePackages
        .filter((pkg) => pkg.impactLevel === impact)
        .map((pkg) => pkg.functionalRole.replace(/\s+Partner$/i, "").trim());

      if (!roles.length) {
        return null;
      }

      return `${IMPACT_LABEL[impact]} ${joinWithAnd(roles)} Partner`;
    })
    .filter(Boolean) as string[];

  return joinWithAnd(grouped);
};

const defaultQualification: QualificationProfile = {
  durationCategory: null,
  rolePackages: [],
  functionalBenefits: [],
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

const defaultContactForm = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  linkUrl: "",
  isPrimary: false,
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
  const { user } = useAuthSession();
  const { partnerId } = useParams();
  const [partner, setPartner] = useState<PartnerRecord | null>(null);
  const [qualification, setQualification] = useState<QualificationProfile>(defaultQualification);
  const [functionalBenefitOptions, setFunctionalBenefitOptions] = useState<string[]>([]);
  const [selectedPackageImpact, setSelectedPackageImpact] = useState<"standard" | "major" | "lead">(
    "standard",
  );
  const [selectedPackageRole, setSelectedPackageRole] = useState(ROLE_PACKAGE_FUNCTION_OPTIONS[0]);
  const [contacts, setContacts] = useState<PartnerContactRecord[]>([]);
  const [contactForm, setContactForm] = useState(defaultContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
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
  const [activeView, setActiveView] = usePersistentState<
    "qualification" | "contacts" | "transition" | "artifacts" | "notes" | "timeline"
  >("ui:partner-detail:active-view", "qualification");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<Partial<PartnerRecord>>({});
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const navigate = useNavigate();
  const canHardDelete = user?.role === "vp_head";

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
        const [partnerData, qualificationResult, timelineData, contactsData] = await Promise.all([
          getPartnerRequest(partnerId),
          getPartnerQualificationRequest(partnerId),
          getPartnerTimelineRequest(partnerId),
          listPartnerContactsRequest(partnerId),
        ]);
        const [templatesData, notesData] = await Promise.all([
          listDiscoveryNoteTemplatesRequest(partnerId),
          listDiscoveryNotesRequest(partnerId),
        ]);
        const workflowConfig = await getWorkflowConfigRequest();
        const artifactsData = await listArtifactsRequest(partnerId);
        if (!cancelled) {
          setPartner(partnerData);
          setQualification(qualificationResult.qualification || defaultQualification);
          setFunctionalBenefitOptions(qualificationResult.functionalBenefitOptions || []);
          setContacts(contactsData);
          setTimeline(timelineData);
          setDiscoveryTemplates(templatesData);
          setDiscoveryNotes(notesData);
          setArtifacts(artifactsData);
          setWorkflowPhases(workflowConfig.phases.filter((phase) => phase.isActive));
          setInfoForm({
            organizationName: partnerData.organizationName,
            organizationType: partnerData.organizationType,
            industryNiche: partnerData.industryNiche,
            location: partnerData.location || "",
            websiteUrl: partnerData.websiteUrl || "",
          });
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

  const addRolePackage = () => {
    setQualification((prev) => ({
      ...prev,
      rolePackages: [
        ...prev.rolePackages,
        {
          impactLevel: selectedPackageImpact,
          functionalRole: selectedPackageRole,
        },
      ],
    }));
  };

  const removeRolePackage = (index: number) => {
    setQualification((prev) => ({
      ...prev,
      rolePackages: prev.rolePackages.filter((_, currentIndex) => currentIndex !== index),
      functionalBenefits: prev.functionalBenefits.slice(
        0,
        getBenefitSelectionLimits(prev.rolePackages.filter((_, currentIndex) => currentIndex !== index)).totalSelections,
      ),
    }));
  };

  const benefitLimits = getBenefitSelectionLimits(qualification.rolePackages);
  const benefitSlots = benefitLimits.totalSelections;

  const qualificationTitleSummary = useMemo(
    () => buildRolePackageSummary(qualification.rolePackages),
    [qualification.rolePackages],
  );

  const updateBenefitAtSlot = (index: number, value: string) => {
    setQualification((prev) => {
      const next = [...prev.functionalBenefits];
      next[index] = value;
      return {
        ...prev,
        functionalBenefits: next,
      };
    });
  };

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

  const saveContact = async () => {
    if (!partnerId) {
      return;
    }

    setIsSavingContact(true);
    setContactMessage(null);
    try {
      const payload = {
        fullName: contactForm.fullName,
        jobTitle: contactForm.jobTitle || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        linkUrl: contactForm.linkUrl || undefined,
        isPrimary: contactForm.isPrimary,
      };

      if (editingContactId) {
        await updatePartnerContactRequest(partnerId, editingContactId, payload);
      } else {
        await createPartnerContactRequest(partnerId, payload);
      }

      const refreshed = await listPartnerContactsRequest(partnerId);
      setContacts(refreshed);
      setContactForm(defaultContactForm);
      setEditingContactId(null);
      setContactMessage(editingContactId ? "Contact person updated." : "Contact person added.");
    } catch (saveError) {
      setContactMessage(saveError instanceof Error ? saveError.message : "Failed to save contact person");
    } finally {
      setIsSavingContact(false);
    }
  };

  const beginEditContact = (contact: PartnerContactRecord) => {
    setEditingContactId(contact.id);
    setContactForm({
      fullName: contact.fullName,
      jobTitle: contact.jobTitle || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkUrl: contact.linkUrl || "",
      isPrimary: contact.isPrimary,
    });
    setContactMessage(null);
  };

  const cancelEditContact = () => {
    setEditingContactId(null);
    setContactForm(defaultContactForm);
  };

  const removeContact = async (contact: PartnerContactRecord) => {
    if (!partnerId) {
      return;
    }

    if (!window.confirm(`Delete contact person "${contact.fullName}"?`)) {
      return;
    }

    try {
      await deletePartnerContactRequest(partnerId, contact.id);
      const refreshed = await listPartnerContactsRequest(partnerId);
      setContacts(refreshed);
      if (editingContactId === contact.id) {
        cancelEditContact();
      }
      setContactMessage("Contact person deleted.");
    } catch (deleteError) {
      setContactMessage(deleteError instanceof Error ? deleteError.message : "Failed to delete contact person");
    }
  };

  const saveQualification = async () => {
    if (!partnerId) {
      return;
    }

    setIsSavingQualification(true);
    setQualificationMessage(null);
    try {
      if (qualification.rolePackages.length === 0) {
        setQualificationMessage("Add at least one role package before saving.");
        return;
      }

      const selectedBenefits = qualification.functionalBenefits
        .slice(0, benefitSlots)
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      const saved = await upsertPartnerQualificationRequest(partnerId, {
        durationCategory: qualification.durationCategory,
        rolePackages: qualification.rolePackages,
        functionalBenefits: selectedBenefits,
      });
      setQualification(saved);
      setQualificationMessage("Give-and-Take Framework saved.");
    } catch (saveError) {
      setQualificationMessage(
        saveError instanceof Error ? saveError.message : "Failed to save Give-and-Take Framework",
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
    setNotesMessage(null);
  };

  const transitionPhase = async () => {
    const currentPartnerId = partnerId;
    if (!currentPartnerId) {
      return;
    }

    setTransitionMessage(null);
    setTransitionBlockingDetails([]);
    try {
      const updatedPartner = await transitionPartnerPhaseRequest(currentPartnerId, {
        toPhaseId: targetPhaseId,
        reason: transitionReason.trim() || undefined,
      });

      setPartner(updatedPartner);
      await refreshNotesAndTimeline(currentPartnerId);
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

  const uploadArtifact = async () => {
    const currentPartnerId = partnerId;
    if (!currentPartnerId) {
      return;
    }

    if (!artifactFile) {
      setArtifactMessage("Choose a file before uploading.");
      return;
    }

    if (!CLIENT_ALLOWED_ARTIFACT_TYPES.includes(artifactFile.type)) {
      setArtifactMessage("Unsupported file type.");
      return;
    }

    if (artifactFile.size > CLIENT_MAX_ARTIFACT_BYTES) {
      setArtifactMessage("File is too large.");
      return;
    }

    setIsUploadingArtifact(true);
    setArtifactMessage(null);
    try {
      await uploadArtifactRequest(currentPartnerId, {
        file: artifactFile,
        documentType: artifactDocumentType,
        status: artifactStatus,
      });
      const refreshed = await listArtifactsRequest(currentPartnerId);
      setArtifacts(refreshed);
      setArtifactFile(null);
      setArtifactMessage("Artifact uploaded.");
    } catch (uploadError) {
      setArtifactMessage(uploadError instanceof Error ? uploadError.message : "Failed to upload artifact");
    } finally {
      setIsUploadingArtifact(false);
    }
  };

  const changeArtifactStatus = async (artifactId: string, nextStatus: ArtifactStatus) => {
    const currentPartnerId = partnerId;
    if (!currentPartnerId) {
      return;
    }

    try {
      await updateArtifactStatusRequest(artifactId, nextStatus);
      const refreshed = await listArtifactsRequest(currentPartnerId);
      setArtifacts(refreshed);
      setArtifactMessage("Artifact status updated.");
    } catch (statusError) {
      setArtifactMessage(statusError instanceof Error ? statusError.message : "Failed to update artifact status");
    }
  };

  const startReplacementFlow = (documentType: string) => {
    setArtifactDocumentType(documentType);
    setArtifactMessage(`Replacement upload prepared for ${documentType}.`);
  };

  const saveDiscoveryNote = async () => {
    const currentPartnerId = partnerId;
    if (!currentPartnerId) {
      return;
    }

    setIsSavingNote(true);
    setNotesMessage(null);
    try {
      const payload = {
        templateId: selectedTemplateId || undefined,
        guidedAnswers: guidedAnswers.filter((answer) => answer.answer.trim()),
        freeformText: freeformText.trim() || undefined,
      };

      if (editingNoteId) {
        await updateDiscoveryNoteRequest(currentPartnerId, editingNoteId, payload);
      } else {
        await createDiscoveryNoteRequest(currentPartnerId, payload);
      }

      const refreshedNotes = await listDiscoveryNotesRequest(currentPartnerId);
      setDiscoveryNotes(refreshedNotes);
      setSelectedTemplateId("");
      setGuidedAnswers([]);
      setFreeformText("");
      setEditingNoteId(null);
      setNotesMessage(editingNoteId ? "Discovery note updated." : "Discovery note saved.");
    } catch (noteError) {
      setNotesMessage(noteError instanceof Error ? noteError.message : "Failed to save discovery note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!partnerId) return;
    setIsSavingInfo(true);
    setInfoMessage(null);
    try {
      const updated = await updatePartnerRequest(partnerId, infoForm);
      setPartner(updated);
      setInfoMessage("Partner information updated.");
      setIsEditingInfo(false);
    } catch (saveError) {
      setInfoMessage(saveError instanceof Error ? saveError.message : "Failed to update partner information");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleDeletePartner = async (isHard: boolean = false) => {
    if (!partnerId || !partner) return;

    const actionText = isHard ? "PERMANENTLY DELETE" : "ARCHIVE";
    const warning = isHard 
      ? `WARNING: This will PERMANENTLY REMOVE "${partner.organizationName}" and all associated data. This action cannot be undone.`
      : `Are you sure you want to archive "${partner.organizationName}"? It will be moved to the Archived view.`;

    if (!window.confirm(warning)) return;

    try {
      if (isHard) {
        await deletePartnerRequest(partnerId);
      } else {
        await archivePartnerRequest(partnerId);
      }
      navigate("/partners");
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${actionText.toLowerCase()} partner`);
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
    <main className="page-layout single-screen-page">
      <header className="page-header">
        <div>
          <h1>{partner?.organizationName || "Partner Detail"}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="header-actions">
          <div className="button-group">
            <button type="button" className="secondary-btn" onClick={() => setIsEditingInfo(true)}>
              Edit Information
            </button>
            <button type="button" className="secondary-btn delete-btn" onClick={() => handleDeletePartner(false)}>
              Archive
            </button>
          </div>
          <Link to="/partners" className="link-button">
            Back to Registry
          </Link>
        </div>
      </header>

      <Modal title="Edit Partner Information" open={isEditingInfo} onClose={() => setIsEditingInfo(false)}>
        <div className="qualification-grid">
          <label>
            Organization Name
            <input
              type="text"
              value={infoForm.organizationName || ""}
              onChange={(e) => setInfoForm((p) => ({ ...p, organizationName: e.target.value }))}
            />
          </label>
          <label>
            Organization Type
            <input
              type="text"
              value={infoForm.organizationType || ""}
              onChange={(e) => setInfoForm((p) => ({ ...p, organizationType: e.target.value }))}
            />
          </label>
          <label>
            Industry Niche
            <input
              type="text"
              value={infoForm.industryNiche || ""}
              onChange={(e) => setInfoForm((p) => ({ ...p, industryNiche: e.target.value }))}
            />
          </label>
          <label>
            Location
            <input
              type="text"
              value={infoForm.location || ""}
              onChange={(e) => setInfoForm((p) => ({ ...p, location: e.target.value }))}
            />
          </label>
          <label>
            Website URL
            <input
              type="text"
              value={infoForm.websiteUrl || ""}
              onChange={(e) => setInfoForm((p) => ({ ...p, websiteUrl: e.target.value }))}
            />
          </label>
        </div>

        {infoMessage && <p className="status-message">{infoMessage}</p>}

        <div className="modal-footer-actions">
          {canHardDelete && (
            <button 
              type="button" 
              className="danger-btn" 
              style={{ marginRight: 'auto' }}
              onClick={() => handleDeletePartner(true)}
            >
              Hard Delete
            </button>
          )}
          <button type="button" className="secondary-btn" onClick={() => setIsEditingInfo(false)}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={handleUpdateInfo} disabled={isSavingInfo}>
            {isSavingInfo ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>

      {isLoading && <p className="loading-state">Loading timeline...</p>}

      {!isLoading && error && (
        <div className="status-card status-error" role="alert">
          <h2>Unable to load partner detail</h2>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="page-view-switcher" role="tablist" aria-label="Partner detail view switcher">
            <button
              type="button"
              className={`view-tab-btn ${activeView === "qualification" ? "is-active" : ""}`}
              onClick={() => setActiveView("qualification")}
            >
              Qualification
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeView === "contacts" ? "is-active" : ""}`}
              onClick={() => setActiveView("contacts")}
            >
              Contacts
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeView === "transition" ? "is-active" : ""}`}
              onClick={() => setActiveView("transition")}
            >
              Transition
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeView === "artifacts" ? "is-active" : ""}`}
              onClick={() => setActiveView("artifacts")}
            >
              Artifacts
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeView === "notes" ? "is-active" : ""}`}
              onClick={() => setActiveView("notes")}
            >
              Discovery Notes
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeView === "timeline" ? "is-active" : ""}`}
              onClick={() => setActiveView("timeline")}
            >
              Timeline
            </button>
          </div>

          <div className="single-screen-content">
          {activeView === "qualification" && (
            <section className="timeline-panel">

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
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <div className="value-prop-columns">
              <div>
                <h3>Role Package Menu</h3>
                <p className="muted">
                  Standard and Major tier responsibilities are fixed commitments. Only Lead tier responsibilities are negotiable and can be custom-tailored based on partner goals, capabilities, and budget.
                </p>
                <div className="qualification-grid">
                  <label>
                    Impact
                    <select
                      value={selectedPackageImpact}
                      onChange={(event) =>
                        setSelectedPackageImpact(event.target.value as "standard" | "major" | "lead")
                      }
                    >
                      {IMPACT_PACKAGE_OPTIONS.map((impact) => (
                        <option key={impact} value={impact}>
                          {IMPACT_LABEL[impact]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Functional Role
                    <select
                      value={selectedPackageRole}
                      onChange={(event) => setSelectedPackageRole(event.target.value)}
                    >
                      {ROLE_PACKAGE_FUNCTION_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="qualification-actions">
                  <button type="button" onClick={addRolePackage}>
                    Add Role Package
                  </button>
                </div>

                {qualification.rolePackages.length === 0 && <p className="muted">No role packages yet.</p>}
                {qualification.rolePackages.length > 0 && (
                  <ol className="timeline-list">
                    {qualification.rolePackages.map((pkg, index) => (
                      <li key={`${pkg.impactLevel}:${pkg.functionalRole}:${index}`} className="timeline-item">
                        <div className="timeline-item-head">
                          <strong>{`Package ${index + 1}`}</strong>
                          <span>{IMPACT_LABEL[pkg.impactLevel]}</span>
                        </div>
                        <p>{pkg.functionalRole}</p>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => removeRolePackage(index)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                <h4>Role Menu Guide (What Each Role Includes)</h4>
                <div className="timeline-list">
                  {ROLE_PACKAGE_FUNCTION_OPTIONS.map((role) => {
                    const roleGuide = ROLE_GUIDES[role];
                    if (!roleGuide) {
                      return null;
                    }

                    return (
                      <article key={`role-guide:${role}`} className="timeline-item">
                        <div className="timeline-item-head">
                          <strong>{role}</strong>
                        </div>
                        <p>{roleGuide.description}</p>
                        <p>Standard:</p>
                        <ul>
                          {roleGuide.tiers.standard.map((item) => (
                            <li key={`role-guide:${role}:standard:${item}`}>{item}</li>
                          ))}
                        </ul>
                        <p>Major:</p>
                        <ul>
                          {roleGuide.tiers.major.map((item) => (
                            <li key={`role-guide:${role}:major:${item}`}>{item}</li>
                          ))}
                        </ul>
                        <p>Lead (Negotiable):</p>
                        <ul>
                          {roleGuide.tiers.lead.map((item) => (
                            <li key={`role-guide:${role}:lead:${item}`}>{item}</li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3>Functional Benefit Packages</h3>
                <p className="muted">{`Benefit selections allowed: ${benefitSlots}`}</p>
                {benefitSlots === 0 && (
                  <p className="muted">Add role packages to unlock benefit selections.</p>
                )}
                {benefitSlots > 0 && (
                  <div className="qualification-grid">
                    {Array.from({ length: benefitSlots }).map((_, index) => (
                      <label key={`benefit-slot:${index}`}>
                        {`Benefit Package ${index + 1}`}
                        <select
                          value={qualification.functionalBenefits[index] || ""}
                          onChange={(event) => updateBenefitAtSlot(index, event.target.value)}
                        >
                          <option value="">Select benefit</option>
                          {functionalBenefitOptions.map((option) => (
                            <option key={`benefit-option:${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
                {functionalBenefitOptions.length === 0 && (
                  <p className="muted">No preset functional benefits found for this organization type.</p>
                )}
                {functionalBenefitOptions.length > 0 && (
                  <p className="muted">
                    {`Preset benefits for ${partner?.organizationType || "this organization"}: ${functionalBenefitOptions.join(
                      ", ",
                    )}`}
                  </p>
                )}
                <p className="muted">Benefit packages are standard-only and have no impact level.</p>

                <h4>Functional Benefit Guide (What Each Benefit Includes)</h4>
                <div className="timeline-list">
                  {functionalBenefitOptions.map((benefit) => {
                    const benefitGuide = FUNCTIONAL_BENEFIT_GUIDES[benefit];

                    return (
                      <article key={`benefit-guide:${benefit}`} className="timeline-item">
                        <div className="timeline-item-head">
                          <strong>{benefit}</strong>
                        </div>
                        <p>{benefitGuide?.description || "Detailed package scope available from partnership docs."}</p>
                        {(benefitGuide?.responsibilities || []).map((entry) => (
                          <p key={`${benefit}:${entry}`}>{`- ${entry}`}</p>
                        ))}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            {qualificationTitleSummary && (
              <p className="muted">{`Current package title summary: ${qualificationTitleSummary}.`}</p>
            )}

            <div className="qualification-actions">
                <button type="button" onClick={saveQualification} disabled={isSavingQualification}>
                {isSavingQualification ? "Saving..." : "Save Give-and-Take Framework"}
              </button>
              {qualificationMessage && <p className="muted">{qualificationMessage}</p>}
            </div>
            </section>
          )}

          {activeView === "contacts" && (
            <section className="timeline-panel">
            <header className="section-header">
              <h2>Contact Persons</h2>
              <p className="muted">Manage the people associated with this partner organization.</p>
            </header>

            <div className="artifact-upload-grid">
              <label>
                Full Name
                <input
                  type="text"
                  value={contactForm.fullName}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="e.g. Juan Dela Cruz"
                />
              </label>
              <label>
                Position in Organization
                <input
                  type="text"
                  value={contactForm.jobTitle}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, jobTitle: event.target.value }))
                  }
                  placeholder="e.g. Partnerships Manager"
                />
              </label>
              <label>
                Contact Email
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="name@organization.com"
                />
              </label>
              <label>
                Contact Number
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+63..."
                />
              </label>
              <label>
                Link (Website or Social)
                <input
                  type="url"
                  value={contactForm.linkUrl}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label>
                Primary Contact
                <select
                  value={contactForm.isPrimary ? "yes" : "no"}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, isPrimary: event.target.value === "yes" }))
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </div>

            <div className="qualification-actions">
              <button type="button" onClick={saveContact} disabled={isSavingContact}>
                {isSavingContact ? "Saving..." : editingContactId ? "Update Contact Person" : "Add Contact Person"}
              </button>
              {editingContactId && (
                <button type="button" className="secondary-btn" onClick={cancelEditContact}>
                  Cancel Edit
                </button>
              )}
              {contactMessage && <p className="muted">{contactMessage}</p>}
            </div>

            {contacts.length === 0 && (
              <div className="status-card status-empty">
                <h2>No contacts yet</h2>
                <p>Add at least one contact person for this partner.</p>
              </div>
            )}

            {contacts.length > 0 && (
              <ol className="timeline-list">
                {contacts.map((contact) => (
                  <li key={contact.id} className="timeline-item">
                    <div className="timeline-item-head">
                      <strong>{contact.fullName}</strong>
                      <span>{contact.isPrimary ? "Primary" : "Secondary"}</span>
                    </div>
                    <p>{contact.jobTitle || "No position provided"}</p>
                    <p>{contact.email || "-"}</p>
                    <p>{contact.phone || "-"}</p>
                    {contact.linkUrl && (
                      <a href={contact.linkUrl} target="_blank" rel="noreferrer" className="table-link">
                        {contact.linkUrl}
                      </a>
                    )}
                    <div className="button-group" style={{ marginTop: "0.75rem" }}>
                      <button type="button" className="secondary-btn" onClick={() => beginEditContact(contact)}>
                        Edit
                      </button>
                      <button type="button" className="secondary-btn delete-btn" onClick={() => removeContact(contact)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            </section>
          )}

          {activeView === "transition" && (
            <section className="timeline-panel">

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
          )}

          {activeView === "artifacts" && (
            <section className="timeline-panel">

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
          )}

          {activeView === "notes" && (
            <section className="timeline-panel">

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
          )}

          {activeView === "timeline" && (
            <section className="timeline-panel">

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
          </div>
        </>
      )}
    </main>
  );
};