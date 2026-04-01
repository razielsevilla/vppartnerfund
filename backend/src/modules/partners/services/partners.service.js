const crypto = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");

class PartnerServiceError extends Error {
  constructor(message, code, status = 400, details = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
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
  return rows.map(mapPartnerRow);
}

async function getPartnerById(partnerId) {
  const db = getDatabase();
  const row = await db("partners").where({ id: partnerId }).first();
  return mapPartnerRow(row);
}

async function updatePartner(partnerId, updates) {
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
  return mapPartnerRow(updated);
}

async function archivePartner(partnerId) {
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
  return mapPartnerRow(archived);
}

module.exports = {
  PartnerServiceError,
  createPartner,
  listPartners,
  getPartnerById,
  updatePartner,
  archivePartner,
};