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

module.exports = {
  validateCreatePartnerContactPayload,
};
