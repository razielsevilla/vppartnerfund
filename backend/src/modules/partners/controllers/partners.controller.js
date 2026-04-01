const {
  PartnerServiceError,
  createPartner,
  listPartners,
  getPartnerById,
  updatePartner,
  archivePartner,
} = require("../services/partners.service");
const {
  validateCreatePartnerPayload,
  validateUpdatePartnerPayload,
} = require("../validators/partner.validator");

function validationError(res, details) {
  return res.status(400).json({
    error: {
      code: "PARTNER_VALIDATION_FAILED",
      message: "Request payload validation failed",
      details,
    },
  });
}

function serviceError(res, error) {
  if (error instanceof PartnerServiceError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "PARTNER_INTERNAL_ERROR",
      message: "Unexpected error while processing partner request",
      details: [],
    },
  });
}

async function createPartnerHandler(req, res) {
  const validation = validateCreatePartnerPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const partner = await createPartner(validation.value, req.user.id);
    return res.status(201).json({ partner });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function listPartnersHandler(req, res) {
  try {
    const partners = await listPartners({
      search: req.query.search,
      organizationType: req.query.organizationType,
      industryNiche: req.query.industryNiche,
      impactTier: req.query.impactTier,
      status: req.query.status,
    });
    return res.status(200).json({ partners });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getPartnerHandler(req, res) {
  try {
    const partner = await getPartnerById(req.params.partnerId);
    if (!partner) {
      return res.status(404).json({
        error: {
          code: "PARTNER_NOT_FOUND",
          message: "Partner was not found",
          details: [{ field: "partnerId", message: "No partner exists with this id" }],
        },
      });
    }
    return res.status(200).json({ partner });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updatePartnerHandler(req, res) {
  const validation = validateUpdatePartnerPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const partner = await updatePartner(req.params.partnerId, validation.value);
    if (!partner) {
      return res.status(404).json({
        error: {
          code: "PARTNER_NOT_FOUND",
          message: "Partner was not found",
          details: [{ field: "partnerId", message: "No partner exists with this id" }],
        },
      });
    }
    return res.status(200).json({ partner });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function archivePartnerHandler(req, res) {
  try {
    const partner = await archivePartner(req.params.partnerId);
    if (!partner) {
      return res.status(404).json({
        error: {
          code: "PARTNER_NOT_FOUND",
          message: "Partner was not found",
          details: [{ field: "partnerId", message: "No partner exists with this id" }],
        },
      });
    }

    return res.status(200).json({ partner });
  } catch (error) {
    return serviceError(res, error);
  }
}

module.exports = {
  createPartnerHandler,
  listPartnersHandler,
  getPartnerHandler,
  updatePartnerHandler,
  archivePartnerHandler,
};