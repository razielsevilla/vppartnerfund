function normalizeOptionalString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

function validateCreatePartnerContactPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (!data.fullName || !String(data.fullName).trim()) {
    errors.push({ field: "fullName", message: "fullName is required" });
  }

  const email = normalizeOptionalString(data.email);
  const phone = normalizeOptionalString(data.phone);
  if (!email && !phone) {
    errors.push({ field: "email", message: "Either email or phone is required" });
  }

  if (data.isPrimary !== undefined && typeof data.isPrimary !== "boolean") {
    errors.push({ field: "isPrimary", message: "isPrimary must be a boolean" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      fullName: normalizeOptionalString(data.fullName),
      jobTitle: normalizeOptionalString(data.jobTitle),
      email,
      phone,
      linkUrl: normalizeOptionalString(data.linkUrl),
      isPrimary: Boolean(data.isPrimary),
    },
  };
}

function validateUpdatePartnerContactPayload(payload) {
  const data = payload || {};
  const errors = [];

  if (Object.keys(data).length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided" });
  }

  if (data.fullName !== undefined && !String(data.fullName).trim()) {
    errors.push({ field: "fullName", message: "fullName cannot be empty" });
  }

  if (data.email !== undefined && data.email !== null && String(data.email).trim() === "") {
    errors.push({ field: "email", message: "email cannot be empty" });
  }

  if (data.phone !== undefined && data.phone !== null && String(data.phone).trim() === "") {
    errors.push({ field: "phone", message: "phone cannot be empty" });
  }

  if (data.email === undefined && data.phone === undefined) {
    // allow partial updates as long as existing record still has contact info after merge
  }

  if (data.isPrimary !== undefined && typeof data.isPrimary !== "boolean") {
    errors.push({ field: "isPrimary", message: "isPrimary must be a boolean" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      fullName: data.fullName !== undefined ? normalizeOptionalString(data.fullName) : undefined,
      jobTitle: data.jobTitle !== undefined ? normalizeOptionalString(data.jobTitle) : undefined,
      email: data.email !== undefined ? normalizeOptionalString(data.email) : undefined,
      phone: data.phone !== undefined ? normalizeOptionalString(data.phone) : undefined,
      linkUrl: data.linkUrl !== undefined ? normalizeOptionalString(data.linkUrl) : undefined,
      isPrimary: data.isPrimary !== undefined ? Boolean(data.isPrimary) : undefined,
    },
  };
}

module.exports = {
  validateCreatePartnerContactPayload,
  validateUpdatePartnerContactPayload,
};
