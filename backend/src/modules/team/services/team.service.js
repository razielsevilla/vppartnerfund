const { randomUUID } = require("crypto");
const { getDatabase } = require("../../../shared/services/database.service");

class TeamServiceError extends Error {
  constructor(code, message, status = 400, details = []) {
    super(message);
    this.name = "TeamServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function mapGroup(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    targetSector: row.target_sector,
    liaisonMin: row.liaison_min,
    liaisonMax: row.liaison_max,
    complianceMin: row.compliance_min,
    complianceMax: row.compliance_max,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    members: [],
  };
}

function mapMember(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    fullName: row.full_name,
    officerType: row.officer_type,
    designation: row.designation,
    email: row.email,
    phone: row.phone,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTeamStructure() {
  const db = getDatabase();
  const groupRows = await db("division_groups").select("*").orderBy("sort_order", "asc");
  const memberRows = await db("division_members").select("*").orderBy("created_at", "desc");

  const groups = groupRows.map(mapGroup);
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  for (const row of memberRows) {
    const mapped = mapMember(row);
    const group = groupMap.get(mapped.groupId);
    if (group) {
      group.members.push(mapped);
    }
  }

  return groups;
}

async function ensureGroupExists(groupId) {
  const db = getDatabase();
  const row = await db("division_groups").where({ id: groupId }).first();
  if (!row) {
    throw new TeamServiceError(
      "TEAM_GROUP_NOT_FOUND",
      "Team group does not exist",
      404,
      [{ field: "groupId", message: "No group found for this id" }],
    );
  }
  return row;
}

async function createMember(groupId, payload, actorId) {
  const db = getDatabase();
  await ensureGroupExists(groupId);

  const nowIso = new Date().toISOString();
  const insertRow = {
    id: randomUUID(),
    group_id: groupId,
    full_name: payload.fullName,
    officer_type: payload.officerType,
    designation: payload.designation,
    email: payload.email,
    phone: payload.phone,
    status: payload.status || "active",
    notes: payload.notes,
    created_by: actorId,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await db("division_members").insert(insertRow);
  return mapMember(insertRow);
}

async function updateMember(memberId, payload) {
  const db = getDatabase();
  const existing = await db("division_members").where({ id: memberId }).first();
  if (!existing) {
    throw new TeamServiceError(
      "TEAM_MEMBER_NOT_FOUND",
      "Team member does not exist",
      404,
      [{ field: "memberId", message: "No member found for this id" }],
    );
  }

  const patch = {
    updated_at: new Date().toISOString(),
  };

  if (payload.fullName !== undefined) patch.full_name = payload.fullName;
  if (payload.officerType !== undefined) patch.officer_type = payload.officerType;
  if (payload.designation !== undefined) patch.designation = payload.designation;
  if (payload.email !== undefined) patch.email = payload.email;
  if (payload.phone !== undefined) patch.phone = payload.phone;
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.notes !== undefined) patch.notes = payload.notes;

  await db("division_members").where({ id: memberId }).update(patch);
  const updated = await db("division_members").where({ id: memberId }).first();
  return mapMember(updated);
}

async function deleteMember(memberId) {
  const db = getDatabase();
  const deleted = await db("division_members").where({ id: memberId }).del();
  if (!deleted) {
    throw new TeamServiceError(
      "TEAM_MEMBER_NOT_FOUND",
      "Team member does not exist",
      404,
      [{ field: "memberId", message: "No member found for this id" }],
    );
  }
}

async function updateGroup(groupId, payload) {
  const db = getDatabase();
  await ensureGroupExists(groupId);

  const patch = {
    updated_at: new Date().toISOString(),
  };

  if (payload.targetSector !== undefined) patch.target_sector = payload.targetSector;
  if (payload.liaisonMin !== undefined) patch.liaison_min = payload.liaisonMin;
  if (payload.liaisonMax !== undefined) patch.liaison_max = payload.liaisonMax;
  if (payload.complianceMin !== undefined) patch.compliance_min = payload.complianceMin;
  if (payload.complianceMax !== undefined) patch.compliance_max = payload.complianceMax;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;

  await db("division_groups").where({ id: groupId }).update(patch);
  const updated = await db("division_groups").where({ id: groupId }).first();
  return mapGroup(updated);
}

module.exports = {
  TeamServiceError,
  listTeamStructure,
  createMember,
  updateMember,
  deleteMember,
  updateGroup,
};
