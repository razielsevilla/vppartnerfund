const DISCOVERY_NOTE_TEMPLATE_IDS = [
  "initial_discovery",
  "value_alignment",
  "partnership_readiness",
];

function normalize(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const output = String(value).trim();
  return output.length > 0 ? output : null;
}

function validateGuidedAnswers(rawAnswers) {
  const errors = [];

  if (rawAnswers === undefined) {
    return { errors, value: [] };
  }

  if (!Array.isArray(rawAnswers)) {
    return {
      errors: [{ field: "guidedAnswers", message: "guidedAnswers must be an array" }],
      value: [],
    };
  }

  const normalized = rawAnswers.map((item, index) => {
    const question = normalize(item?.question);
    const answer = normalize(item?.answer);

    if (!question) {
      errors.push({
        field: `guidedAnswers[${index}].question`,
        message: "question is required",
      });
    }

    if (!answer) {
      errors.push({
        field: `guidedAnswers[${index}].answer`,
        message: "answer is required",
      });
    }

    return {
      question,
      answer,
    };
  });

  return { errors, value: normalized };
}

function validateDiscoveryNotePayload(payload, { partial }) {
  const data = payload || {};
  const errors = [];

  if (partial && Object.keys(data).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided" });
  }

  const templateId = data.templateId === undefined ? undefined : normalize(data.templateId);
  const templateName = data.templateName === undefined ? undefined : normalize(data.templateName);
  const freeformText = data.freeformText === undefined ? undefined : normalize(data.freeformText);

  if (templateId !== undefined && templateId !== null && !DISCOVERY_NOTE_TEMPLATE_IDS.includes(templateId)) {
    errors.push({
      field: "templateId",
      message: `templateId must be one of: ${DISCOVERY_NOTE_TEMPLATE_IDS.join(", ")}`,
    });
  }

  const guidedResult = validateGuidedAnswers(data.guidedAnswers);
  errors.push(...guidedResult.errors);

  if (!partial) {
    const hasGuidedAnswers = guidedResult.value.length > 0;
    const hasFreeformText = Boolean(freeformText);

    if (!hasGuidedAnswers && !hasFreeformText) {
      errors.push({
        field: "body",
        message: "Either guidedAnswers or freeformText must be provided",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      templateId: templateId === undefined ? undefined : templateId,
      templateName: templateName === undefined ? undefined : templateName,
      guidedAnswers: data.guidedAnswers === undefined ? undefined : guidedResult.value,
      freeformText: freeformText === undefined ? undefined : freeformText,
    },
  };
}

function validateCreateDiscoveryNotePayload(payload) {
  return validateDiscoveryNotePayload(payload, { partial: false });
}

function validateUpdateDiscoveryNotePayload(payload) {
  return validateDiscoveryNotePayload(payload, { partial: true });
}

module.exports = {
  DISCOVERY_NOTE_TEMPLATE_IDS,
  validateCreateDiscoveryNotePayload,
  validateUpdateDiscoveryNotePayload,
};
