function validateRuleReplacementPayload(payload) {
  const errors = [];
  const data = payload || {};

  if (!Array.isArray(data.transitionRules)) {
    errors.push({ field: "transitionRules", message: "transitionRules must be an array" });
    return { isValid: false, errors, value: { transitionRules: [] } };
  }

  const seen = new Set();

  data.transitionRules.forEach((rule, index) => {
    if (!rule || typeof rule !== "object") {
      errors.push({ field: `transitionRules[${index}]`, message: "Each rule must be an object" });
      return;
    }

    if (!rule.fromPhaseId) {
      errors.push({ field: `transitionRules[${index}].fromPhaseId`, message: "fromPhaseId is required" });
    }
    if (!rule.toPhaseId) {
      errors.push({ field: `transitionRules[${index}].toPhaseId`, message: "toPhaseId is required" });
    }

    const key = `${rule.fromPhaseId}->${rule.toPhaseId}`;
    if (seen.has(key)) {
      errors.push({ field: `transitionRules[${index}]`, message: "Duplicate transition rule found" });
    } else {
      seen.add(key);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      transitionRules: data.transitionRules.map((rule) => ({
        fromPhaseId: String(rule.fromPhaseId),
        toPhaseId: String(rule.toPhaseId),
        requiresLastContactDate: Boolean(rule.requiresLastContactDate),
        requiresNextActionStep: Boolean(rule.requiresNextActionStep),
      })),
    },
  };
}

function validateTransitionPayload(payload) {
  const errors = [];
  const data = payload || {};

  if (!data.toPhaseId || !String(data.toPhaseId).trim()) {
    errors.push({ field: "toPhaseId", message: "toPhaseId is required" });
  }

  if (data.reason !== undefined && typeof data.reason !== "string") {
    errors.push({ field: "reason", message: "reason must be a string" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      toPhaseId: String(data.toPhaseId || "").trim(),
      reason: data.reason ? String(data.reason).trim() : null,
    },
  };
}

function validateWorkflowHealthConfigPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (
    data.overdueNextActionDays === undefined ||
    !Number.isInteger(data.overdueNextActionDays) ||
    data.overdueNextActionDays <= 0
  ) {
    errors.push({
      field: "overdueNextActionDays",
      message: "overdueNextActionDays must be a positive integer",
    });
  }

  if (!Array.isArray(data.stageThresholds)) {
    errors.push({
      field: "stageThresholds",
      message: "stageThresholds must be an array",
    });
  }

  const seen = new Set();
  (data.stageThresholds || []).forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      errors.push({
        field: `stageThresholds[${index}]`,
        message: "Each stage threshold must be an object",
      });
      return;
    }

    if (!entry.phaseId || !String(entry.phaseId).trim()) {
      errors.push({
        field: `stageThresholds[${index}].phaseId`,
        message: "phaseId is required",
      });
    }

    if (!Number.isInteger(entry.stallThresholdDays) || entry.stallThresholdDays <= 0) {
      errors.push({
        field: `stageThresholds[${index}].stallThresholdDays`,
        message: "stallThresholdDays must be a positive integer",
      });
    }

    const key = String(entry.phaseId || "").trim();
    if (key) {
      if (seen.has(key)) {
        errors.push({
          field: `stageThresholds[${index}].phaseId`,
          message: "Duplicate phaseId in stageThresholds",
        });
      } else {
        seen.add(key);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      overdueNextActionDays: Number(data.overdueNextActionDays),
      stageThresholds: (data.stageThresholds || []).map((entry) => ({
        phaseId: String(entry.phaseId),
        stallThresholdDays: Number(entry.stallThresholdDays),
      })),
    },
  };
}

module.exports = {
  validateRuleReplacementPayload,
  validateTransitionPayload,
  validateWorkflowHealthConfigPayload,
};