const ALLOWED_IMPACT_TIERS = ["standard", "major", "lead"];

function normalizeOptionalString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

function validateCreatePartnerPayload(payload) {
  const errors = [];
  const data = payload || {};

  if (!data.organizationName || !String(data.organizationName).trim()) {
    errors.push({ field: "organizationName", message: "organizationName is required" });
  }
  if (!data.organizationType || !String(data.organizationType).trim()) {
    errors.push({ field: "organizationType", message: "organizationType is required" });
  }
  if (!data.industryNiche || !String(data.industryNiche).trim()) {
    errors.push({ field: "industryNiche", message: "industryNiche is required" });
  }
  if (!data.currentPhaseId || !String(data.currentPhaseId).trim()) {
    errors.push({ field: "currentPhaseId", message: "currentPhaseId is required" });
  }
  if (
    data.impactTier &&
    !ALLOWED_IMPACT_TIERS.includes(String(data.impactTier).trim().toLowerCase())
  ) {
    errors.push({
      field: "impactTier",
      message: `impactTier must be one of: ${ALLOWED_IMPACT_TIERS.join(", ")}`,
    });
  }
  if (data.confirmDuplicate !== undefined && typeof data.confirmDuplicate !== "boolean") {
    errors.push({ field: "confirmDuplicate", message: "confirmDuplicate must be a boolean" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      organizationName: normalizeOptionalString(data.organizationName),
      organizationType: normalizeOptionalString(data.organizationType),
      industryNiche: normalizeOptionalString(data.industryNiche),
      websiteUrl: normalizeOptionalString(data.websiteUrl),
      location: normalizeOptionalString(data.location),
      pastRelationship: normalizeOptionalString(data.pastRelationship),
      currentPhaseId: normalizeOptionalString(data.currentPhaseId),
      lastContactDate: normalizeOptionalString(data.lastContactDate),
      nextActionStep: normalizeOptionalString(data.nextActionStep),
      impactTier: normalizeOptionalString(data.impactTier)?.toLowerCase() || null,
      confirmDuplicate: Boolean(data.confirmDuplicate),
    },
  };
}

function validateUpdatePartnerPayload(payload) {
  const errors = [];
  const data = payload || {};
  const allowedFields = [
    "organizationName",
    "organizationType",
    "industryNiche",
    "websiteUrl",
    "location",
    "pastRelationship",
    "currentPhaseId",
    "lastContactDate",
    "nextActionStep",
    "impactTier",
  ];

  const keys = Object.keys(data);
  if (keys.length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided" });
  }

  keys.forEach((key) => {
    if (!allowedFields.includes(key)) {
      errors.push({ field: key, message: "Field is not allowed" });
    }
  });

  if (
    data.impactTier &&
    !ALLOWED_IMPACT_TIERS.includes(String(data.impactTier).trim().toLowerCase())
  ) {
    errors.push({
      field: "impactTier",
      message: `impactTier must be one of: ${ALLOWED_IMPACT_TIERS.join(", ")}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      organizationName:
        data.organizationName !== undefined ? normalizeOptionalString(data.organizationName) : undefined,
      organizationType:
        data.organizationType !== undefined ? normalizeOptionalString(data.organizationType) : undefined,
      industryNiche:
        data.industryNiche !== undefined ? normalizeOptionalString(data.industryNiche) : undefined,
      websiteUrl: data.websiteUrl !== undefined ? normalizeOptionalString(data.websiteUrl) : undefined,
      location: data.location !== undefined ? normalizeOptionalString(data.location) : undefined,
      pastRelationship:
        data.pastRelationship !== undefined ? normalizeOptionalString(data.pastRelationship) : undefined,
      currentPhaseId:
        data.currentPhaseId !== undefined ? normalizeOptionalString(data.currentPhaseId) : undefined,
      lastContactDate:
        data.lastContactDate !== undefined ? normalizeOptionalString(data.lastContactDate) : undefined,
      nextActionStep:
        data.nextActionStep !== undefined ? normalizeOptionalString(data.nextActionStep) : undefined,
      impactTier:
        data.impactTier !== undefined
          ? normalizeOptionalString(data.impactTier)?.toLowerCase() || null
          : undefined,
    },
  };
}

module.exports = {
  validateCreatePartnerPayload,
  validateUpdatePartnerPayload,
};