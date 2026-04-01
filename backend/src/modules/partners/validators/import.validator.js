function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function validatePartnerImportPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (!Array.isArray(data.rows) || data.rows.length === 0) {
    errors.push({ field: "rows", message: "rows must be a non-empty array" });
  }

  if (!data.mapping || typeof data.mapping !== "object") {
    errors.push({ field: "mapping", message: "mapping object is required" });
  }

  if (data.dryRun !== undefined && typeof data.dryRun !== "boolean") {
    errors.push({ field: "dryRun", message: "dryRun must be a boolean" });
  }

  if (data.mapping && typeof data.mapping === "object") {
    ["organizationName", "organizationType", "industryNiche"].forEach((requiredKey) => {
      if (!normalizeString(data.mapping[requiredKey])) {
        errors.push({
          field: `mapping.${requiredKey}`,
          message: `${requiredKey} mapping is required`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      rows: Array.isArray(data.rows) ? data.rows : [],
      dryRun: Boolean(data.dryRun),
      mapping: {
        organizationName: normalizeString(data.mapping?.organizationName),
        organizationType: normalizeString(data.mapping?.organizationType),
        industryNiche: normalizeString(data.mapping?.industryNiche),
        currentPhase: normalizeString(data.mapping?.currentPhase),
        impactTier: normalizeString(data.mapping?.impactTier),
        location: normalizeString(data.mapping?.location),
        websiteUrl: normalizeString(data.mapping?.websiteUrl),
        pastRelationship: normalizeString(data.mapping?.pastRelationship),
        lastContactDate: normalizeString(data.mapping?.lastContactDate),
        nextActionStep: normalizeString(data.mapping?.nextActionStep),
      },
    },
  };
}

module.exports = {
  validatePartnerImportPayload,
};
