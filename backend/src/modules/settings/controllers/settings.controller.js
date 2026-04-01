const {
  SettingsServiceError,
  getSettingsMasterData,
  updateWorkflowPhases,
  updateTaxonomy,
  listSettingsAuditLogs,
} = require("../services/settings.service");
const {
  validateWorkflowPhasePayload,
  validateTaxonomyPayload,
} = require("../validators/settings.validator");

function validationError(res, details) {
  return res.status(400).json({
    error: {
      code: "SETTINGS_VALIDATION_FAILED",
      message: "Settings request payload validation failed",
      details,
    },
  });
}

function serviceError(res, error) {
  if (error instanceof SettingsServiceError) {
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
      code: "SETTINGS_INTERNAL_ERROR",
      message: "Unexpected settings error",
      details: [],
    },
  });
}

async function getMasterDataHandler(_req, res) {
  try {
    const data = await getSettingsMasterData();
    return res.status(200).json(data);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updateWorkflowPhasesHandler(req, res) {
  const validation = validateWorkflowPhasePayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const data = await updateWorkflowPhases(validation.value.phases, req.user.id);
    return res.status(200).json(data);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updateTaxonomyHandler(req, res) {
  const validation = validateTaxonomyPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const data = await updateTaxonomy(req.params.taxonomyKey, validation.value.items, req.user.id);
    return res.status(200).json(data);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function listAuditLogsHandler(req, res) {
  try {
    const entries = await listSettingsAuditLogs(req.query.limit);
    return res.status(200).json({ entries });
  } catch (error) {
    return serviceError(res, error);
  }
}

module.exports = {
  getMasterDataHandler,
  updateWorkflowPhasesHandler,
  updateTaxonomyHandler,
  listAuditLogsHandler,
};
