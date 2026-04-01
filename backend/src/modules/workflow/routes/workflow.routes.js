const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const {
  getWorkflowConfigHandler,
  getWorkflowHealthConfigHandler,
  getWorkflowHealthMetricsHandler,
  getWorkflowKpiMetricsHandler,
  getWorkflowCoverageInsightsHandler,
  replaceTransitionRulesHandler,
  updateWorkflowHealthConfigHandler,
} = require("../controllers/workflow.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/config", getWorkflowConfigHandler);
router.put("/transition-rules", requireRole(["admin"]), replaceTransitionRulesHandler);
router.get("/health/config", getWorkflowHealthConfigHandler);
router.put("/health/config", requireRole(["admin"]), updateWorkflowHealthConfigHandler);
router.get("/health/metrics", getWorkflowHealthMetricsHandler);
router.get("/kpi/metrics", getWorkflowKpiMetricsHandler);
router.get("/kpi/coverage-insights", getWorkflowCoverageInsightsHandler);

module.exports = router;