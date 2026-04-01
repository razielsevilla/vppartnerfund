const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const { ROLE_CODES } = require("../../../shared/constants/roles");
const {
  getWorkflowConfigHandler,
  getWorkflowHealthConfigHandler,
  getWorkflowHealthMetricsHandler,
  getWorkflowKpiMetricsHandler,
  getWorkflowCoverageInsightsHandler,
  createWorkflowSnapshotHandler,
  listWorkflowSnapshotsHandler,
  replaceTransitionRulesHandler,
  updateWorkflowHealthConfigHandler,
} = require("../controllers/workflow.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/config", getWorkflowConfigHandler);
router.put("/transition-rules", requireRole([ROLE_CODES.VP_HEAD]), replaceTransitionRulesHandler);
router.get("/health/config", getWorkflowHealthConfigHandler);
router.put("/health/config", requireRole([ROLE_CODES.VP_HEAD]), updateWorkflowHealthConfigHandler);
router.get("/health/metrics", getWorkflowHealthMetricsHandler);
router.get("/kpi/metrics", getWorkflowKpiMetricsHandler);
router.get("/kpi/coverage-insights", getWorkflowCoverageInsightsHandler);
router.post("/snapshots", requireRole([ROLE_CODES.VP_HEAD]), createWorkflowSnapshotHandler);
router.get("/snapshots", listWorkflowSnapshotsHandler);

module.exports = router;