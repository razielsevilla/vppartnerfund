const crypto = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");

const ALLOWED_TAXONOMY_KEYS = new Set([
  "organization_type",
  "industry_niche",
  "impact_tier",
  "value_proposition",
]);

class SettingsServiceError extends Error {
  constructor(message, code, status = 400, details = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function logSettingsAudit(trx, { domain, action, actorId, payload }) {
  await trx("settings_audit_logs").insert({
    id: crypto.randomUUID(),
    domain,
    action,
    actor_id: actorId,
    payload: payload ? JSON.stringify(payload) : null,
    created_at: new Date().toISOString(),
  });
}

async function getSettingsMasterData() {
  const db = getDatabase();

  const [phaseRows, taxonomyRows] = await Promise.all([
    db("workflow_phases")
      .select("id", "code", "name", "sort_order", "is_active")
      .orderBy("sort_order", "asc"),
    db("master_taxonomy_items")
      .select("id", "taxonomy_key", "value", "label", "sort_order", "is_active", "updated_at")
      .orderBy("taxonomy_key", "asc")
      .orderBy("sort_order", "asc"),
  ]);

  const taxonomies = {};
  taxonomyRows.forEach((row) => {
    if (!taxonomies[row.taxonomy_key]) {
      taxonomies[row.taxonomy_key] = [];
    }

    taxonomies[row.taxonomy_key].push({
      id: row.id,
      value: row.value,
      label: row.label,
      sortOrder: row.sort_order,
      isActive: Boolean(row.is_active),
      updatedAt: row.updated_at,
    });
  });

  return {
    workflowPhases: phaseRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: Boolean(row.is_active),
    })),
    taxonomies,
  };
}

async function updateWorkflowPhases(phases, actorId) {
  const db = getDatabase();

  const existing = await db("workflow_phases").select("id", "code", "name", "is_active");
  const existingById = new Map(existing.map((row) => [row.id, row]));

  if (existing.length !== phases.length) {
    throw new SettingsServiceError(
      "Workflow phase set must include all existing phases",
      "SETTINGS_PHASE_SET_MISMATCH",
      400,
      [{ field: "phases", message: "Do not remove phases from configuration updates" }],
    );
  }

  phases.forEach((phase) => {
    const previous = existingById.get(phase.id);
    if (!previous) {
      throw new SettingsServiceError(
        "Unknown workflow phase id",
        "SETTINGS_PHASE_UNKNOWN",
        400,
        [{ field: "phases", message: `Unknown phase id: ${phase.id}` }],
      );
    }

    if (previous.code !== phase.code) {
      throw new SettingsServiceError(
        "Workflow phase code is immutable",
        "SETTINGS_PHASE_CODE_IMMUTABLE",
        400,
        [{ field: "phases", message: `Cannot change phase code for ${phase.id}` }],
      );
    }

    if (phase.code === "archived" && (!phase.isActive || phase.name !== previous.name)) {
      throw new SettingsServiceError(
        "Archived phase is protected",
        "SETTINGS_ARCHIVED_PHASE_PROTECTED",
        400,
        [{ field: "phases", message: "Archived phase cannot be renamed or deactivated" }],
      );
    }
  });

  const nonArchivedActive = phases.filter((phase) => phase.code !== "archived" && phase.isActive);
  if (nonArchivedActive.length === 0) {
    throw new SettingsServiceError(
      "At least one active workflow phase is required",
      "SETTINGS_PHASE_NO_ACTIVE",
      400,
      [{ field: "phases", message: "At least one non-archived phase must remain active" }],
    );
  }

  for (const phase of phases) {
    if (!phase.isActive) {
      const activePartnersInPhase = await db("partners")
        .where({ current_phase_id: phase.id })
        .whereNull("archived_at")
        .count("* as count")
        .first();

      if (Number(activePartnersInPhase.count || 0) > 0) {
        throw new SettingsServiceError(
          "Cannot deactivate a phase that has active partners",
          "SETTINGS_PHASE_IN_USE",
          400,
          [{ field: "phases", message: `Phase ${phase.code} still has active partners` }],
        );
      }
    }
  }

  await db.transaction(async (trx) => {
    for (const phase of phases) {
      await trx("workflow_phases").where({ id: phase.id }).update({
        name: phase.name,
        sort_order: phase.sortOrder,
        is_active: phase.isActive,
      });
    }

    await logSettingsAudit(trx, {
      domain: "workflow_phases",
      action: "updated",
      actorId,
      payload: {
        phases,
      },
    });
  });

  return getSettingsMasterData();
}

async function updateTaxonomy(taxonomyKey, items, actorId) {
  const key = String(taxonomyKey || "").trim().toLowerCase();
  if (!ALLOWED_TAXONOMY_KEYS.has(key)) {
    throw new SettingsServiceError(
      "Unknown taxonomy key",
      "SETTINGS_TAXONOMY_UNKNOWN",
      400,
      [{ field: "taxonomyKey", message: `Unsupported taxonomy key: ${taxonomyKey}` }],
    );
  }

  if (!items.some((item) => item.isActive)) {
    throw new SettingsServiceError(
      "At least one active taxonomy item is required",
      "SETTINGS_TAXONOMY_NO_ACTIVE",
      400,
      [{ field: "items", message: "At least one taxonomy item must remain active" }],
    );
  }

  if (key === "impact_tier") {
    const impactValues = new Set(items.map((item) => item.value));
    ["standard", "major", "lead"].forEach((required) => {
      if (!impactValues.has(required)) {
        throw new SettingsServiceError(
          "Impact tier taxonomy must include standard, major, and lead",
          "SETTINGS_IMPACT_TIER_REQUIRED",
          400,
          [{ field: "items", message: `Missing required impact tier value: ${required}` }],
        );
      }
    });
  }

  const db = getDatabase();
  const nowIso = new Date().toISOString();

  await db.transaction(async (trx) => {
    await trx("master_taxonomy_items").where({ taxonomy_key: key }).del();

    await trx("master_taxonomy_items").insert(
      items.map((item) => ({
        id: crypto.randomUUID(),
        taxonomy_key: key,
        value: item.value,
        label: item.label,
        sort_order: item.sortOrder,
        is_active: item.isActive,
        updated_by: actorId,
        created_at: nowIso,
        updated_at: nowIso,
      })),
    );

    await logSettingsAudit(trx, {
      domain: `taxonomy:${key}`,
      action: "updated",
      actorId,
      payload: {
        taxonomyKey: key,
        items,
      },
    });
  });

  return getSettingsMasterData();
}

async function listSettingsAuditLogs(limit = 30) {
  const db = getDatabase();
  const capped = Math.min(Math.max(Number(limit) || 30, 1), 200);

  const rows = await db("settings_audit_logs")
    .leftJoin("users as u", "settings_audit_logs.actor_id", "u.id")
    .select(
      "settings_audit_logs.id",
      "settings_audit_logs.domain",
      "settings_audit_logs.action",
      "settings_audit_logs.actor_id",
      "u.full_name as actor_name",
      "settings_audit_logs.payload",
      "settings_audit_logs.created_at",
    )
    .orderBy("settings_audit_logs.created_at", "desc")
    .limit(capped);

  return rows.map((row) => ({
    id: row.id,
    domain: row.domain,
    action: row.action,
    actorId: row.actor_id,
    actorName: row.actor_name || row.actor_id,
    payload: parseJson(row.payload),
    createdAt: row.created_at,
  }));
}

module.exports = {
  SettingsServiceError,
  getSettingsMasterData,
  updateWorkflowPhases,
  updateTaxonomy,
  listSettingsAuditLogs,
};
