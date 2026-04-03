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
  BASELINE_BENEFIT,
  DURATION_OPTIONS,
  FUNCTIONAL_BENEFIT_GUIDES,
  getBenefitSelectionLimits,
  ROLE_PACKAGE_FUNCTION_OPTIONS,
  ROLE_GUIDES,
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
  const [activeBenefitCategory, setActiveBenefitCategory] = useState<string>("");
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
    if (!selectedRole) return;

    const guide = ROLE_GUIDES[selectedRole];
    const newPackage = {
      functionalRole: selectedRole,
      impactLevel: selectedTier,
      checklistItems: selectedTier === "lead" ? guide.tiers.lead : [],
    };
    setQualification((prev) => ({
      ...prev,
      rolePackages: [...prev.rolePackages, newPackage],
    }));
    setSelectedRole("");
    setSelectedTier("standard");
    setQualificationMessage(null);
  };

  const removeRolePackage = (index: number) => {
    setQualification((prev) => {
      const nextRolePackages = prev.rolePackages.filter((_, i) => i !== index);
      const nextSlots = getBenefitSelectionLimits(nextRolePackages).totalSelections;

      return {
        ...prev,
        rolePackages: nextRolePackages,
        functionalBenefits: prev.functionalBenefits.slice(0, nextSlots),
      };
    });
    setQualificationMessage(null);
  };

  const updateLeadPackageDeliverables = (index: number, value: string) => {
    const parsedItems = value
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);

    setQualification((prev) => ({
      ...prev,
      rolePackages: prev.rolePackages.map((pkg, currentIndex) =>
        currentIndex === index && pkg.impactLevel === "lead"
          ? {
              ...pkg,
              checklistItems: parsedItems,
            }
          : pkg,
      ),
    }));
    setQualificationMessage(null);
  };

  const getBenefitLimits = () => {
    return getBenefitSelectionLimits(qualification.rolePackages);
  };

  const benefitLimits = getBenefitLimits();
  const benefitGuideEntries = Object.entries(FUNCTIONAL_BENEFIT_GUIDES);

  const resolveBenefitCategory = (benefit: string) => {
    for (const [categoryName, guide] of benefitGuideEntries) {
      if (guide.responsibilities.includes(benefit)) {
        return categoryName;
      }
    }
    return null;
  };

  const selectedBenefitCategories = Array.from(
    new Set(
      qualification.functionalBenefits
        .map((benefit) => resolveBenefitCategory(benefit))
        .filter((categoryName): categoryName is string => Boolean(categoryName)),
    ),
  );

  const getCategoryPickLimit = (categoryName: string) => {
    const categoryIndex = selectedBenefitCategories.indexOf(categoryName);
    return (
      (categoryIndex !== -1 && categoryIndex < benefitLimits.baseCategories) ||
      (categoryIndex === -1 && selectedBenefitCategories.length < benefitLimits.baseCategories)
        ? benefitLimits.picksPerBaseCategory
        : benefitLimits.picksPerBonusCategory
    );
  };

  const toggleBenefitSelection = (benefit: string, category: string) => {
    setQualification((prev) => {
      const isSelected = prev.functionalBenefits.includes(benefit);
      const categorySelections = prev.functionalBenefits.filter(b => 
        FUNCTIONAL_BENEFIT_GUIDES[category]?.responsibilities.includes(b)
      );

      if (isSelected) {
        return {
          ...prev,
          functionalBenefits: prev.functionalBenefits.filter(b => b !== benefit),
        };
      } else {
        // Enforce pick limit per category
        const selectedCategories = Array.from(new Set(prev.functionalBenefits.map(b => {
          for (const cat in FUNCTIONAL_BENEFIT_GUIDES) {
            if (FUNCTIONAL_BENEFIT_GUIDES[cat].responsibilities.includes(b)) return cat;
          }
          return null;
        }).filter(Boolean)));
        
        const isNewCategory = !selectedCategories.includes(category);
        if (isNewCategory && selectedCategories.length >= benefitLimits.totalCategories) {
          setQualificationMessage(`You can only select up to ${benefitLimits.totalCategories} benefit categories.`);
          return prev;
        }

        // Determine if this category is treated as "base" or "bonus" for pick limit
        const categoryIndex = selectedCategories.indexOf(category);
        const limit =
          (categoryIndex !== -1 && categoryIndex < benefitLimits.baseCategories) ||
          (categoryIndex === -1 && selectedCategories.length < benefitLimits.baseCategories)
            ? benefitLimits.picksPerBaseCategory
            : benefitLimits.picksPerBonusCategory;

        if (categorySelections.length >= limit) {
          setQualificationMessage(`You can only pick ${limit} selections for this category.`);
          return prev;
        }

        // Enforce Lead tier for ★
        if (benefit.includes("★") && benefitLimits.highestImpact !== "lead") {
          setQualificationMessage("Only partners with Lead Tier role packages can select starred (★) benefits.");
          return prev;
        }

        setQualificationMessage(null);
        return {
          ...prev,
          functionalBenefits: [...prev.functionalBenefits, benefit],
        };
      }
    });
  };

  const saveQualificationMapping = async () => {
    if (qualification.rolePackages.length === 0) {
      setQualificationMessage("Add at least one role package before saving.");
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
                <table className="role-package-table spreadsheet-style">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Category & Responsibility</th>
                      <th style={{ width: '25%' }}>Standard Tier</th>
                      <th style={{ width: '25%' }}>Major Tier</th>
                      <th style={{ width: '25%' }}>Lead Tier (Negotiable)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="category-cell">
                        <strong>{selectedRole}</strong>
                        <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {ROLE_GUIDES[selectedRole].description}
                        </p>
                      </td>
                      <td 
                        className={`tier-cell ${selectedTier === 'standard' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedTier('standard')}
                      >
                        <div className="tier-content">
                          <ul>
                            {ROLE_GUIDES[selectedRole].tiers.standard.map((item) => (
                              <li key={`selected-role:${selectedRole}:standard:${item}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          className={`tier-select-btn ${selectedTier === 'standard' ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedTier('standard'); }}
                        >
                          {selectedTier === 'standard' ? 'Selected' : 'Choose'}
                        </button>
                      </td>
                      <td 
                        className={`tier-cell ${selectedTier === 'major' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedTier('major')}
                      >
                        <div className="tier-content">
                          <ul>
                            {ROLE_GUIDES[selectedRole].tiers.major.map((item) => (
                              <li key={`selected-role:${selectedRole}:major:${item}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          className={`tier-select-btn ${selectedTier === 'major' ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedTier('major'); }}
                        >
                          {selectedTier === 'major' ? 'Selected' : 'Choose'}
                        </button>
                      </td>
                      <td 
                        className={`tier-cell ${selectedTier === 'lead' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedTier('lead')}
                      >
                        <div className="tier-content">
                          <ul>
                            {ROLE_GUIDES[selectedRole].tiers.lead.map((item) => (
                              <li key={`selected-role:${selectedRole}:lead:${item}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          className={`tier-select-btn ${selectedTier === 'lead' ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedTier('lead'); }}
                        >
                          {selectedTier === 'lead' ? 'Selected' : 'Choose'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="muted" style={{ marginTop: "0.75rem" }}>
                  Standard and Major tier responsibilities are fixed commitments. Lead tier responsibilities are negotiable and can be custom-tailored to fit the partner's goals, capabilities, and budget.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button className="emphasized-add-btn" onClick={addRolePackage}>
                    Add {selectedTier.toUpperCase()} {selectedRole}
                  </button>
                </div>
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
                    {pkg.impactLevel === "lead" ? (
                      <label>
                        <span>Negotiable Lead Deliverables</span>
                        <textarea
                          rows={4}
                          value={(pkg.checklistItems || []).join("\n")}
                          onChange={(event) => updateLeadPackageDeliverables(index, event.target.value)}
                          placeholder="One deliverable per line"
                        />
                      </label>
                    ) : (
                      <div>
                        <p>Fixed commitment:</p>
                        <ul>
                          {(ROLE_GUIDES[pkg.functionalRole]?.tiers[pkg.impactLevel] || ["Defined in role guide"]).map((item) => (
                            <li key={`${pkg.functionalRole}:${pkg.impactLevel}:${item}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
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
            <span>Benefit Packages Selection</span>
            <span>{openPanel === 'benefit' ? 'Collapse' : 'Expand'}</span>
          </div>
          <div className="sliding-panel-content">
            <div className="baseline-benefit-box">
              <h4>{BASELINE_BENEFIT.name}</h4>
              <ul className="baseline-list">
                {BASELINE_BENEFIT.responsibilities.map(r => <li key={r}>{r}</li>)}
              </ul>
            </div>

            {qualification.rolePackages.length === 0 ? (
              <p className="muted" style={{ marginTop: '1rem' }}>Assign at least one Role Package to unlock Benefit Packages.</p>
            ) : (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="limits-banner">
                  <span>Categories: <strong>{benefitLimits.totalCategories}</strong> (Base: {benefitLimits.baseCategories}, Bonus: {benefitLimits.bonusCategories})</span>
                  <span> | Picks per Category: <strong>{benefitLimits.picksPerBaseCategory}</strong> (Bonus: {benefitLimits.picksPerBonusCategory})</span>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  <span>Choose Benefit Package First</span>
                  <select
                    value={activeBenefitCategory}
                    onChange={(event) => setActiveBenefitCategory(event.target.value)}
                  >
                    <option value="">Select benefit package</option>
                    {benefitGuideEntries.map(([catName]) => {
                      const isAlreadySelected = selectedBenefitCategories.includes(catName);
                      const categoriesAtLimit = !isAlreadySelected && selectedBenefitCategories.length >= benefitLimits.totalCategories;
                      const optionLimit = getCategoryPickLimit(catName);
                      const selectedInCategory = qualification.functionalBenefits.filter((benefit) =>
                        FUNCTIONAL_BENEFIT_GUIDES[catName]?.responsibilities.includes(benefit),
                      ).length;

                      return (
                        <option key={catName} value={catName} disabled={categoriesAtLimit}>
                          {`${catName} (${selectedInCategory}/${optionLimit})`}
                        </option>
                      );
                    })}
                  </select>
                </label>

                {!activeBenefitCategory && (
                  <p className="muted">Select a benefit package to view detailed benefits.</p>
                )}

                {activeBenefitCategory && FUNCTIONAL_BENEFIT_GUIDES[activeBenefitCategory] && (() => {
                  const guide = FUNCTIONAL_BENEFIT_GUIDES[activeBenefitCategory];
                  const selectedInCat = qualification.functionalBenefits.filter((benefit) =>
                    guide.responsibilities.includes(benefit),
                  );
                  const isAnySelected = selectedInCat.length > 0;
                  const limit = getCategoryPickLimit(activeBenefitCategory);

                  return (
                    <div className="benefit-categories-grid">
                      <div className={`benefit-category-card ${isAnySelected ? 'is-active' : ''}`}>
                        <div className="category-header">
                          <strong>{activeBenefitCategory}</strong>
                          <span className="count-badge">{selectedInCat.length} / {limit}</span>
                        </div>
                        <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>{guide.description}</p>

                        <div className="benefit-options-list">
                          {guide.responsibilities.map((resp) => {
                            const isChecked = qualification.functionalBenefits.includes(resp);
                            const isStar = resp.includes("★");
                            const isLocked = isStar && benefitLimits.highestImpact !== "lead";

                            return (
                              <label key={resp} className={`benefit-option-label ${isLocked ? 'is-locked' : ''} ${isChecked ? 'is-checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isLocked}
                                  onChange={() => toggleBenefitSelection(resp, activeBenefitCategory)}
                                />
                                <span className={isStar ? 'star-text' : ''}>{resp}</span>
                                {isLocked && <span className="lock-icon">🔒</span>}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="status-card">
        <h3>Give-and-Take Summary</h3>
        <p><strong>Role Coverage:</strong></p>
        <div className="tags-list">
          {qualification.rolePackages.map((pkg, index) => (
            <span key={index} className="tag">{pkg.impactLevel.toUpperCase()} {pkg.functionalRole}</span>
          ))}
        </div>
        
        <p style={{ marginTop: '1rem' }}><strong>Benefit Selections:</strong></p>
        <p className="muted" style={{ fontSize: '0.85rem' }}>+ {BASELINE_BENEFIT.name}</p>
        <div className="tags-list">
          {qualification.functionalBenefits.map((benefit, index) => (
            <span key={index} className="tag tag-benefit">{benefit}</span>
          ))}
        </div>
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
