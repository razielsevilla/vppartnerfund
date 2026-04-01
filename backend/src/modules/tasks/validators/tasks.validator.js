const ALLOWED_PRIORITIES = ["low", "medium", "high", "critical"];
const ALLOWED_STATUSES = ["open", "in_progress", "blocked", "done"];

function normalize(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

function validateCreateTaskPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (!normalize(data.title)) errors.push({ field: "title", message: "title is required" });
  if (!normalize(data.ownerId)) errors.push({ field: "ownerId", message: "ownerId is required" });
  if (!normalize(data.partnerId)) errors.push({ field: "partnerId", message: "partnerId is required" });
  if (!normalize(data.workflowPhaseId)) {
    errors.push({ field: "workflowPhaseId", message: "workflowPhaseId is required" });
  }
  if (!normalize(data.dueDate)) errors.push({ field: "dueDate", message: "dueDate is required" });

  const priority = normalize(data.priority)?.toLowerCase() || null;
  if (!priority || !ALLOWED_PRIORITIES.includes(priority)) {
    errors.push({
      field: "priority",
      message: `priority must be one of: ${ALLOWED_PRIORITIES.join(", ")}`,
    });
  }

  const status = normalize(data.status)?.toLowerCase() || null;
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    errors.push({ field: "status", message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title: normalize(data.title),
      description: normalize(data.description),
      ownerId: normalize(data.ownerId),
      partnerId: normalize(data.partnerId),
      workflowPhaseId: normalize(data.workflowPhaseId),
      dueDate: normalize(data.dueDate),
      priority,
      status,
    },
  };
}

function validateUpdateTaskPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (Object.keys(data).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided" });
  }

  if (data.priority !== undefined) {
    const priority = normalize(data.priority)?.toLowerCase() || null;
    if (!priority || !ALLOWED_PRIORITIES.includes(priority)) {
      errors.push({
        field: "priority",
        message: `priority must be one of: ${ALLOWED_PRIORITIES.join(", ")}`,
      });
    }
  }

  if (data.status !== undefined) {
    const status = normalize(data.status)?.toLowerCase() || null;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      errors.push({ field: "status", message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title: data.title !== undefined ? normalize(data.title) : undefined,
      description: data.description !== undefined ? normalize(data.description) : undefined,
      ownerId: data.ownerId !== undefined ? normalize(data.ownerId) : undefined,
      partnerId: data.partnerId !== undefined ? normalize(data.partnerId) : undefined,
      workflowPhaseId: data.workflowPhaseId !== undefined ? normalize(data.workflowPhaseId) : undefined,
      dueDate: data.dueDate !== undefined ? normalize(data.dueDate) : undefined,
      priority: data.priority !== undefined ? normalize(data.priority)?.toLowerCase() || null : undefined,
      status: data.status !== undefined ? normalize(data.status)?.toLowerCase() || null : undefined,
    },
  };
}

module.exports = {
  validateCreateTaskPayload,
  validateUpdateTaskPayload,
};