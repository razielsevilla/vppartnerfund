const ALLOWED_DURATION = ["short_term", "mid_term", "long_term"];
const ALLOWED_IMPACT = ["low", "medium", "high", "transformational"];

function normalizeString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

function normalizeArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
}

function validateQualificationPayload(payload) {
  const data = payload || {};
  const errors = [];

  const durationCategory = normalizeString(data.durationCategory);
  const impactLevel = normalizeString(data.impactLevel);
  const functionalRole = normalizeString(data.functionalRole);
  const potentialValuePropositions = normalizeArray(data.potentialValuePropositions);
  const confirmedValuePropositions = normalizeArray(data.confirmedValuePropositions);

  if (durationCategory && !ALLOWED_DURATION.includes(durationCategory)) {
    errors.push({
      field: "durationCategory",
      message: `durationCategory must be one of: ${ALLOWED_DURATION.join(", ")}`,
    });
  }

  if (impactLevel && !ALLOWED_IMPACT.includes(impactLevel)) {
    errors.push({
      field: "impactLevel",
      message: `impactLevel must be one of: ${ALLOWED_IMPACT.join(", ")}`,
    });
  }

  if (data.potentialValuePropositions !== undefined && !Array.isArray(data.potentialValuePropositions)) {
    errors.push({
      field: "potentialValuePropositions",
      message: "potentialValuePropositions must be an array",
    });
  }

  if (data.confirmedValuePropositions !== undefined && !Array.isArray(data.confirmedValuePropositions)) {
    errors.push({
      field: "confirmedValuePropositions",
      message: "confirmedValuePropositions must be an array",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      durationCategory,
      impactLevel,
      functionalRole,
      potentialValuePropositions,
      confirmedValuePropositions,
    },
  };
}

module.exports = {
  validateQualificationPayload,
};