const crypto = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");
const { logPartnerActivity } = require("../../../shared/services/audit-log.service");

class PartnerServiceError extends Error {
  constructor(message, code, status = 400, details = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const DISCOVERY_NOTE_TEMPLATES = [
  {
    id: "initial_discovery",
    name: "Initial Discovery",
    questions: [
      "What problem is the partner trying to solve?",
      "What outcomes do they consider success in 90 days?",
      "Who are the decision makers and champions?",
    ],
  },
  {
    id: "value_alignment",
    name: "Value Alignment",
    questions: [
      "Which value propositions resonate most with the partner?",
      "What concerns or objections were raised?",
      "What evidence is needed to validate mutual value?",
    ],
  },
  {
    id: "partnership_readiness",
    name: "Partnership Readiness",
    questions: [
      "What dependencies could block execution?",
      "What internal approvals are still pending?",
      "What is the next concrete step and owner?",
    ],
  },
];

const IMPORT_FIELD_CONFIG = [
  { key: "organizationName", label: "Organization Name", required: true, defaultColumn: "Organization Name" },
  { key: "organizationType", label: "Organization Type", required: true, defaultColumn: "Organization Type" },
  { key: "industryNiche", label: "Industry Niche", required: true, defaultColumn: "Industry Niche" },
  { key: "currentPhase", label: "Current Phase (Code or ID)", required: false, defaultColumn: "Current Phase" },
  { key: "impactTier", label: "Impact Tier", required: false, defaultColumn: "Impact Tier" },
  { key: "location", label: "Location", required: false, defaultColumn: "Location" },
  { key: "websiteUrl", label: "Website URL", required: false, defaultColumn: "Website" },
  { key: "pastRelationship", label: "Past Relationship", required: false, defaultColumn: "Past Relationship" },
  { key: "lastContactDate", label: "Last Contact Date", required: false, defaultColumn: "Last Contact Date" },
  { key: "nextActionStep", label: "Next Action Step", required: false, defaultColumn: "Next Action Step" },
];

const ALLOWED_IMPACT_TIERS = new Set(["standard", "major", "lead"]);
const ROLE_PACKAGE_IMPACTS = new Set([
  "standard",
  "major",
  "lead",
  "low",
  "medium",
  "high",
  "transformational",
]);
const FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS = [
  "Direct Access to Tech Talent",
  "Talent Vetting and Mentorship",
  "Thought Leadership and Speaking Slots",
  "Targeted Community Exposure and Media Amplification",
  "User Onboarding and Technical Testing Grounds",
  "CSR Fulfillment and Industry-Academe Bridging",
  "Physical Venue Traffic",
  "Policy Implementation and Economic Development Support",
  "Up-Skilling Opportunities",
  "Teacher Empowerment",
];

const FUNCTIONAL_BENEFIT_OPTIONS_BY_ORG_TYPE = {
  "Tech Corporate": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "IT-BPO": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  Startup: FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Manufacturing / Industrial": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Local Government Unit": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "National Government Agency": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  Academe: FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Academic Organization": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Community / Non-Profit": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Incubator / Accelerator": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Media/Marketing": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
  "Food and Hospitality": FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
};

function getFunctionalBenefitOptions(organizationType) {
  return (
    FUNCTIONAL_BENEFIT_OPTIONS_BY_ORG_TYPE[organizationType] || [
      ...FUNCTIONAL_BENEFIT_PACKAGE_OPTIONS,
    ]
  );
}

function mapPartnerRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    organizationName: row.organization_name,
    organizationType: row.organization_type,
    industryNiche: row.industry_niche,
    websiteUrl: row.website_url,
    location: row.location,
    pastRelationship: row.past_relationship,
    currentPhaseId: row.current_phase_id,
    lastContactDate: row.last_contact_date,
    nextActionStep: row.next_action_step,
    impactTier: row.impact_tier,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPartnerContactRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    partnerId: row.partner_id,
    fullName: row.full_name,
    jobTitle: row.job_title,
    email: row.email,
    phone: row.phone,
    linkUrl: row.link_url,
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeColumnKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function readMappedCell(row, columnName) {
  if (!columnName) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(row, columnName)) {
    const value = row[columnName];
    return value === undefined || value === null ? null : String(value).trim();
  }

  const wanted = normalizeColumnKey(columnName);
  const matchKey = Object.keys(row).find((key) => normalizeColumnKey(key) === wanted);
  if (!matchKey) {
    return null;
  }

  const value = row[matchKey];
  return value === undefined || value === null ? null : String(value).trim();
}

function canonicalName(value) {
  return normalizeName(value).replace(/\s+/g, "");
}

function tokenSet(value) {
  return new Set(normalizeName(value).split(" ").filter(Boolean));
}

function jaccardSimilarity(leftSet, rightSet) {
  if (leftSet.size === 0 && rightSet.size === 0) {
    return 1;
  }

  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function nameSimilarityScore(inputName, existingName) {
  const inputCanonical = canonicalName(inputName);
  const existingCanonical = canonicalName(existingName);

  if (inputCanonical === existingCanonical) {
    return 1;
  }
  if (!inputCanonical || !existingCanonical) {
    return 0;
  }
  if (inputCanonical.includes(existingCanonical) || existingCanonical.includes(inputCanonical)) {
    return 0.9;
  }

  const inputTokens = tokenSet(inputName);
  const existingTokens = tokenSet(existingName);
  return jaccardSimilarity(inputTokens, existingTokens);
}

async function findPotentialDuplicates(db, organizationName) {
  const candidates = await db("partners")
    .whereNull("archived_at")
    .select("id", "organization_name", "organization_type", "industry_niche", "location")
    .orderBy("created_at", "desc");

  return candidates
    .map((row) => {
      const similarity = nameSimilarityScore(organizationName, row.organization_name);
      return {
        id: row.id,
        organizationName: row.organization_name,
        organizationType: row.organization_type,
        industryNiche: row.industry_niche,
        location: row.location,
        similarity,
      };
    })
    .filter((row) => row.similarity >= 0.75)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .map((row) => ({
      ...row,
      similarity: Number(row.similarity.toFixed(2)),
    }));
}

async function assertPhaseExists(db, phaseId) {
  const phase = await db("workflow_phases").where({ id: phaseId }).first();
  if (!phase) {
    throw new PartnerServiceError("currentPhaseId does not exist", "PARTNER_INVALID_PHASE", 400, [
      { field: "currentPhaseId", message: "Referenced workflow phase was not found" },
    ]);
  }
}

async function createPartner(data, actorId) {
  const db = getDatabase();

  await assertPhaseExists(db, data.currentPhaseId);

  const duplicates = await findPotentialDuplicates(db, data.organizationName);
  if (duplicates.length > 0 && !data.confirmDuplicate) {
    throw new PartnerServiceError(
      "Potential duplicate partners detected",
      "PARTNER_DUPLICATE_DETECTED",
      409,
      [
        {
          field: "organizationName",
          message: "Similar partner names already exist",
          candidates: duplicates,
          canConfirmDuplicate: true,
        },
      ],
    );
  }

  const partnerId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db("partners").insert({
    id: partnerId,
    organization_name: data.organizationName,
    organization_type: data.organizationType,
    industry_niche: data.industryNiche,
    website_url: data.websiteUrl,
    location: data.location,
    past_relationship: data.pastRelationship,
    current_phase_id: data.currentPhaseId,
    last_contact_date: data.lastContactDate,
    next_action_step: data.nextActionStep,
    impact_tier: data.impactTier,
    created_by: actorId,
    created_at: nowIso,
    updated_at: nowIso,
  });

  await logPartnerActivity(db, {
    partnerId,
    actionType: "partner_created",
    actorId,
    payload: {
      organizationName: data.organizationName,
      currentPhaseId: data.currentPhaseId,
    },
  });

  const created = await db("partners").where({ id: partnerId }).first();
  return mapPartnerRow(created);
}

async function listPartners(filters) {
  const db = getDatabase();
  const query = db("partners");

  if (filters.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    query.where((builder) => {
      builder
        .whereRaw("lower(organization_name) LIKE ?", [term])
        .orWhereRaw("lower(industry_niche) LIKE ?", [term])
        .orWhereRaw("lower(location) LIKE ?", [term]);
    });
  }
  if (filters.organizationType) {
    query.where("organization_type", filters.organizationType);
  }
  if (filters.industryNiche) {
    query.where("industry_niche", filters.industryNiche);
  }
  if (filters.impactTier) {
    query.where("impact_tier", filters.impactTier);
  }

  if (filters.status === "archived") {
    query.whereNotNull("archived_at");
  } else if (filters.status !== "all") {
    query.whereNull("archived_at");
  }

  const rows = await query.orderBy("created_at", "desc");

  if (!filters.valueProp && !filters.coverageState) {
    return rows.map(mapPartnerRow);
  }

  const qualificationRows = await db("partner_qualification_profiles")
    .whereIn(
      "partner_id",
      rows.map((row) => row.id),
    )
    .select("partner_id", "potential_value_props", "confirmed_value_props");

  const qualificationByPartnerId = new Map(
    qualificationRows.map((row) => [
      row.partner_id,
      {
        potential: new Set(parseJsonArray(row.potential_value_props)),
        confirmed: new Set(parseJsonArray(row.confirmed_value_props)),
      },
    ]),
  );

  const normalizedValueProp = String(filters.valueProp || "").trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const profile = qualificationByPartnerId.get(row.id) || {
      potential: new Set(),
      confirmed: new Set(),
    };

    const hasValueProp =
      !normalizedValueProp ||
      [...profile.potential, ...profile.confirmed].some(
        (item) => String(item).toLowerCase() === normalizedValueProp,
      );

    if (!hasValueProp) {
      return false;
    }

    if (filters.coverageState === "gap") {
      if (!normalizedValueProp) {
        return profile.potential.size > profile.confirmed.size;
      }

      const hasPotential = [...profile.potential].some(
        (item) => String(item).toLowerCase() === normalizedValueProp,
      );
      const hasConfirmed = [...profile.confirmed].some(
        (item) => String(item).toLowerCase() === normalizedValueProp,
      );
      return hasPotential && !hasConfirmed;
    }

    if (filters.coverageState === "covered") {
      if (!normalizedValueProp) {
        return profile.confirmed.size > 0;
      }

      return [...profile.confirmed].some((item) => String(item).toLowerCase() === normalizedValueProp);
    }

    return true;
  });

  return filteredRows.map(mapPartnerRow);
}

async function getPartnerById(partnerId) {
  const db = getDatabase();
  const row = await db("partners").where({ id: partnerId }).first();
  return mapPartnerRow(row);
}

async function updatePartner(partnerId, updates, actorId) {
  const db = getDatabase();

  if (updates.currentPhaseId) {
    await assertPhaseExists(db, updates.currentPhaseId);
  }

  const existing = await db("partners").where({ id: partnerId }).first();
  if (!existing) {
    return null;
  }

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.organizationName !== undefined) payload.organization_name = updates.organizationName;
  if (updates.organizationType !== undefined) payload.organization_type = updates.organizationType;
  if (updates.industryNiche !== undefined) payload.industry_niche = updates.industryNiche;
  if (updates.websiteUrl !== undefined) payload.website_url = updates.websiteUrl;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.pastRelationship !== undefined) payload.past_relationship = updates.pastRelationship;
  if (updates.currentPhaseId !== undefined) payload.current_phase_id = updates.currentPhaseId;
  if (updates.lastContactDate !== undefined) payload.last_contact_date = updates.lastContactDate;
  if (updates.nextActionStep !== undefined) payload.next_action_step = updates.nextActionStep;
  if (updates.impactTier !== undefined) payload.impact_tier = updates.impactTier;

  await db("partners").where({ id: partnerId }).update(payload);

  const updated = await db("partners").where({ id: partnerId }).first();

  await logPartnerActivity(db, {
    partnerId,
    actionType: "partner_updated",
    actorId,
    payload: {
      changedFields: Object.keys(updates).filter((key) => updates[key] !== undefined),
      previous: mapPartnerRow(existing),
      next: mapPartnerRow(updated),
    },
  });

  return mapPartnerRow(updated);
}

async function archivePartner(partnerId, actorId) {
  const db = getDatabase();
  const existing = await db("partners").where({ id: partnerId }).first();
  if (!existing) {
    return null;
  }

  if (!existing.archived_at) {
    await db("partners")
      .where({ id: partnerId })
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }

  const archived = await db("partners").where({ id: partnerId }).first();

  await logPartnerActivity(db, {
    partnerId,
    actionType: "partner_archived",
    actorId,
    payload: {
      previousArchivedAt: existing.archived_at,
      archivedAt: archived.archived_at,
    },
  });

  return mapPartnerRow(archived);
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function parseJsonArray(value) {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((item) => String(item));
}

function mapQualificationRow(row) {
  if (!row) {
    return {
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
  }

  const parsedRolePackages = parseJson(row.role_packages);
  const rolePackages = (Array.isArray(parsedRolePackages) ? parsedRolePackages : [])
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const impactLevel = String(entry.impactLevel || "").trim().toLowerCase();
      const functionalRole = String(entry.functionalRole || "").trim();
      if (!impactLevel || !functionalRole) {
        return null;
      }

      return { impactLevel, functionalRole };
    })
    .filter(Boolean);

  const functionalBenefits = parseJsonArray(row.benefit_packages)
    .map((item) => String(item).trim())
    .filter(Boolean);

  const fallbackImpact = row.impact_level ? String(row.impact_level).trim().toLowerCase() : null;
  const fallbackRole = row.functional_role ? String(row.functional_role).trim() : null;
  const legacyPotential = parseJsonArray(row.potential_value_props);
  const legacyConfirmed = parseJsonArray(row.confirmed_value_props);
  const legacyImpact = rolePackages[0]?.impactLevel || fallbackImpact;
  const legacyRole = rolePackages[0]?.functionalRole || fallbackRole;
  const resolvedBenefits =
    functionalBenefits.length > 0
      ? functionalBenefits
      : legacyConfirmed.length > 0
        ? legacyConfirmed
        : legacyPotential;

  return {
    durationCategory: row.duration_category,
    rolePackages,
    functionalBenefits: resolvedBenefits,
    impactLevel: legacyImpact,
    functionalRole: legacyRole,
    potentialValuePropositions: legacyPotential,
    confirmedValuePropositions: legacyConfirmed,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDiscoveryNoteRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    partnerId: row.partner_id,
    templateId: row.template_id,
    templateName: row.template_name,
    guidedAnswers: parseJson(row.guided_answers) || [],
    freeformText: row.freeform_text,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function discoveryNoteTemplateById(templateId) {
  if (!templateId) {
    return null;
  }

  return DISCOVERY_NOTE_TEMPLATES.find((template) => template.id === templateId) || null;
}

async function assertPartnerExists(db, partnerId) {
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    throw new PartnerServiceError("Partner was not found", "PARTNER_NOT_FOUND", 404, [
      { field: "partnerId", message: "No partner exists with this id" },
    ]);
  }

  return partner;
}

async function listDiscoveryNoteTemplates(partnerId) {
  const db = getDatabase();
  await assertPartnerExists(db, partnerId);
  return DISCOVERY_NOTE_TEMPLATES;
}

async function listDiscoveryNotes(partnerId) {
  const db = getDatabase();
  await assertPartnerExists(db, partnerId);

  const rows = await db("discovery_notes").where({ partner_id: partnerId }).orderBy("created_at", "desc");
  return rows.map(mapDiscoveryNoteRow);
}

async function createDiscoveryNote(partnerId, payload, actorId) {
  const db = getDatabase();
  await assertPartnerExists(db, partnerId);

  const nowIso = new Date().toISOString();
  const noteId = crypto.randomUUID();
  const template = discoveryNoteTemplateById(payload.templateId);

  await db("discovery_notes").insert({
    id: noteId,
    partner_id: partnerId,
    template_id: payload.templateId,
    template_name: payload.templateName || template?.name || null,
    guided_answers: JSON.stringify(payload.guidedAnswers || []),
    freeform_text: payload.freeformText,
    created_by: actorId,
    updated_by: actorId,
    created_at: nowIso,
    updated_at: nowIso,
  });

  await logPartnerActivity(db, {
    partnerId,
    actionType: "discovery_note_created",
    actorId,
    payload: {
      noteId,
      templateId: payload.templateId,
      templateName: payload.templateName || template?.name || null,
      hasGuidedAnswers: (payload.guidedAnswers || []).length > 0,
      hasFreeformText: Boolean(payload.freeformText),
    },
  });

  const saved = await db("discovery_notes").where({ id: noteId }).first();
  return mapDiscoveryNoteRow(saved);
}

async function updateDiscoveryNote(partnerId, noteId, updates, actorId) {
  const db = getDatabase();
  await assertPartnerExists(db, partnerId);

  const existing = await db("discovery_notes").where({ id: noteId, partner_id: partnerId }).first();
  if (!existing) {
    return null;
  }

  const nextTemplateId = updates.templateId === undefined ? existing.template_id : updates.templateId;
  const template = discoveryNoteTemplateById(nextTemplateId);
  const payload = {
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  };

  if (updates.templateId !== undefined) payload.template_id = updates.templateId;
  if (updates.templateName !== undefined) {
    payload.template_name = updates.templateName || template?.name || null;
  }
  if (updates.guidedAnswers !== undefined) payload.guided_answers = JSON.stringify(updates.guidedAnswers);
  if (updates.freeformText !== undefined) payload.freeform_text = updates.freeformText;

  await db("discovery_notes").where({ id: noteId, partner_id: partnerId }).update(payload);

  await logPartnerActivity(db, {
    partnerId,
    actionType: "discovery_note_updated",
    actorId,
    payload: {
      noteId,
      changedFields: Object.keys(payload).filter((field) => !["updated_at", "updated_by"].includes(field)),
    },
  });

  const saved = await db("discovery_notes").where({ id: noteId, partner_id: partnerId }).first();
  return mapDiscoveryNoteRow(saved);
}

async function getPartnerQualification(partnerId) {
  const db = getDatabase();
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    return null;
  }

  const row = await db("partner_qualification_profiles").where({ partner_id: partnerId }).first();
  return mapQualificationRow(row);
}

async function listPartnerContacts(partnerId) {
  const db = getDatabase();
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    return null;
  }

  const rows = await db("partner_contacts")
    .where({ partner_id: partnerId })
    .orderBy("is_primary", "desc")
    .orderBy("created_at", "desc");

  return rows.map(mapPartnerContactRow);
}

async function createPartnerContact(partnerId, payload, actorId) {
  const db = getDatabase();
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const contactId = crypto.randomUUID();

  if (payload.isPrimary) {
    await db("partner_contacts").where({ partner_id: partnerId }).update({ is_primary: false });
  }

  await db("partner_contacts").insert({
    id: contactId,
    partner_id: partnerId,
    full_name: payload.fullName,
    job_title: payload.jobTitle,
    email: payload.email,
    phone: payload.phone,
    link_url: payload.linkUrl,
    is_primary: Boolean(payload.isPrimary),
    created_at: nowIso,
    updated_at: nowIso,
  });

  await logPartnerActivity(db, {
    partnerId,
    actionType: "partner_contact_created",
    actorId,
    payload: {
      fullName: payload.fullName,
      isPrimary: Boolean(payload.isPrimary),
    },
  });

  const saved = await db("partner_contacts").where({ id: contactId }).first();
  return mapPartnerContactRow(saved);
}

async function upsertPartnerQualification(partnerId, payload, actorId) {
  const db = getDatabase();
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    return null;
  }

  const rolePackages = Array.isArray(payload.rolePackages) ? payload.rolePackages : [];
  const functionalBenefits = Array.isArray(payload.functionalBenefits) ? payload.functionalBenefits : [];
  const legacyPotentialValues = Array.isArray(payload.potentialValuePropositions)
    ? payload.potentialValuePropositions
    : [];
  const legacyConfirmedValues = Array.isArray(payload.confirmedValuePropositions)
    ? payload.confirmedValuePropositions
    : [];
  const effectivePotentialValues =
    legacyPotentialValues.length > 0 ? legacyPotentialValues : functionalBenefits;
  const effectiveConfirmedValues =
    legacyConfirmedValues.length > 0 ? legacyConfirmedValues : functionalBenefits;
  const maxBenefitSlots = rolePackages.length + Math.floor(rolePackages.length / 3);

  if (rolePackages.length > 0) {
    for (const item of rolePackages) {
      const normalizedImpact = String(item.impactLevel || "").trim().toLowerCase();
      const normalizedRole = String(item.functionalRole || "").trim();
      if (!ROLE_PACKAGE_IMPACTS.has(normalizedImpact)) {
        throw new PartnerServiceError(
          `Invalid role package impact: ${normalizedImpact || "(empty)"}`,
          "PARTNER_QUALIFICATION_INVALID_PACKAGE",
          400,
          [{ field: "rolePackages", message: "Each role package must use standard, major, or lead impact" }],
        );
      }

      if (!normalizedRole) {
        throw new PartnerServiceError(
          "Functional role is required for each role package",
          "PARTNER_QUALIFICATION_INVALID_PACKAGE",
          400,
          [{ field: "rolePackages", message: "Each role package must include a functional role" }],
        );
      }
    }
  }

  const allowedBenefits = new Set(getFunctionalBenefitOptions(partner.organization_type));
  const shouldValidatePresetBenefits =
    Array.isArray(payload.functionalBenefits) && payload.functionalBenefits.length > 0;
  if (shouldValidatePresetBenefits) {
    for (const benefit of functionalBenefits) {
      if (!allowedBenefits.has(benefit)) {
        throw new PartnerServiceError(
          `Invalid functional benefit for organization type: ${benefit}`,
          "PARTNER_QUALIFICATION_INVALID_BENEFIT",
          400,
          [
            {
              field: "functionalBenefits",
              message: `Functional benefit must match preset options for ${partner.organization_type}`,
            },
          ],
        );
      }
    }
  }

  if (functionalBenefits.length > maxBenefitSlots) {
    throw new PartnerServiceError(
      "Functional benefit package count exceeds allowed slots",
      "PARTNER_QUALIFICATION_BENEFIT_LIMIT_EXCEEDED",
      400,
      [
        {
          field: "functionalBenefits",
          message: `Allowed benefit slots: ${maxBenefitSlots} for ${rolePackages.length} role packages`,
        },
      ],
    );
  }

  const nowIso = new Date().toISOString();
  const row = {
    partner_id: partnerId,
    duration_category: payload.durationCategory,
    impact_level: rolePackages[0]?.impactLevel || payload.impactLevel || null,
    functional_role: rolePackages[0]?.functionalRole || payload.functionalRole || null,
    role_packages: JSON.stringify(rolePackages),
    benefit_packages: JSON.stringify(functionalBenefits),
    potential_value_props: JSON.stringify(effectivePotentialValues),
    confirmed_value_props: JSON.stringify(effectiveConfirmedValues),
    updated_by: actorId,
    updated_at: nowIso,
  };

  const existing = await db("partner_qualification_profiles").where({ partner_id: partnerId }).first();

  if (!existing) {
    await db("partner_qualification_profiles").insert({
      ...row,
      created_at: nowIso,
    });
  } else {
    await db("partner_qualification_profiles").where({ partner_id: partnerId }).update(row);
  }

  await logPartnerActivity(db, {
    partnerId,
    actionType: "partner_qualification_updated",
    actorId,
    payload: {
      previous: mapQualificationRow(existing),
      next: {
        durationCategory: payload.durationCategory,
        rolePackages,
        functionalBenefits,
        impactLevel: rolePackages[0]?.impactLevel || payload.impactLevel || null,
        functionalRole: rolePackages[0]?.functionalRole || payload.functionalRole || null,
      },
    },
  });

  const saved = await db("partner_qualification_profiles").where({ partner_id: partnerId }).first();
  return mapQualificationRow(saved);
}

async function getPartnerTimeline(partnerId) {
  const db = getDatabase();
  const partner = await db("partners").where({ id: partnerId }).first();
  if (!partner) {
    return null;
  }

  const transitions = await db("workflow_transitions as wt")
    .leftJoin("workflow_phases as fp", "wt.from_phase_id", "fp.id")
    .leftJoin("workflow_phases as tp", "wt.to_phase_id", "tp.id")
    .leftJoin("users as u", "wt.changed_by", "u.id")
    .where("wt.partner_id", partnerId)
    .select(
      "wt.id",
      "wt.changed_at",
      "wt.change_reason",
      "wt.changed_by",
      "u.full_name as actor_name",
      "wt.from_phase_id",
      "wt.to_phase_id",
      "fp.name as from_phase_name",
      "tp.name as to_phase_name",
    );

  const activities = await db("activity_logs as al")
    .leftJoin("users as u", "al.actor_id", "u.id")
    .where("al.partner_id", partnerId)
    .select(
      "al.id",
      "al.action_type",
      "al.action_description",
      "al.actor_id",
      "u.full_name as actor_name",
      "al.happened_at",
    );

  const transitionEntries = transitions.map((entry) => ({
    id: `transition:${entry.id}`,
    kind: "status_change",
    actionType: "workflow_transition",
    actorId: entry.changed_by,
    actorName: entry.actor_name || "Unknown User",
    happenedAt: entry.changed_at,
    previousValue: {
      phaseId: entry.from_phase_id,
      phaseName: entry.from_phase_name || null,
    },
    newValue: {
      phaseId: entry.to_phase_id,
      phaseName: entry.to_phase_name || null,
    },
    metadata: {
      reason: entry.change_reason,
    },
  }));

  const activityEntries = activities.map((entry) => ({
    id: `activity:${entry.id}`,
    kind: "activity",
    actionType: entry.action_type,
    actorId: entry.actor_id,
    actorName: entry.actor_name || "Unknown User",
    happenedAt: entry.happened_at,
    previousValue: null,
    newValue: null,
    metadata: parseJson(entry.action_description),
  }));

  const entries = [...transitionEntries, ...activityEntries].sort((left, right) =>
    left.happenedAt < right.happenedAt ? 1 : -1,
  );

  return { entries };
}

async function getPartnerImportMappingConfig() {
  const db = getDatabase();
  const phases = await db("workflow_phases")
    .where({ is_active: 1 })
    .whereNot({ code: "archived" })
    .orderBy("sort_order", "asc")
    .select("id", "code", "name");

  return {
    fields: IMPORT_FIELD_CONFIG,
    phaseOptions: phases.map((phase) => ({
      id: phase.id,
      code: phase.code,
      name: phase.name,
    })),
    guidance: [
      "Map required fields first: Organization Name, Organization Type, and Industry Niche.",
      "Use dry-run to validate rows before applying writes.",
      "Current Phase accepts either workflow phase id (phase_lead) or code (lead).",
    ],
  };
}

function toNormalizedString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

async function importPartnersFromSpreadsheet(payload, actorId) {
  const db = getDatabase();
  const nowIso = new Date().toISOString();
  const rows = payload.rows || [];
  const mapping = payload.mapping || {};
  const dryRun = Boolean(payload.dryRun);

  const phaseRows = await db("workflow_phases").select("id", "code");
  const phaseById = new Map(phaseRows.map((phase) => [phase.id, phase.id]));
  const phaseByCode = new Map(phaseRows.map((phase) => [phase.code, phase.id]));

  const summary = {
    totalRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  const results = [];

  const run = async (queryClient) => {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const rowNumber = index + 1;

      const organizationName = toNormalizedString(readMappedCell(row, mapping.organizationName));
      const organizationType = toNormalizedString(readMappedCell(row, mapping.organizationType));
      const industryNiche = toNormalizedString(readMappedCell(row, mapping.industryNiche));
      const location = toNormalizedString(readMappedCell(row, mapping.location));
      const websiteUrl = toNormalizedString(readMappedCell(row, mapping.websiteUrl));
      const pastRelationship = toNormalizedString(readMappedCell(row, mapping.pastRelationship));
      const lastContactDate = toNormalizedString(readMappedCell(row, mapping.lastContactDate));
      const nextActionStep = toNormalizedString(readMappedCell(row, mapping.nextActionStep));

      let impactTier = toNormalizedString(readMappedCell(row, mapping.impactTier));
      if (impactTier) {
        impactTier = impactTier.toLowerCase();
      }

      let currentPhaseRaw = toNormalizedString(readMappedCell(row, mapping.currentPhase));
      if (!currentPhaseRaw) {
        currentPhaseRaw = "phase_lead";
      }
      const currentPhaseId =
        phaseById.get(currentPhaseRaw) || phaseByCode.get(currentPhaseRaw.toLowerCase()) || null;

      const rowErrors = [];
      if (!organizationName) {
        rowErrors.push("organizationName is required");
      }
      if (!organizationType) {
        rowErrors.push("organizationType is required");
      }
      if (!industryNiche) {
        rowErrors.push("industryNiche is required");
      }
      if (!currentPhaseId) {
        rowErrors.push(`Invalid currentPhase value: ${currentPhaseRaw}`);
      }
      if (impactTier && !ALLOWED_IMPACT_TIERS.has(impactTier)) {
        rowErrors.push(`Invalid impactTier value: ${impactTier}`);
      }

      if (rowErrors.length > 0) {
        summary.failed += 1;
        results.push({
          rowNumber,
          action: "failed",
          reason: rowErrors.join("; "),
          organizationName: organizationName || null,
        });
        continue;
      }

      const existing = await queryClient("partners")
        .whereRaw("lower(organization_name) = ?", [organizationName.toLowerCase()])
        .whereNull("archived_at")
        .first();

      if (!existing) {
        if (!dryRun) {
          await queryClient("partners").insert({
            id: crypto.randomUUID(),
            organization_name: organizationName,
            organization_type: organizationType,
            industry_niche: industryNiche,
            website_url: websiteUrl,
            location,
            past_relationship: pastRelationship,
            current_phase_id: currentPhaseId,
            last_contact_date: lastContactDate,
            next_action_step: nextActionStep,
            impact_tier: impactTier,
            created_by: actorId,
            created_at: nowIso,
            updated_at: nowIso,
          });
        }

        summary.created += 1;
        results.push({
          rowNumber,
          action: dryRun ? "would_create" : "created",
          reason: null,
          organizationName,
        });
        continue;
      }

      const nextPayload = {
        organization_name: organizationName,
        organization_type: organizationType,
        industry_niche: industryNiche,
        website_url: websiteUrl,
        location,
        past_relationship: pastRelationship,
        current_phase_id: currentPhaseId,
        last_contact_date: lastContactDate,
        next_action_step: nextActionStep,
        impact_tier: impactTier,
      };

      const changedFields = Object.entries(nextPayload)
        .filter(([field, value]) => {
          const previous = existing[field];
          const left = previous === undefined || previous === null ? null : String(previous);
          const right = value === undefined || value === null ? null : String(value);
          return left !== right;
        })
        .map(([field]) => field);

      if (changedFields.length === 0) {
        summary.skipped += 1;
        results.push({
          rowNumber,
          action: "skipped",
          reason: "No changes detected",
          organizationName,
        });
        continue;
      }

      if (!dryRun) {
        await queryClient("partners").where({ id: existing.id }).update({
          ...nextPayload,
          updated_at: nowIso,
        });
      }

      summary.updated += 1;
      results.push({
        rowNumber,
        action: dryRun ? "would_update" : "updated",
        reason: `Updated fields: ${changedFields.join(", ")}`,
        organizationName,
      });
    }
  };

  if (dryRun) {
    await run(db);
  } else {
    await db.transaction(async (trx) => {
      await run(trx);
    });
  }

  return {
    dryRun,
    executedAt: nowIso,
    summary,
    results,
  };
}

module.exports = {
  PartnerServiceError,
  createPartner,
  listPartners,
  getPartnerById,
  getFunctionalBenefitOptions,
  getPartnerQualification,
  listPartnerContacts,
  updatePartner,
  createPartnerContact,
  upsertPartnerQualification,
  archivePartner,
  getPartnerTimeline,
  listDiscoveryNoteTemplates,
  listDiscoveryNotes,
  createDiscoveryNote,
  updateDiscoveryNote,
  getPartnerImportMappingConfig,
  importPartnersFromSpreadsheet,
};