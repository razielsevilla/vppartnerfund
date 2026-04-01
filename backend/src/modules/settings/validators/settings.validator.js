function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function validateWorkflowPhasePayload(payload) {
  const data = payload || {};
  const errors = [];

  if (!Array.isArray(data.phases) || data.phases.length === 0) {
    errors.push({ field: "phases", message: "phases must be a non-empty array" });
  }

  const seenIds = new Set();
  const seenCodes = new Set();
  (data.phases || []).forEach((phase, index) => {
    const id = normalizeString(phase?.id);
    const code = normalizeString(phase?.code).toLowerCase();
    const name = normalizeString(phase?.name);

    if (!id) {
      errors.push({ field: `phases[${index}].id`, message: "id is required" });
    }
    if (!code) {
      errors.push({ field: `phases[${index}].code`, message: "code is required" });
    }
    if (!name) {
      errors.push({ field: `phases[${index}].name`, message: "name is required" });
    }
    if (!Number.isInteger(phase?.sortOrder) || phase.sortOrder <= 0) {
      errors.push({ field: `phases[${index}].sortOrder`, message: "sortOrder must be a positive integer" });
    }
    if (phase?.isActive !== undefined && typeof phase.isActive !== "boolean") {
      errors.push({ field: `phases[${index}].isActive`, message: "isActive must be a boolean" });
    }

    if (id) {
      if (seenIds.has(id)) {
        errors.push({ field: `phases[${index}].id`, message: "Duplicate phase id" });
      }
      seenIds.add(id);
    }

    if (code) {
      if (seenCodes.has(code)) {
        errors.push({ field: `phases[${index}].code`, message: "Duplicate phase code" });
      }
      seenCodes.add(code);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      phases: (data.phases || []).map((phase) => ({
        id: normalizeString(phase.id),
        code: normalizeString(phase.code).toLowerCase(),
        name: normalizeString(phase.name),
        sortOrder: Number(phase.sortOrder),
        isActive: phase.isActive !== undefined ? Boolean(phase.isActive) : true,
      })),
    },
  };
}

function validateTaxonomyPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push({ field: "items", message: "items must be a non-empty array" });
  }

  const seenValues = new Set();
  (data.items || []).forEach((item, index) => {
    const value = normalizeString(item?.value).toLowerCase();
    const label = normalizeString(item?.label);

    if (!value) {
      errors.push({ field: `items[${index}].value`, message: "value is required" });
    }
    if (!label) {
      errors.push({ field: `items[${index}].label`, message: "label is required" });
    }
    if (!Number.isInteger(item?.sortOrder) || item.sortOrder <= 0) {
      errors.push({ field: `items[${index}].sortOrder`, message: "sortOrder must be a positive integer" });
    }
    if (item?.isActive !== undefined && typeof item.isActive !== "boolean") {
      errors.push({ field: `items[${index}].isActive`, message: "isActive must be a boolean" });
    }

    if (value) {
      if (seenValues.has(value)) {
        errors.push({ field: `items[${index}].value`, message: "Duplicate item value" });
      }
      seenValues.add(value);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      items: (data.items || []).map((item) => ({
        value: normalizeString(item.value).toLowerCase(),
        label: normalizeString(item.label),
        sortOrder: Number(item.sortOrder),
        isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
      })),
    },
  };
}

module.exports = {
  validateWorkflowPhasePayload,
  validateTaxonomyPayload,
};
