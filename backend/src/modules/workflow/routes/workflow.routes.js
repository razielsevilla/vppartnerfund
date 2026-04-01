const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const {
  getWorkflowConfigHandler,
  replaceTransitionRulesHandler,
} = require("../controllers/workflow.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/config", getWorkflowConfigHandler);
router.put("/transition-rules", requireRole(["admin"]), replaceTransitionRulesHandler);

module.exports = router;