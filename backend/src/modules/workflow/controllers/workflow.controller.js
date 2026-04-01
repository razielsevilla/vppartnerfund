const { PartnerServiceError } = require("../../partners/services/partners.service");
const {
  getWorkflowConfig,
  replaceTransitionRules,
  transitionPartnerPhase,
  getWorkflowHealthConfig,
  updateWorkflowHealthConfig,
  getWorkflowHealthMetrics,
  getWorkflowKpiMetrics,
  getWorkflowCoverageInsights,
} = require("../services/workflow-engine.service");
const {
  validateRuleReplacementPayload,
  validateTransitionPayload,
  validateWorkflowHealthConfigPayload,
} = require("../validators/workflow.validator");

function validationError(res, details) {
  return res.status(400).json({
    error: {
      code: "WORKFLOW_VALIDATION_FAILED",
      message: "Workflow request payload validation failed",
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
      code: "WORKFLOW_INTERNAL_ERROR",
      message: "Unexpected error while processing workflow request",
      details: [],
    },
  });
}

async function getWorkflowConfigHandler(_req, res) {
  try {
    const config = await getWorkflowConfig();
    return res.status(200).json(config);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function replaceTransitionRulesHandler(req, res) {
  const validation = validateRuleReplacementPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const config = await replaceTransitionRules(validation.value.transitionRules);
    return res.status(200).json(config);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function transitionPartnerPhaseHandler(req, res) {
  const validation = validateTransitionPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const partner = await transitionPartnerPhase(
      req.params.partnerId,
      validation.value.toPhaseId,
      req.user.id,
      validation.value.reason,
    );
    return res.status(200).json({ partner });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getWorkflowHealthConfigHandler(_req, res) {
  try {
    const config = await getWorkflowHealthConfig();
    return res.status(200).json(config);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updateWorkflowHealthConfigHandler(req, res) {
  const validation = validateWorkflowHealthConfigPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const config = await updateWorkflowHealthConfig(validation.value);
    return res.status(200).json(config);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getWorkflowHealthMetricsHandler(_req, res) {
  try {
    const metrics = await getWorkflowHealthMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getWorkflowKpiMetricsHandler(_req, res) {
  try {
    const metrics = await getWorkflowKpiMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    return serviceError(res, error);
  }
}

async function getWorkflowCoverageInsightsHandler(_req, res) {
  try {
    const insights = await getWorkflowCoverageInsights();
    return res.status(200).json(insights);
  } catch (error) {
    return serviceError(res, error);
  }
}

module.exports = {
  getWorkflowConfigHandler,
  replaceTransitionRulesHandler,
  transitionPartnerPhaseHandler,
  getWorkflowHealthConfigHandler,
  updateWorkflowHealthConfigHandler,
  getWorkflowHealthMetricsHandler,
  getWorkflowKpiMetricsHandler,
  getWorkflowCoverageInsightsHandler,
};