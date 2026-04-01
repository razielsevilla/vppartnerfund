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

function toArtifactRequirement(row) {
  return {
    id: row.id,
    toPhaseId: row.to_phase_id,
    documentType: row.document_type,
    requiredStatus: row.required_status,
    isActive: Boolean(row.is_active),
  };
}

function daysBetween(fromIso, toIso) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

async function getWorkflowConfig() {
  const db = getDatabase();
  const phases = await db("workflow_phases").orderBy("sort_order", "asc");
  const rules = await db("workflow_transition_rules").where({ is_active: 1 });
  const artifactRequirements = await db("workflow_artifact_requirements").where({ is_active: 1 });

  return {
    phases: phases.map(toPhase),
    transitionRules: rules.map(toRule),
    artifactRequirements: artifactRequirements.map(toArtifactRequirement),
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

    const artifactRequirements = await trx("workflow_artifact_requirements")
      .where({ to_phase_id: toPhase.id, is_active: 1 })
      .select("document_type", "required_status");

    if (artifactRequirements.length > 0) {
      const missingArtifacts = [];

      for (const requirement of artifactRequirements) {
        const artifact = await trx("artifact_records")
          .where({
            partner_id: partner.id,
            document_type: requirement.document_type,
            status: requirement.required_status,
          })
          .orderBy("version_number", "desc")
          .first();

        if (!artifact) {
          missingArtifacts.push({
            documentType: requirement.document_type,
            requiredStatus: requirement.required_status,
          });
        }
      }

      if (missingArtifacts.length > 0) {
        throw new PartnerServiceError(
          "Transition blocked by missing required artifacts",
          "WORKFLOW_ARTIFACT_REQUIREMENTS_NOT_MET",
          400,
          [
            {
              field: "artifacts",
              message: "Upload required artifacts before transitioning to this phase",
              requiredArtifacts: missingArtifacts,
            },
          ],
        );
      }
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

async function getWorkflowHealthConfig() {
  const db = getDatabase();

  const overdueConfig = await db("workflow_health_config")
    .where({ key: "overdue_next_action_days" })
    .first();
  const thresholds = await db("workflow_stage_stall_thresholds as t")
    .join("workflow_phases as p", "t.phase_id", "p.id")
    .select("t.phase_id", "t.stall_threshold_days", "p.code", "p.name")
    .orderBy("p.sort_order", "asc");

  return {
    overdueNextActionDays: overdueConfig?.value_int ?? 14,
    stageThresholds: thresholds.map((entry) => ({
      phaseId: entry.phase_id,
      phaseCode: entry.code,
      phaseName: entry.name,
      stallThresholdDays: entry.stall_threshold_days,
    })),
  };
}

async function updateWorkflowHealthConfig(payload) {
  const db = getDatabase();
  const nowIso = new Date().toISOString();

  await db.transaction(async (trx) => {
    await trx("workflow_health_config")
      .insert({ key: "overdue_next_action_days", value_int: payload.overdueNextActionDays, updated_at: nowIso })
      .onConflict("key")
      .merge({ value_int: payload.overdueNextActionDays, updated_at: nowIso });

    const existingPhaseIds = new Set(
      (await trx("workflow_phases").select("id").whereNot({ code: "archived" })).map((row) => row.id),
    );

    payload.stageThresholds.forEach((threshold) => {
      if (!existingPhaseIds.has(threshold.phaseId)) {
        throw new PartnerServiceError(
          "Unknown phase in stage threshold config",
          "WORKFLOW_INVALID_STAGE_THRESHOLD",
          400,
          [
            {
              field: "stageThresholds",
              message: `Unknown phaseId: ${threshold.phaseId}`,
            },
          ],
        );
      }
    });

    await trx("workflow_stage_stall_thresholds").del();
    if (payload.stageThresholds.length > 0) {
      await trx("workflow_stage_stall_thresholds").insert(
        payload.stageThresholds.map((threshold) => ({
          phase_id: threshold.phaseId,
          stall_threshold_days: threshold.stallThresholdDays,
          updated_at: nowIso,
        })),
      );
    }
  });

  return getWorkflowHealthConfig();
}

async function getWorkflowHealthMetrics() {
  const db = getDatabase();
  const nowIso = new Date().toISOString();

  const config = await getWorkflowHealthConfig();

  const activePartners = await db("partners as p")
    .join("workflow_phases as wp", "p.current_phase_id", "wp.id")
    .whereNull("p.archived_at")
    .select(
      "p.id",
      "p.organization_name",
      "p.current_phase_id",
      "wp.code as current_phase_code",
      "wp.name as current_phase_name",
      "p.created_at",
      "p.last_contact_date",
      "p.next_action_step",
    );

  const transitions = await db("workflow_transitions")
    .whereIn(
      "partner_id",
      activePartners.map((partner) => partner.id),
    )
    .select("partner_id", "to_phase_id", "changed_at")
    .orderBy("changed_at", "desc");

  const thresholdsByPhaseId = new Map(
    config.stageThresholds.map((entry) => [entry.phaseId, entry.stallThresholdDays]),
  );

  const overduePartners = [];
  const stalledPartners = [];
  const stageMetricsMap = new Map();

  activePartners.forEach((partner) => {
    const anchorDate = partner.last_contact_date || partner.created_at;
    const overdueDays = daysBetween(anchorDate, nowIso);
    const isOverdue = Boolean(partner.next_action_step) && overdueDays > config.overdueNextActionDays;

    if (isOverdue) {
      overduePartners.push({
        partnerId: partner.id,
        organizationName: partner.organization_name,
        currentPhaseId: partner.current_phase_id,
        currentPhaseCode: partner.current_phase_code,
        currentPhaseName: partner.current_phase_name,
        daysSinceAnchor: overdueDays,
        overdueByDays: overdueDays - config.overdueNextActionDays,
      });
    }

    const partnerTransitions = transitions.filter(
      (transition) =>
        transition.partner_id === partner.id && transition.to_phase_id === partner.current_phase_id,
    );
    const phaseEnteredAt = partnerTransitions[0]?.changed_at || partner.created_at;

    const stageDays = daysBetween(phaseEnteredAt, nowIso);
    const threshold = thresholdsByPhaseId.get(partner.current_phase_id);
    const isStalled = typeof threshold === "number" && stageDays > threshold;

    if (isStalled) {
      stalledPartners.push({
        partnerId: partner.id,
        organizationName: partner.organization_name,
        currentPhaseId: partner.current_phase_id,
        currentPhaseCode: partner.current_phase_code,
        currentPhaseName: partner.current_phase_name,
        daysInCurrentPhase: stageDays,
        thresholdDays: threshold,
        exceededByDays: stageDays - threshold,
      });

      const stageKey = partner.current_phase_id;
      if (!stageMetricsMap.has(stageKey)) {
        stageMetricsMap.set(stageKey, {
          phaseId: partner.current_phase_id,
          phaseCode: partner.current_phase_code,
          phaseName: partner.current_phase_name,
          stalledCount: 0,
          thresholdDays: threshold,
        });
      }
      stageMetricsMap.get(stageKey).stalledCount += 1;
    }
  });

  return {
    summary: {
      totalActivePartners: activePartners.length,
      overdueNextActionCount: overduePartners.length,
      stalledPartnerCount: stalledPartners.length,
      overdueNextActionDaysThreshold: config.overdueNextActionDays,
    },
    overduePartners,
    stalledPartners,
    stageMetrics: [...stageMetricsMap.values()].sort((a, b) => b.stalledCount - a.stalledCount),
  };
}

module.exports = {
  getWorkflowConfig,
  replaceTransitionRules,
  transitionPartnerPhase,
  getWorkflowHealthConfig,
  updateWorkflowHealthConfig,
  getWorkflowHealthMetrics,
};