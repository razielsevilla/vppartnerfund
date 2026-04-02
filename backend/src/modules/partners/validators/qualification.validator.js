const ALLOWED_DURATION = ["event_based", "project_based", "term_based"];
const ALLOWED_IMPACT = ["standard", "major", "lead", "low", "medium", "high", "transformational"];

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

function normalizeRolePackages(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const impactLevel = normalizeString(entry.impactLevel)?.toLowerCase() || null;
      const functionalRole = normalizeString(entry.functionalRole);
      const checklistItems = normalizeArray(entry.checklistItems);
      if (!impactLevel || !functionalRole) {
        return null;
      }

      return {
        impactLevel,
        functionalRole,
        checklistItems,
      };
    })
    .filter(Boolean);
}

function validateQualificationPayload(payload) {
  const data = payload || {};
  const errors = [];

  const durationCategory = normalizeString(data.durationCategory);
  const impactLevel = normalizeString(data.impactLevel);
  const functionalRole = normalizeString(data.functionalRole);
  const rolePackages = normalizeRolePackages(data.rolePackages);
  const functionalBenefits = normalizeArray(data.functionalBenefits);
  const potentialValuePropositions = normalizeArray(data.potentialValuePropositions);
  const confirmedValuePropositions = normalizeArray(data.confirmedValuePropositions);

  const effectiveRolePackages =
    rolePackages.length > 0
      ? rolePackages
      : impactLevel && functionalRole
        ? [{ impactLevel: impactLevel.toLowerCase(), functionalRole, checklistItems: [] }]
        : [];
  if (durationCategory && !ALLOWED_DURATION.includes(durationCategory)) {
    errors.push({
      field: "durationCategory",
      message: `durationCategory must be one of: ${ALLOWED_DURATION.join(", ")}`,
    });
  }

  if (impactLevel && !ALLOWED_IMPACT.includes(impactLevel.toLowerCase())) {
    errors.push({
      field: "impactLevel",
      message: `impactLevel must be one of: ${ALLOWED_IMPACT.join(", ")}`,
    });
  }

  if (data.rolePackages !== undefined && !Array.isArray(data.rolePackages)) {
    errors.push({
      field: "rolePackages",
      message: "rolePackages must be an array",
    });
  }

  if (data.functionalBenefits !== undefined && !Array.isArray(data.functionalBenefits)) {
    errors.push({
      field: "functionalBenefits",
      message: "functionalBenefits must be an array",
    });
  }

  for (const rolePackage of effectiveRolePackages) {
    if (!ALLOWED_IMPACT.includes(String(rolePackage.impactLevel).toLowerCase())) {
      errors.push({
        field: "rolePackages",
        message: `rolePackages impactLevel must be one of: ${ALLOWED_IMPACT.join(", ")}`,
      });
      break;
    }
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
      rolePackages: effectiveRolePackages,
      functionalBenefits,
      impactLevel: impactLevel ? impactLevel.toLowerCase() : null,
      functionalRole,
      potentialValuePropositions,
      confirmedValuePropositions,
    },
  };
}

module.exports = {
  validateQualificationPayload,
};