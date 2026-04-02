import { useEffect, useState } from "react";
import { Modal } from "../../../shared/components/Modal";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import {
  artifactFileUrl,
  listArtifactsRequest,
  uploadArtifactRequest,
  type ArtifactRecord,
  type ArtifactStatus,
} from "../../vault/services/vault-api";
import {
  createPartnerContactRequest,
  createDiscoveryNoteRequest,
  getPartnerRequest,
  getPartnerQualificationRequest,
  getPartnerTimelineRequest,
  getWorkflowConfigRequest,
  deletePartnerContactRequest,
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
  ROLE_PACKAGE_FUNCTION_OPTIONS,
} from "../constants/qualification-menu";

type PartnerDetailModalProps = {
  partnerId: string;
  onClose: () => void;
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

const defaultContactForm = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  linkUrl: "",
  isPrimary: false,
};

export const PartnerDetailModal = ({ partnerId, onClose }: PartnerDetailModalProps) => {
  const { user } = useAuthSession();
  const [partner, setPartner] = useState<PartnerRecord | null>(null);
  const [qualification, setQualification] = useState<QualificationProfile>(defaultQualification);
  const [functionalBenefitOptions, setFunctionalBenefitOptions] = useState<string[]>([]);
  const [contacts, setContacts] = useState<PartnerContactRecord[]>([]);
  const [contactForm, setContactForm] = useState(defaultContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [discoveryNotes, setDiscoveryNotes] = useState<DiscoveryNoteRecord[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [workflowPhases, setWorkflowPhases] = useState<WorkflowPhase[]>([]);
  const [discoveryTemplates, setDiscoveryTemplates] = useState<DiscoveryNoteTemplate[]>([]);

  const [activeTab, setActiveTab] = useState<"General" | "Qualification" | "Contacts" | "Transitions" | "Artifacts" | "Discovery Notes" | "Timeline">("General");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General Page State
  const [infoForm, setInfoForm] = useState<Partial<PartnerRecord>>({});
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Qualification State
  const [openPanel, setOpenPanel] = useState<"role" | "benefit" | null>("role");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<"standard" | "major" | "lead">("standard");
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<string[]>([]);
  const [selectedBenefit, setSelectedBenefit] = useState<string>("");
  const [selectedBenefitResponsibilities, setSelectedBenefitResponsibilities] = useState<string[]>([]);
  const [qualificationMessage, setQualificationMessage] = useState<string | null>(null);
  const [isSavingQualification, setIsSavingQualification] = useState(false);

  // Artifacts State
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [artifactDocumentType, setArtifactDocumentType] = useState("proposal");
  const [artifactStatus] = useState<ArtifactStatus>("pending_review");
  const [isUploadingArtifact, setIsUploadingArtifact] = useState(false);

  // Discovery Notes State
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [guidedAnswers, setGuidedAnswers] = useState<DiscoveryNoteGuidedAnswer[]>([]);
  const [freeformText, setFreeformText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Transition State
  const [targetPhaseId, setTargetPhaseId] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [isTransitioningPhase, setIsTransitioningPhase] = useState(false);
  const [transitionBlockingDetails, setTransitionBlockingDetails] = useState<string[]>([]);
  const canHardDelete = user?.role === "vp_head";

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [p, q, c, t, n, a, w, d] = await Promise.all([
          getPartnerRequest(partnerId),
          getPartnerQualificationRequest(partnerId),
          listPartnerContactsRequest(partnerId),
          getPartnerTimelineRequest(partnerId),
          listDiscoveryNotesRequest(partnerId),
          listArtifactsRequest(partnerId),
          getWorkflowConfigRequest(),
          listDiscoveryNoteTemplatesRequest(partnerId),
        ]);
        setPartner(p);
        setQualification(q.qualification || defaultQualification);
        setFunctionalBenefitOptions(
          q.functionalBenefitOptions && q.functionalBenefitOptions.length > 0
            ? q.functionalBenefitOptions
            : Object.keys(FUNCTIONAL_BENEFIT_GUIDES),
        );
        setContacts(c);
        setTimeline(t);
        setDiscoveryNotes(n);
        setArtifacts(a);
        setWorkflowPhases(w.phases.filter((ph: WorkflowPhase) => ph.isActive));
        setDiscoveryTemplates(d);
        setInfoForm({
          organizationName: p.organizationName,
          organizationType: p.organizationType,
          industryNiche: p.industryNiche,
          location: p.location || "",
          websiteUrl: p.websiteUrl || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleUpdateInfo = async () => {
    setIsSavingInfo(true);
    try {
      const updated = await updatePartnerRequest(partnerId, infoForm);
      setPartner(updated);
      alert("Partner information updated successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`Are you sure you want to archive "${partner?.organizationName}"?`)) return;
    try {
      await archivePartnerRequest(partnerId);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`WARNING: PERMANENTLY DELETE "${partner?.organizationName}"? This cannot be undone.`)) return;
    try {
      await deletePartnerRequest(partnerId);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // Qualification Helpers
  const addRolePackage = () => {
    if (!selectedRole || selectedResponsibilities.length === 0) return;

    const newPackage = {
      functionalRole: selectedRole,
      impactLevel: selectedTier,
      checklistItems: [...selectedResponsibilities],
    };
    setQualification((prev) => ({
      ...prev,
      rolePackages: [...prev.rolePackages, newPackage],
    }));
    setSelectedRole("");
    setSelectedTier("standard");
    setSelectedResponsibilities([]);
    setQualificationMessage(null);
  };

  const removeRolePackage = (index: number) => {
    setQualification((prev) => {
      const nextRolePackages = prev.rolePackages.filter((_, i) => i !== index);
      const nextSlots =
        nextRolePackages.length > 0
          ? nextRolePackages.length + 2 + Math.floor(nextRolePackages.length / 3)
          : 0;

      return {
        ...prev,
        rolePackages: nextRolePackages,
        functionalBenefits: prev.functionalBenefits.slice(0, nextSlots),
      };
    });
    setQualificationMessage(null);
  };

  const benefitSlots =
    qualification.rolePackages.length > 0
      ? qualification.rolePackages.length + 2 + Math.floor(qualification.rolePackages.length / 3)
      : 0;

  const addBenefitPackage = () => {
    if (!selectedBenefit) return;
    if (qualification.functionalBenefits.length >= benefitSlots) {
      setQualificationMessage(`You can only select up to ${benefitSlots} benefit packages.`);
      return;
    }

    setQualification((prev) => ({
      ...prev,
      functionalBenefits: [...prev.functionalBenefits, selectedBenefit],
    }));
    setSelectedBenefit("");
    setSelectedBenefitResponsibilities([]);
    setQualificationMessage(null);
  };

  const removeBenefitPackage = (index: number) => {
    setQualification((prev) => ({
      ...prev,
      functionalBenefits: prev.functionalBenefits.filter((_, i) => i !== index),
    }));
    setQualificationMessage(null);
  };

  const saveQualificationMapping = async () => {
    if (qualification.rolePackages.length === 0) {
      setQualificationMessage("Add at least one role package before saving.");
      return;
    }

    if (qualification.functionalBenefits.length > benefitSlots) {
      setQualificationMessage(`Only ${benefitSlots} benefit package selections are allowed.`);
      return;
    }

    setIsSavingQualification(true);
    setQualificationMessage(null);
    try {
      const saved = await upsertPartnerQualificationRequest(partnerId, {
        durationCategory: qualification.durationCategory,
        rolePackages: qualification.rolePackages,
        functionalBenefits: qualification.functionalBenefits,
      });
      setQualification(saved);
      setQualificationMessage("Give-and-Take Framework saved to records.");
    } catch (err) {
      setQualificationMessage(err instanceof Error ? err.message : "Failed to save Give-and-Take Framework");
    } finally {
      setIsSavingQualification(false);
    }
  };

  const saveContact = async () => {
    if (!partnerId) {
      return;
    }

    if (!contactForm.fullName.trim()) {
      setContactMessage("Full name is required.");
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
    } catch (err) {
      setContactMessage(err instanceof Error ? err.message : "Failed to save contact person");
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
    setContactMessage(null);
  };

  const removeContact = async (contact: PartnerContactRecord) => {
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
    } catch (err) {
      setContactMessage(err instanceof Error ? err.message : "Failed to delete contact person");
    }
  };

  // Transition Helper
  const handleTransition = async () => {
    setIsTransitioningPhase(true);
    setTransitionBlockingDetails([]);
    try {
      const updated = await transitionPartnerPhaseRequest(partnerId, { toPhaseId: targetPhaseId, reason: transitionReason });
      setPartner(updated);
      const tl = await getPartnerTimelineRequest(partnerId);
      setTimeline(tl);
      alert(`Successfully transitioned to ${targetPhaseId}`);
    } catch (err) {
      if (err instanceof WorkflowTransitionError) {
        setTransitionBlockingDetails(err.details.map((d) => (d as { message?: string }).message).filter(Boolean) as string[]);
      } else {
        alert(err instanceof Error ? err.message : "Transition failed");
      }
    } finally { setIsTransitioningPhase(false); }
  };

  // Discovery Notes Helpers
  const saveNote = async () => {
    setIsSavingNote(true);
    try {
      const payload = {
        templateId: selectedTemplateId || undefined,
        guidedAnswers: guidedAnswers.filter(a => a.answer),
        freeformText: freeformText || undefined
      };
      if (editingNoteId) await updateDiscoveryNoteRequest(partnerId, editingNoteId, payload);
      else await createDiscoveryNoteRequest(partnerId, payload);
      const ns = await listDiscoveryNotesRequest(partnerId);
      setDiscoveryNotes(ns);
      setEditingNoteId(null);
      setFreeformText("");
      setGuidedAnswers([]);
      setSelectedTemplateId("");
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
    finally { setIsSavingNote(false); }
  };

  const applyTemplate = (tid: string) => {
    const t = discoveryTemplates.find(x => x.id === tid);
    if (t) setGuidedAnswers(t.questions.map(q => ({ question: q, answer: "" })));
    else setGuidedAnswers([]);
  };

  // Artifact Helpers
  const handleUpload = async () => {
    if (!artifactFile) return;
    setIsUploadingArtifact(true);
    try {
      await uploadArtifactRequest(partnerId, { file: artifactFile, documentType: artifactDocumentType, status: artifactStatus });
      const as = await listArtifactsRequest(partnerId);
      setArtifacts(as);
      setArtifactFile(null);
    } catch (err) { alert(err instanceof Error ? err.message : "Upload failed"); }
    finally { setIsUploadingArtifact(false); }
  };

  // Render Subpages
  const renderGeneral = () => (
    <div className="qualification-grid" style={{ maxWidth: '600px' }}>
      <label>Organization Name
        <input type="text" value={infoForm.organizationName || ""} onChange={e => setInfoForm((f: Partial<PartnerRecord>) => ({ ...f, organizationName: e.target.value }))} />
      </label>
      <label>Organization Type
        <input type="text" value={infoForm.organizationType || ""} onChange={e => setInfoForm((f: Partial<PartnerRecord>) => ({ ...f, organizationType: e.target.value }))} />
      </label>
      <label>Industry Niche
        <input type="text" value={infoForm.industryNiche || ""} onChange={e => setInfoForm((f: Partial<PartnerRecord>) => ({ ...f, industryNiche: e.target.value }))} />
      </label>
      <label>Location
        <input type="text" value={infoForm.location || ""} onChange={e => setInfoForm((f: Partial<PartnerRecord>) => ({ ...f, location: e.target.value }))} />
      </label>
      <label className="full-width">Website URL
        <input type="text" value={infoForm.websiteUrl || ""} onChange={e => setInfoForm((f: Partial<PartnerRecord>) => ({ ...f, websiteUrl: e.target.value }))} />
      </label>
      <div style={{ marginTop: '1.5rem' }}>
        <button className="emphasized-add-btn" onClick={handleUpdateInfo} disabled={isSavingInfo}>
          {isSavingInfo ? "Updating..." : "Update Information"}
        </button>
      </div>
    </div>
  );

  const renderQualification = () => (
    <div className="qualification-layout">
      <div className="duration-selector-top">
        {DURATION_OPTIONS.map(opt => (
          <label key={opt.value} className="radio-label">
            <input type="radio" name="duration" checked={qualification.durationCategory === opt.value} onChange={() => setQualification((q: QualificationProfile) => ({ ...q, durationCategory: opt.value }))} />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="sliding-panels-container">
        <div className={`sliding-panel ${openPanel === 'role' ? 'is-open' : ''}`}>
          <div className="sliding-panel-header" onClick={() => setOpenPanel(openPanel === 'role' ? null : 'role')}>
            <span>Functional Role Packages</span>
            <span>{openPanel === 'role' ? 'Collapse' : 'Expand'}</span>
          </div>
          <div className="sliding-panel-content">
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              <option value="">-- Choose Role --</option>
              {ROLE_PACKAGE_FUNCTION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {selectedRole && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="tier-selector">
                  {(['standard', 'major', 'lead'] as const).map(t => (
                    <button key={t} className={`tier-chip ${selectedTier === t ? 'is-active' : ''}`} onClick={() => setSelectedTier(t)}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <table className="role-package-table">
                  <thead>
                    <tr>
                      <th>Selection</th>
                      <th>Responsibility</th>
                      <th className={selectedTier === 'standard' ? 'emp-col' : ''}>Standard</th>
                      <th className={selectedTier === 'major' ? 'emp-col' : ''}>Major</th>
                      <th className={selectedTier === 'lead' ? 'emp-col' : ''}>Lead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Simplified mock responsibilities based on ROLE_GUIDES data */}
                    {["Resource Allocation", "Personnel Commitment", "Outcome Accountability"].map(resp => (
                      <tr key={resp}>
                        <td><input type="checkbox" checked={selectedResponsibilities.includes(resp)} onChange={() => setSelectedResponsibilities((prev: string[]) => prev.includes(resp) ? prev.filter((x: string) => x !== resp) : [...prev, resp])} /></td>
                        <td>{resp}</td>
                        <td className={selectedTier === 'standard' ? 'emp-col' : ''}>Base</td>
                        <td className={selectedTier === 'major' ? 'emp-col' : ''}>Plus</td>
                        <td className={selectedTier === 'lead' ? 'emp-col' : ''}>Full</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="primary-btn mt-4" disabled={!selectedRole || selectedResponsibilities.length === 0} onClick={addRolePackage}>
                  Add Role Package
                </button>
              </div>
            )}

            {qualification.rolePackages.length > 0 && (
              <div className="timeline-list" style={{ marginTop: "1rem" }}>
                {qualification.rolePackages.map((pkg, index) => (
                  <div key={`${pkg.functionalRole}:${pkg.impactLevel}:${index}`} className="timeline-item">
                    <div className="timeline-item-head">
                      <strong>{`Role Package ${index + 1}`}</strong>
                      <span>{pkg.impactLevel.toUpperCase()}</span>
                    </div>
                    <p>{pkg.functionalRole}</p>
                    {(pkg.checklistItems || []).length > 0 && (
                      <p>{`Checklist: ${(pkg.checklistItems || []).join(", ")}`}</p>
                    )}
                    <button className="secondary-btn" onClick={() => removeRolePackage(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`sliding-panel ${openPanel === 'benefit' ? 'is-open' : ''}`}>
          <div className="sliding-panel-header" onClick={() => setOpenPanel(openPanel === 'benefit' ? null : 'benefit')}>
            <span>Benefit Packages</span>
            <span>{openPanel === 'benefit' ? 'Collapse' : 'Expand'}</span>
          </div>
          <div className="sliding-panel-content">
            <select value={selectedBenefit} onChange={e => { setSelectedBenefit(e.target.value); setSelectedBenefitResponsibilities([]); }}>
              <option value="">-- Choose Benefit --</option>
              {functionalBenefitOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <p className="muted">{`Benefit packages selected: ${qualification.functionalBenefits.length} / ${benefitSlots}`}</p>
            {selectedBenefit && (
              <div style={{ marginTop: '1.5rem' }}>
                <table className="role-package-table">
                  <thead>
                    <tr><th>Selection</th><th>Benefit Responsibility</th></tr>
                  </thead>
                  <tbody>
                    {FUNCTIONAL_BENEFIT_GUIDES[selectedBenefit].responsibilities.map(r => (
                      <tr key={r}>
                        <td><input type="checkbox" checked={selectedBenefitResponsibilities.includes(r)} onChange={() => setSelectedBenefitResponsibilities((prev: string[]) => prev.includes(r) ? prev.filter((x: string) => x !== r) : [...prev, r])} /></td>
                        <td>{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="primary-btn mt-4"
                  disabled={!selectedBenefit || qualification.functionalBenefits.length >= benefitSlots}
                  onClick={addBenefitPackage}
                >
                  Add Benefit Package
                </button>
              </div>
            )}

            {qualification.functionalBenefits.length > 0 && (
              <div className="timeline-list" style={{ marginTop: "1rem" }}>
                {qualification.functionalBenefits.map((benefit, index) => (
                  <div key={`${benefit}:${index}`} className="timeline-item">
                    <div className="timeline-item-head">
                      <strong>{`Benefit Package ${index + 1}`}</strong>
                    </div>
                    <p>{benefit}</p>
                    <button className="secondary-btn" onClick={() => removeBenefitPackage(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="status-card">
        <h3>Qualification Receipt Preview</h3>
        <p>{`Role Packages: ${qualification.rolePackages.length}`}</p>
        <p>{`Benefit Packages: ${qualification.functionalBenefits.length}`}</p>
        {qualification.rolePackages.map((pkg, index) => (
          <p key={`receipt-role:${pkg.functionalRole}:${index}`}>{`Role Package ${index + 1}: ${pkg.impactLevel.toUpperCase()} - ${pkg.functionalRole}`}</p>
        ))}
        {qualification.functionalBenefits.map((benefit, index) => (
          <p key={`receipt-benefit:${benefit}:${index}`}>{`Benefit Package ${index + 1}: ${benefit}`}</p>
        ))}
      </div>

      <div className="qualification-actions">
        <button type="button" className="primary-btn" onClick={saveQualificationMapping} disabled={isSavingQualification}>
          {isSavingQualification ? "Saving..." : "Save Give-and-Take Framework"}
        </button>
        {qualificationMessage && <p className="muted">{qualificationMessage}</p>}
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="contact-grid">
      <div className="qualification-layout" style={{ marginBottom: '1.5rem' }}>
        <div className="artifact-upload-grid">
          <label>
            Full Name
            <input
              type="text"
              value={contactForm.fullName}
              onChange={(event) => setContactForm((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="e.g. Juan Dela Cruz"
            />
          </label>
          <label>
            Position in Organization
            <input
              type="text"
              value={contactForm.jobTitle}
              onChange={(event) => setContactForm((prev) => ({ ...prev, jobTitle: event.target.value }))}
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
              value={contactForm.isPrimary ? 'yes' : 'no'}
              onChange={(event) => setContactForm((prev) => ({ ...prev, isPrimary: event.target.value === 'yes' }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>

        <div className="qualification-actions">
          <button type="button" onClick={saveContact} disabled={isSavingContact}>
            {isSavingContact ? 'Saving...' : editingContactId ? 'Update Contact Person' : 'Add Contact Person'}
          </button>
          {editingContactId && (
            <button type="button" className="secondary-btn" onClick={cancelEditContact}>
              Cancel Edit
            </button>
          )}
          {contactMessage && <p className="muted">{contactMessage}</p>}
        </div>
      </div>

      {contacts.map(c => (
        <div key={c.id} className="contact-card-container">
          <div className="contact-card-inner">
            <div className="contact-card-front">
              <h3>{c.fullName}</h3>
              <p>{c.jobTitle || 'No Title'}</p>
              <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--brand-primary)' }}>Hover for Details</div>
            </div>
            <div className="contact-card-back">
              <div className="detail-item"><strong>Email:</strong> {c.email || 'N/A'}</div>
              <div className="detail-item"><strong>Phone:</strong> {c.phone || 'N/A'}</div>
              {c.linkUrl && <a href={c.linkUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>Social/Profile</a>}
              {c.isPrimary && <div style={{ marginTop: 'auto', fontWeight: 'bold', color: 'var(--brand-secondary)' }}>Primary Contact</div>}
              <div className="button-group" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="secondary-btn" onClick={() => beginEditContact(c)}>
                  Edit
                </button>
                <button type="button" className="secondary-btn delete-btn" onClick={() => removeContact(c)}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTransitions = () => (
    <div className="qualification-grid">
      <label>Current Phase
        <input type="text" value={partner?.currentPhaseId || ""} disabled />
      </label>
      <label>Target Phase
        <select value={targetPhaseId} onChange={e => setTargetPhaseId(e.target.value)}>
          <option value="">-- Choose Phase --</option>
          {workflowPhases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
        </select>
      </label>
      <label className="full-width">Transition Reason (Optional)
        <textarea rows={2} value={transitionReason} onChange={e => setTransitionReason(e.target.value)} />
      </label>
      <div style={{ marginTop: '1rem' }}>
        <button className="primary-btn" onClick={handleTransition} disabled={isTransitioningPhase || !targetPhaseId}>
          {isTransitioningPhase ? "Transitioning..." : "Execute Phase Move"}
        </button>
      </div>
      {transitionBlockingDetails.length > 0 && (
        <div className="status-card status-error" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
          <h4>Requirements Missing:</h4>
          <ul>{transitionBlockingDetails.map(d => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
    </div>
  );

  const renderArtifacts = () => (
    <div className="qualification-layout">
      <div className="artifact-upload-grid">
        <label>Document Type
          <input type="text" value={artifactDocumentType} onChange={e => setArtifactDocumentType(e.target.value)} />
        </label>
        <label>File
          <input type="file" onChange={e => setArtifactFile(e.target.files?.[0] || null)} />
        </label>
        <button className="primary-btn" disabled={!artifactFile || isUploadingArtifact} onClick={handleUpload}>
          {isUploadingArtifact ? "Uploading..." : "Upload New Artifact"}
        </button>
      </div>
      <div className="artifact-version-groups">
        {artifacts.map(a => (
          <div key={a.id} className="artifact-version-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <div>
               <strong>{a.documentType}</strong> - {a.fileName} (v{a.versionNumber})
              <div className="muted" style={{ fontSize: '0.8rem' }}>{new Date(a.createdAt).toLocaleString()}</div>
            </div>
            <a href={artifactFileUrl(a.id)} target="_blank" rel="noreferrer" className="table-link">Download</a>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDiscoveryNotes = () => (
    <div className="discovery-note-composer">
      <label>Discovery Template
        <select value={selectedTemplateId} onChange={e => { setSelectedTemplateId(e.target.value); applyTemplate(e.target.value); }}>
          <option value="">No Template</option>
          {discoveryTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {guidedAnswers.map((a: DiscoveryNoteGuidedAnswer, i: number) => (
        <label key={i}>{a.question}
          <textarea rows={2} value={a.answer} onChange={e => setGuidedAnswers((prev: DiscoveryNoteGuidedAnswer[]) => prev.map((x, idx) => idx === i ? { ...x, answer: e.target.value } : x))} />
        </label>
      ))}
      <label>Freeform Notes
        <textarea rows={4} value={freeformText} onChange={e => setFreeformText(e.target.value)} />
      </label>
      <button className="primary-btn" onClick={saveNote} disabled={isSavingNote}>Save Note</button>
      <div className="timeline-list" style={{ marginTop: '2rem' }}>
        {discoveryNotes.map(n => (
          <div key={n.id} className="timeline-item">
            <strong>{n.templateName || "Freeform Note"}</strong> - {new Date(n.updatedAt).toLocaleDateString()}
            <p>{n.freeformText}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="timeline-list">
      {timeline.map(e => (
        <div key={e.id} className="timeline-item">
          <div className="timeline-item-head">
            <strong>{e.kind.replace('_', ' ').toUpperCase()}</strong>
            <span>{new Date(e.happenedAt).toLocaleString()}</span>
          </div>
          <p>By {e.actorName}</p>
          {e.kind === 'status_change' && <p>Moved from {e.previousValue?.phaseName} to {e.newValue?.phaseName}</p>}
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <Modal
        title="Loading..."
        open={true}
        onClose={onClose}
        modalClassName="partner-detail-modal"
        bodyClassName="partner-detail-modal-body"
      >
        <div className="loading-state">Syncing partner details...</div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        title="Error"
        open={true}
        onClose={onClose}
        modalClassName="partner-detail-modal"
        bodyClassName="partner-detail-modal-body"
      >
        <div className="status-card status-error">{error}</div>
      </Modal>
    );
  }

  return (
    <Modal
      title={partner?.organizationName || "Details"}
      open={true}
      onClose={onClose}
      modalClassName="partner-detail-modal"
      bodyClassName="partner-detail-modal-body"
    >
      <div className="modal-top-nav-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(["General", "Qualification", "Contacts", "Transitions", "Artifacts", "Discovery Notes", "Timeline"] as const).map(tab => (
            <button key={tab} className={`view-tab-btn ${activeTab === tab ? 'is-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="secondary-btn archive-nav-btn" onClick={handleArchive}>Archive</button>
          {canHardDelete && (
            <button className="secondary-btn" onClick={handleDelete} style={{ color: '#ef4444' }}>
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="modal-body-content">
        {activeTab === "General" && renderGeneral()}
        {activeTab === "Qualification" && renderQualification()}
        {activeTab === "Contacts" && renderContacts()}
        {activeTab === "Transitions" && renderTransitions()}
        {activeTab === "Artifacts" && renderArtifacts()}
        {activeTab === "Discovery Notes" && renderDiscoveryNotes()}
        {activeTab === "Timeline" && renderTimeline()}
      </div>
    </Modal>
  );
};
