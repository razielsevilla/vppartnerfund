const crypto = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");
const { PartnerServiceError } = require("../../partners/services/partners.service");
const { logPartnerActivity } = require("../../../shared/services/audit-log.service");

function toPhase(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
  };
}

function toRule(row) {
  return {
    id: row.id,
    fromPhaseId: row.from_phase_id,
    toPhaseId: row.to_phase_id,
    requiresLastContactDate: Boolean(row.requires_last_contact_date),
    requiresNextActionStep: Boolean(row.requires_next_action_step),
    isActive: Boolean(row.is_active),
  };
}

async function getWorkflowConfig() {
  const db = getDatabase();
  const phases = await db("workflow_phases").orderBy("sort_order", "asc");
  const rules = await db("workflow_transition_rules").where({ is_active: 1 });

  return {
    phases: phases.map(toPhase),
    transitionRules: rules.map(toRule),
  };
}

async function replaceTransitionRules(rules) {
  const db = getDatabase();
  const nowIso = new Date().toISOString();

  const phaseIds = new Set((await db("workflow_phases").select("id")).map((row) => row.id));

  rules.forEach((rule) => {
    if (!phaseIds.has(rule.fromPhaseId) || !phaseIds.has(rule.toPhaseId)) {
      throw new PartnerServiceError(
        "Transition rule references unknown phase",
        "WORKFLOW_INVALID_RULE_REFERENCE",
        400,
        [
          {
            field: "transitionRules",
            message: `Invalid phase reference in rule ${rule.fromPhaseId} -> ${rule.toPhaseId}`,
          },
        ],
      );
    }
  });

  await db.transaction(async (trx) => {
    await trx("workflow_transition_rules").del();
    const rows = rules.map((rule) => ({
      id: crypto.randomUUID(),
      from_phase_id: rule.fromPhaseId,
      to_phase_id: rule.toPhaseId,
      requires_last_contact_date: Boolean(rule.requiresLastContactDate),
      requires_next_action_step: Boolean(rule.requiresNextActionStep),
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    if (rows.length > 0) {
      await trx("workflow_transition_rules").insert(rows);
    }
  });

  return getWorkflowConfig();
}

async function transitionPartnerPhase(partnerId, toPhaseId, actorId, reason) {
  const db = getDatabase();

  return db.transaction(async (trx) => {
    const partner = await trx("partners").where({ id: partnerId }).first();
    if (!partner) {
      throw new PartnerServiceError("Partner was not found", "PARTNER_NOT_FOUND", 404, [
        { field: "partnerId", message: "No partner exists with this id" },
      ]);
    }

    if (partner.archived_at) {
      throw new PartnerServiceError("Archived partners cannot transition", "WORKFLOW_PARTNER_ARCHIVED", 400, [
        { field: "partnerId", message: "Partner is archived and cannot change phase" },
      ]);
    }

    if (partner.current_phase_id === toPhaseId) {
      throw new PartnerServiceError("Partner is already in that phase", "WORKFLOW_NO_PHASE_CHANGE", 400, [
        { field: "toPhaseId", message: "Target phase must differ from current phase" },
      ]);
    }

    const fromPhase = await trx("workflow_phases").where({ id: partner.current_phase_id }).first();
    const toPhase = await trx("workflow_phases").where({ id: toPhaseId }).first();

    if (!fromPhase || !toPhase) {
      throw new PartnerServiceError("Invalid workflow phase", "WORKFLOW_PHASE_NOT_FOUND", 400, [
        { field: "toPhaseId", message: "One or both workflow phases are invalid" },
      ]);
    }

    const rule = await trx("workflow_transition_rules")
      .where({ from_phase_id: fromPhase.id, to_phase_id: toPhase.id, is_active: 1 })
      .first();

    if (!rule) {
      const allowed = await trx("workflow_transition_rules")
        .where({ from_phase_id: fromPhase.id, is_active: 1 })
        .select("to_phase_id");

      throw new PartnerServiceError("Invalid phase transition", "WORKFLOW_INVALID_TRANSITION", 400, [
        {
          field: "toPhaseId",
          message: `Transition from ${fromPhase.code} to ${toPhase.code} is not allowed`,
          allowedToPhaseIds: allowed.map((entry) => entry.to_phase_id),
        },
      ]);
    }

    const missing = [];
    if (rule.requires_last_contact_date && !partner.last_contact_date) {
      missing.push("lastContactDate");
    }
    if (rule.requires_next_action_step && !partner.next_action_step) {
      missing.push("nextActionStep");
    }

    if (missing.length > 0) {
      throw new PartnerServiceError(
        "Transition requirements not satisfied",
        "WORKFLOW_REQUIREMENTS_NOT_MET",
        400,
        [
          {
            field: "transition",
            message: "Required partner fields are missing for this transition",
            requiredFields: missing,
          },
        ],
      );
    }

    const nowIso = new Date().toISOString();

    await trx("partners").where({ id: partnerId }).update({
      current_phase_id: toPhase.id,
      updated_at: nowIso,
    });

    await trx("workflow_transitions").insert({
      id: crypto.randomUUID(),
      partner_id: partner.id,
      from_phase_id: fromPhase.id,
      to_phase_id: toPhase.id,
      change_reason: reason || null,
      changed_by: actorId,
      changed_at: nowIso,
    });

    await logPartnerActivity(trx, {
      partnerId: partner.id,
      actionType: "partner_phase_transitioned",
      actorId,
      payload: {
        previous: { phaseId: fromPhase.id, phaseCode: fromPhase.code, phaseName: fromPhase.name },
        next: { phaseId: toPhase.id, phaseCode: toPhase.code, phaseName: toPhase.name },
        reason: reason || null,
      },
    });

    const updated = await trx("partners").where({ id: partnerId }).first();

    return {
      id: updated.id,
      organizationName: updated.organization_name,
      organizationType: updated.organization_type,
      industryNiche: updated.industry_niche,
      websiteUrl: updated.website_url,
      location: updated.location,
      pastRelationship: updated.past_relationship,
      currentPhaseId: updated.current_phase_id,
      lastContactDate: updated.last_contact_date,
      nextActionStep: updated.next_action_step,
      impactTier: updated.impact_tier,
      archivedAt: updated.archived_at,
      createdBy: updated.created_by,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  });
}

module.exports = {
  getWorkflowConfig,
  replaceTransitionRules,
  transitionPartnerPhase,
};