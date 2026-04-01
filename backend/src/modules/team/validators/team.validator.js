const ALLOWED_OFFICER_TYPES = ["liaison", "compliance"];
const ALLOWED_STATUS = ["active", "inactive"];

function normalize(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

function positiveIntOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validateCreateMemberPayload(payload) {
  const data = payload || {};
  const errors = [];

  const fullName = normalize(data.fullName);
  if (!fullName) {
    errors.push({ field: "fullName", message: "fullName is required" });
  }

  const officerType = normalize(data.officerType)?.toLowerCase() || null;
  if (!officerType || !ALLOWED_OFFICER_TYPES.includes(officerType)) {
    errors.push({
      field: "officerType",
      message: `officerType must be one of: ${ALLOWED_OFFICER_TYPES.join(", ")}`,
    });
  }

  const status = normalize(data.status)?.toLowerCase() || "active";
  if (!ALLOWED_STATUS.includes(status)) {
    errors.push({ field: "status", message: `status must be one of: ${ALLOWED_STATUS.join(", ")}` });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      fullName,
      officerType,
      designation: normalize(data.designation),
      email: normalize(data.email),
      phone: normalize(data.phone),
      notes: normalize(data.notes),
      status,
    },
  };
}

function validateUpdateMemberPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (Object.keys(data).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided" });
  }

  if (data.officerType !== undefined) {
    const officerType = normalize(data.officerType)?.toLowerCase() || null;
    if (!officerType || !ALLOWED_OFFICER_TYPES.includes(officerType)) {
      errors.push({
        field: "officerType",
        message: `officerType must be one of: ${ALLOWED_OFFICER_TYPES.join(", ")}`,
      });
    }
  }

  if (data.status !== undefined) {
    const status = normalize(data.status)?.toLowerCase() || null;
    if (!status || !ALLOWED_STATUS.includes(status)) {
      errors.push({ field: "status", message: `status must be one of: ${ALLOWED_STATUS.join(", ")}` });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      fullName: data.fullName !== undefined ? normalize(data.fullName) : undefined,
      officerType: data.officerType !== undefined ? normalize(data.officerType)?.toLowerCase() : undefined,
      designation: data.designation !== undefined ? normalize(data.designation) : undefined,
      email: data.email !== undefined ? normalize(data.email) : undefined,
      phone: data.phone !== undefined ? normalize(data.phone) : undefined,
      notes: data.notes !== undefined ? normalize(data.notes) : undefined,
      status: data.status !== undefined ? normalize(data.status)?.toLowerCase() : undefined,
    },
  };
}

function validateUpdateGroupPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (Object.keys(data).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided" });
  }

  const liaisonMin = data.liaisonMin !== undefined ? positiveIntOrNull(data.liaisonMin) : undefined;
  const liaisonMax = data.liaisonMax !== undefined ? positiveIntOrNull(data.liaisonMax) : undefined;
  const complianceMin = data.complianceMin !== undefined ? positiveIntOrNull(data.complianceMin) : undefined;
  const complianceMax = data.complianceMax !== undefined ? positiveIntOrNull(data.complianceMax) : undefined;

  if (data.liaisonMin !== undefined && liaisonMin === null) {
    errors.push({ field: "liaisonMin", message: "liaisonMin must be a positive integer" });
  }
  if (data.liaisonMax !== undefined && liaisonMax === null) {
    errors.push({ field: "liaisonMax", message: "liaisonMax must be a positive integer" });
  }
  if (data.complianceMin !== undefined && complianceMin === null) {
    errors.push({ field: "complianceMin", message: "complianceMin must be a positive integer" });
  }
  if (data.complianceMax !== undefined && complianceMax === null) {
    errors.push({ field: "complianceMax", message: "complianceMax must be a positive integer" });
  }

  const finalLiaisonMin = liaisonMin ?? positiveIntOrNull(data.liaisonMin ?? "") ?? null;
  const finalLiaisonMax = liaisonMax ?? positiveIntOrNull(data.liaisonMax ?? "") ?? null;
  if (finalLiaisonMin !== null && finalLiaisonMax !== null && finalLiaisonMin > finalLiaisonMax) {
    errors.push({ field: "liaisonMin", message: "liaisonMin must be less than or equal to liaisonMax" });
  }

  const finalComplianceMin = complianceMin ?? positiveIntOrNull(data.complianceMin ?? "") ?? null;
  const finalComplianceMax = complianceMax ?? positiveIntOrNull(data.complianceMax ?? "") ?? null;
  if (
    finalComplianceMin !== null &&
    finalComplianceMax !== null &&
    finalComplianceMin > finalComplianceMax
  ) {
    errors.push({
      field: "complianceMin",
      message: "complianceMin must be less than or equal to complianceMax",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      targetSector: data.targetSector !== undefined ? normalize(data.targetSector) : undefined,
      liaisonMin,
      liaisonMax,
      complianceMin,
      complianceMax,
      isActive:
        data.isActive !== undefined
          ? Boolean(data.isActive)
          : undefined,
    },
  };
}

module.exports = {
  validateCreateMemberPayload,
  validateUpdateMemberPayload,
  validateUpdateGroupPayload,
};
